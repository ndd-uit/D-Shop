import test from "node:test";
import assert from "node:assert/strict";
import {
    assertNoClientEvidenceReferences,
    resolveRentalEvidence,
    uploadRentalEvidence,
} from "../src/modules/rental/rentalEvidence.storage.js";
import { getRentalOrderDetail, getFeeApprovalRequests } from "../src/modules/rental/rental.service.js";

const orderId = "00000000-0000-4000-8000-000000000001";
const otherOrderId = "00000000-0000-4000-8000-000000000002";
const objectPath = `${orderId}/00000000-0000-4000-8000-000000000003.jpg`;
const reference = `evidence://${objectPath}`;
const file = { mimetype: "image/jpeg", buffer: Buffer.from([0xff, 0xd8, 0xff]) };

const fakeStorage = ({ publicBucket = false, failUpload = 0, failSign = false } = {}) => {
    const uploads = [];
    const removals = [];
    const signs = [];
    const client = {
        storage: {
            getBucket: async () => ({ data: { public: publicBucket }, error: null }),
            from(bucket) {
                assert.equal(bucket, "private-evidence");
                return {
                    async upload(path, buffer, options) {
                        uploads.push({ path, buffer, options });
                        return { error: uploads.length === failUpload ? new Error("secret") : null };
                    },
                    async remove(paths) { removals.push(...paths); return { error: null }; },
                    async createSignedUrl(path, ttl) {
                        signs.push({ path, ttl });
                        return failSign ? { error: new Error("secret") } : { data: { signedUrl: `https://storage.example/signed/${path}` } };
                    },
                    getPublicUrl() { throw new Error("Public URL must never be used for new evidence"); },
                };
            },
        },
    };
    return { client, uploads, removals, signs, options: { storageClient: client, bucket: "private-evidence" } };
};

test("new evidence uploads to an order-scoped private path and stores no signed/public URL", async () => {
    const storage = fakeStorage();
    const images = await uploadRentalEvidence([file], orderId, storage.options);
    assert.equal(images.length, 1);
    assert.ok(images[0].objectPath.startsWith(`${orderId}/`));
    assert.equal(images[0].reference, `evidence://${images[0].objectPath}`);
    assert.equal(storage.signs.length, 0);
    assert.equal(storage.uploads[0].options.upsert, false);
    assert.equal(storage.uploads[0].options.cacheControl, "0");
});

test("public or unavailable buckets fail closed before uploading", async () => {
    const storage = fakeStorage({ publicBucket: true });
    await assert.rejects(uploadRentalEvidence([file], orderId, storage.options), /EVIDENCE_BUCKET_MUST_BE_PRIVATE/);
    assert.equal(storage.uploads.length, 0);
    storage.client.storage.getBucket = async () => ({ error: new Error("missing") });
    await assert.rejects(uploadRentalEvidence([file], orderId, storage.options), /EVIDENCE_BUCKET_UNAVAILABLE/);
    assert.equal(storage.uploads.length, 0);
});

test("validates all image signatures before upload and cleans up partial uploads", async () => {
    const storage = fakeStorage({ failUpload: 2 });
    await assert.rejects(uploadRentalEvidence([file, { ...file, buffer: Buffer.from("fake") }], orderId, storage.options), /INVALID_GARMENT_IMAGE_CONTENT/);
    assert.equal(storage.uploads.length, 0);
    await assert.rejects(uploadRentalEvidence([file, file], orderId, storage.options), /EVIDENCE_IMAGE_UPLOAD_FAILED/);
    assert.deepEqual(storage.removals, [storage.uploads[0].path]);
});

test("request body cannot introduce arbitrary URLs or another order's storage reference", () => {
    for (const value of [reference, [reference], JSON.stringify([reference]), "https://public.example/a.jpg"]) {
        assert.throws(() => assertNoClientEvidenceReferences(value), /EVIDENCE_FILES_REQUIRED/);
    }
    for (const value of [undefined, null, "", "[]", []]) assert.doesNotThrow(() => assertNoClientEvidenceReferences(value));
});

test("signs persisted evidence for five minutes without modifying stored data or product images", async () => {
    const storage = fakeStorage();
    const createdAt = new Date();
    const data = {
        orderId, createdAt,
        items: [{
            garment: { imageUrls: ["https://public.example/product.jpg"] },
            inspectionResult: { evidenceUrls: JSON.stringify([reference]) },
            reservations: [{ preparationImages: JSON.stringify([reference]) }],
        }],
    };
    const result = await resolveRentalEvidence(data, orderId, storage.options);
    assert.equal(result.createdAt, createdAt);
    assert.equal(data.items[0].inspectionResult.evidenceUrls, JSON.stringify([reference]));
    assert.deepEqual(result.items[0].garment.imageUrls, data.items[0].garment.imageUrls);
    assert.match(result.items[0].inspectionResult.evidenceUrls, /https:\/\/storage.example\/signed/);
    assert.deepEqual(storage.signs, [{ path: objectPath, ttl: 300 }]);
});

test("rejects cross-order paths, traversal and public bucket signing", async () => {
    const storage = fakeStorage();
    for (const value of [reference.replace(orderId, otherOrderId), `evidence://${orderId}/../secret.jpg`]) {
        await assert.rejects(resolveRentalEvidence({ evidenceUrls: [value] }, orderId, storage.options), /INVALID_EVIDENCE_REFERENCE/);
    }
    assert.equal(storage.signs.length, 0);
    await assert.rejects(resolveRentalEvidence({ evidenceUrls: [reference] }, orderId, fakeStorage({ publicBucket: true }).options), /EVIDENCE_BUCKET_MUST_BE_PRIVATE/);
    await assert.rejects(resolveRentalEvidence({ evidenceUrls: [reference] }, orderId, fakeStorage({ failSign: true }).options), /EVIDENCE_SIGNING_FAILED/);
});

test("legacy HTTPS evidence stays readable without silently moving or deleting objects", async () => {
    const data = { evidenceUrls: JSON.stringify(["https://old.example/evidence.jpg"]) };
    const result = await resolveRentalEvidence(data, orderId, { storageClient: {} });
    assert.deepEqual(result, data);
    assert.deepEqual(await resolveRentalEvidence({ evidenceUrls: ["javascript:alert(1)"] }, orderId), { evidenceUrls: [] });
});

test("order ownership and roles are checked before signing evidence", async () => {
    const order = { orderId, customerId: "owner" };
    let signedCount = 0;
    const options = {
        db: { rentalOrder: { findUnique: async () => order } },
        resolveEvidence: async (value, id) => { signedCount += 1; assert.equal(id, orderId); return value; },
    };
    for (const actor of [
        { role: "CUSTOMER", userId: "other" },
        { role: "UNKNOWN", userId: "owner" },
    ]) {
        await assert.rejects(getRentalOrderDetail({ orderId, ...actor }, options), /RENTAL_ORDER_FORBIDDEN/);
    }
    assert.equal(signedCount, 0);
    for (const role of ["CUSTOMER", "RENTAL_STAFF", "STORE_MANAGER"]) {
        await getRentalOrderDetail({ orderId, userId: "owner", role }, options);
    }
    assert.equal(signedCount, 3);
    options.db.rentalOrder.findUnique = async () => null;
    await assert.rejects(getRentalOrderDetail({ orderId, userId: "owner", role: "CUSTOMER" }, options), /RENTAL_ORDER_NOT_FOUND/);
    assert.equal(signedCount, 3);
});

test("manager fee approval evidence is resolved under each request's order scope", async () => {
    const requests = [orderId, otherOrderId].map((id) => ({ rentalOrder: { orderId: id } }));
    const scopes = [];
    const result = await getFeeApprovalRequests(null, {
        db: { feeApprovalRequest: { findMany: async () => requests } },
        resolveEvidence: async (order, id) => { scopes.push(id); return { ...order, resolved: true }; },
    });
    assert.deepEqual(scopes, [orderId, otherOrderId]);
    assert.ok(result.every((request) => request.rentalOrder.resolved));
    assert.ok(requests.every((request) => !request.rentalOrder.resolved));
});
