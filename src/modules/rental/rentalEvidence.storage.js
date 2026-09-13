import { randomUUID } from "node:crypto";
import { getSupabaseStorageClient } from "../../config/supabaseStorage.js";
import { validateGarmentImageFile } from "../garment/garmentImage.storage.js";

const EVIDENCE_PREFIX = "evidence://";
const SIGNED_URL_TTL_SECONDS = 300;
const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const ORDER_ID_PATTERN = new RegExp(`^${UUID}$`, "i");
const PATH_PATTERN = new RegExp(`^(${UUID})/${UUID}\\.(jpg|png|webp)$`, "i");

const getEvidenceBucket = () =>
    process.env.SUPABASE_EVIDENCE_BUCKET?.trim() || "rental-evidence";

const requirePrivateBucket = async (storageClient, bucket) => {
    let response;
    try {
        response = await storageClient.storage.getBucket(bucket);
    } catch {
        throw new Error("EVIDENCE_BUCKET_UNAVAILABLE");
    }
    const { data, error } = response;
    if (error || !data) throw new Error("EVIDENCE_BUCKET_UNAVAILABLE");
    if (data.public !== false) throw new Error("EVIDENCE_BUCKET_MUST_BE_PRIVATE");
};

// Only multipart uploads can introduce new evidence. Never sign client-supplied
// paths or accept public URLs as a way to bypass private storage.
const assertNoClientEvidenceReferences = (value) => {
    if (value == null || value === "" || value === "[]") return;
    if (Array.isArray(value) && value.length === 0) return;
    throw new Error("EVIDENCE_FILES_REQUIRED");
};

const removeEvidenceUploads = async (uploaded, options = {}) => {
    if (!uploaded.length) return;
    const client = options.storageClient ?? getSupabaseStorageClient();
    const bucket = options.bucket ?? getEvidenceBucket();
    try {
        const { error } = await client.storage.from(bucket)
            .remove(uploaded.map((image) => image.objectPath));
        if (error) throw error;
    } catch {
        console.error("Evidence upload cleanup failed");
    }
};

const uploadRentalEvidence = async (files = [], orderId, options = {}) => {
    if (!files.length) return [];
    if (!ORDER_ID_PATTERN.test(orderId)) throw new Error("INVALID_EVIDENCE_ORDER");
    const types = files.map(validateGarmentImageFile);
    const client = options.storageClient ?? getSupabaseStorageClient();
    const bucket = options.bucket ?? getEvidenceBucket();
    await requirePrivateBucket(client, bucket);
    const uploaded = [];
    try {
        for (const [index, file] of files.entries()) {
            const objectPath = `${orderId.toLowerCase()}/${randomUUID()}.${types[index].extension}`;
            const { error } = await client.storage.from(bucket).upload(objectPath, file.buffer, {
                contentType: file.mimetype,
                cacheControl: "0",
                upsert: false,
            });
            if (error) throw error;
            uploaded.push({ objectPath, reference: `${EVIDENCE_PREFIX}${objectPath}` });
        }
        return uploaded;
    } catch {
        await removeEvidenceUploads(uploaded, { storageClient: client, bucket });
        throw new Error("EVIDENCE_IMAGE_UPLOAD_FAILED");
    }
};

// Call only AFTER authorizing access to this order. Persist references, not
// expiring URLs. Only the two evidence fields are transformed; Decimal/Date and
// public product images remain untouched.
const resolveRentalEvidence = async (data, orderId, options = {}) => {
    let client;
    let bucket;
    const signed = new Map();
    const resolveReference = async (reference) => {
        if (typeof reference !== "string") return null;
        if (!reference.startsWith(EVIDENCE_PREFIX)) {
            // Read compatibility only. Existing public objects require a separate
            // audited migration; this change does not move/delete those objects.
            return /^https:\/\//i.test(reference) ? reference : null;
        }
        const path = reference.slice(EVIDENCE_PREFIX.length);
        const match = path.match(PATH_PATTERN);
        if (!match || match[1].toLowerCase() !== orderId?.toLowerCase()) {
            throw new Error("INVALID_EVIDENCE_REFERENCE");
        }
        if (signed.has(path)) return signed.get(path);
        if (!client) {
            client = options.storageClient ?? getSupabaseStorageClient();
            bucket = options.bucket ?? getEvidenceBucket();
            await requirePrivateBucket(client, bucket);
        }
        let response;
        try {
            response = await client.storage.from(bucket).createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
        } catch {
            throw new Error("EVIDENCE_SIGNING_FAILED");
        }
        const { data: link, error } = response;
        if (error || !link?.signedUrl) throw new Error("EVIDENCE_SIGNING_FAILED");
        signed.set(path, link.signedUrl);
        return link.signedUrl;
    };
    const resolveField = async (value) => {
        if (!value) return value;
        let references = value;
        if (typeof value === "string") {
            try { references = JSON.parse(value); } catch { references = [value]; }
        }
        if (!Array.isArray(references)) references = [references];
        const urls = [];
        for (const reference of references) {
            const url = await resolveReference(reference);
            if (url) urls.push(url);
        }
        return typeof value === "string" ? JSON.stringify(urls) : urls;
    };
    const visit = async (value) => {
        if (Array.isArray(value)) {
            const result = [];
            for (const item of value) result.push(await visit(item));
            return result;
        }
        if (!value || Object.getPrototypeOf(value) !== Object.prototype) return value;
        const result = {};
        for (const [key, field] of Object.entries(value)) {
            result[key] = key === "preparationImages" || key === "evidenceUrls"
                ? await resolveField(field)
                : await visit(field);
        }
        return result;
    };
    return visit(data);
};

export {
    assertNoClientEvidenceReferences,
    getEvidenceBucket,
    removeEvidenceUploads,
    resolveRentalEvidence,
    uploadRentalEvidence,
};
