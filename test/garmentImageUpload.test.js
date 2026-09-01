import assert from "node:assert/strict";
import test from "node:test";
import express from "express";

import authorizeRole from "../src/middlewares/authorizeRole.js";
import {
    uploadGarmentImages,
} from "../src/middlewares/garmentImageUpload.js";
import {
    buildGarmentBodyWithUploadedImages,
    uploadGarmentImagesToStorage,
} from "../src/modules/garment/garmentImage.storage.js";

const imageBuffers = {
    "image/jpeg": Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x00,
    ]),
    "image/png": Buffer.from([
        0x89, 0x50, 0x4e, 0x47,
        0x0d, 0x0a, 0x1a, 0x0a,
    ]),
    "image/webp": Buffer.from(
        "RIFF0000WEBP",
        "ascii"
    ),
};

const withUploadServer = async (callback) => {
    const app = express();

    app.post(
        "/upload",
        uploadGarmentImages,
        (req, res) => res.json({
            files: req.files.map((file) => ({
                mimetype: file.mimetype,
                size: file.size,
            })),
        })
    );
    app.use((error, req, res, next) => {
        res.status(500).json({
            message: error.message,
        });
    });

    const server = await new Promise((resolve) => {
        const listening = app.listen(
            0,
            "127.0.0.1",
            () => resolve(listening)
        );
    });

    try {
        const address = server.address();
        await callback(
            `http://127.0.0.1:${address.port}`
        );
    } finally {
        await new Promise((resolve, reject) =>
            server.close((error) =>
                error ? reject(error) : resolve()
            )
        );
    }
};

for (const [mimetype, buffer] of Object.entries(
    imageBuffers
)) {
    test(`multipart accepts ${mimetype}`, async () => {
        await withUploadServer(async (baseUrl) => {
            const formData = new FormData();
            formData.append(
                "images",
                new Blob([buffer], { type: mimetype }),
                `garment.${mimetype.split("/")[1]}`
            );

            const response = await fetch(
                `${baseUrl}/upload`,
                {
                    method: "POST",
                    body: formData,
                }
            );
            const body = await response.json();

            assert.equal(response.status, 200);
            assert.equal(
                body.files[0].mimetype,
                mimetype
            );
        });
    });
}

test("multipart rejects a non-image file", async () => {
    await withUploadServer(async (baseUrl) => {
        const formData = new FormData();
        formData.append(
            "images",
            new Blob(["not an image"], {
                type: "text/plain",
            }),
            "garment.txt"
        );

        const response = await fetch(
            `${baseUrl}/upload`,
            { method: "POST", body: formData }
        );

        assert.equal(response.status, 400);
    });
});

test("multipart rejects a file larger than 5MB", async () => {
    await withUploadServer(async (baseUrl) => {
        const oversized = Buffer.alloc(
            5 * 1024 * 1024 + 1,
            0
        );
        imageBuffers["image/jpeg"].copy(oversized);
        const formData = new FormData();
        formData.append(
            "images",
            new Blob([oversized], {
                type: "image/jpeg",
            }),
            "large.jpg"
        );

        const response = await fetch(
            `${baseUrl}/upload`,
            { method: "POST", body: formData }
        );

        assert.equal(response.status, 413);
    });
});

const createFakeStorageClient = () => {
    const uploadedPaths = [];
    const removedPaths = [];
    const bucketClient = {
        upload: async (path) => {
            uploadedPaths.push(path);
            return { data: { path }, error: null };
        },
        getPublicUrl: (path) => ({
            data: {
                publicUrl:
                    `https://project.supabase.co/storage/v1/object/public/garments/${path}`,
            },
        }),
        remove: async (paths) => {
            removedPaths.push(...paths);
            return { data: paths, error: null };
        },
    };

    return {
        uploadedPaths,
        removedPaths,
        storage: {
            from: () => bucketClient,
        },
    };
};

test("uploads jpg, png and webp with unique generated names", async () => {
    const storageClient = createFakeStorageClient();
    const files = Object.entries(imageBuffers).map(
        ([mimetype, buffer]) => ({ mimetype, buffer })
    );

    const uploaded =
        await uploadGarmentImagesToStorage(files, {
            storageClient,
            bucket: "garments",
        });

    assert.equal(uploaded.length, 3);
    assert.equal(
        new Set(uploaded.map((item) => item.objectPath))
            .size,
        3
    );
    assert.match(uploaded[0].objectPath, /\.jpg$/);
    assert.match(uploaded[1].objectPath, /\.png$/);
    assert.match(uploaded[2].objectPath, /\.webp$/);
    assert.ok(
        uploaded.every((item) =>
            item.publicUrl.startsWith(
                "https://project.supabase.co/"
            )
        )
    );
});

test("rejects spoofed image MIME when the binary signature is invalid", async () => {
    const storageClient = createFakeStorageClient();

    await assert.rejects(
        () => uploadGarmentImagesToStorage(
            [{
                mimetype: "image/jpeg",
                buffer: Buffer.from("not a jpeg"),
            }],
            { storageClient, bucket: "garments" }
        ),
        /INVALID_GARMENT_IMAGE_CONTENT/
    );
    assert.equal(storageClient.uploadedPaths.length, 0);
});

test("create body stores uploaded public image URLs", () => {
    const body = buildGarmentBodyWithUploadedImages(
        { name: "Váy Satin" },
        [{
            objectPath: "unique.jpg",
            publicUrl:
                "https://project.supabase.co/public/garments/unique.jpg",
        }]
    );

    assert.deepEqual(body.imageUrls, [
        "https://project.supabase.co/public/garments/unique.jpg",
    ]);
});

test("update without new images does not overwrite imageUrls", () => {
    const body = buildGarmentBodyWithUploadedImages(
        { name: "Tên mới" },
        []
    );

    assert.equal(
        Object.hasOwn(body, "imageUrls"),
        false
    );
});

test("update with new images uses the new public URLs", () => {
    const body = buildGarmentBodyWithUploadedImages(
        { name: "Tên mới" },
        [{
            objectPath: "new.webp",
            publicUrl:
                "https://project.supabase.co/public/garments/new.webp",
        }]
    );

    assert.deepEqual(body.imageUrls, [
        "https://project.supabase.co/public/garments/new.webp",
    ]);
});

test("non-manager role is rejected before upload", () => {
    const middleware = authorizeRole("STORE_MANAGER");
    let statusCode;
    let responseBody;
    let nextCalled = false;
    const res = {
        status(code) {
            statusCode = code;
            return this;
        },
        json(body) {
            responseBody = body;
            return this;
        },
    };

    middleware(
        { user: { role: "RENTAL_STAFF" } },
        res,
        () => { nextCalled = true; }
    );

    assert.equal(statusCode, 403);
    assert.equal(responseBody.success, false);
    assert.equal(nextCalled, false);
});
