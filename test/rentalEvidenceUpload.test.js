import assert from "node:assert/strict";
import test from "node:test";
import express from "express";

import {
    uploadRentalEvidenceImages,
} from "../src/middlewares/rentalEvidenceUpload.js";

const withUploadServer = async (callback) => {
    const app = express();
    app.post(
        "/evidence",
        uploadRentalEvidenceImages,
        (req, res) => res.json({ count: req.files.length })
    );
    app.use((error, req, res, next) => {
        res.status(500).json({ message: error.message });
    });

    const server = await new Promise((resolve) => {
        const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
    });

    try {
        const address = server.address();
        await callback(`http://127.0.0.1:${address.port}`);
    } finally {
        await new Promise((resolve, reject) =>
            server.close((error) => error ? reject(error) : resolve())
        );
    }
};

test("rental evidence accepts an image upload", async () => {
    await withUploadServer(async (baseUrl) => {
        const formData = new FormData();
        formData.append(
            "images",
            new Blob([Buffer.from([0xff, 0xd8, 0xff, 0xe0])], {
                type: "image/jpeg",
            }),
            "evidence.jpg"
        );

        const response = await fetch(`${baseUrl}/evidence`, {
            method: "POST",
            body: formData,
        });
        const body = await response.json();

        assert.equal(response.status, 200);
        assert.equal(body.count, 1);
    });
});

test("rental evidence rejects a non-image file", async () => {
    await withUploadServer(async (baseUrl) => {
        const formData = new FormData();
        formData.append(
            "images",
            new Blob(["not an image"], { type: "text/plain" }),
            "evidence.txt"
        );

        const response = await fetch(`${baseUrl}/evidence`, {
            method: "POST",
            body: formData,
        });

        assert.equal(response.status, 400);
    });
});

test("rental evidence rejects files larger than 5MB", async () => {
    await withUploadServer(async (baseUrl) => {
        const formData = new FormData();
        formData.append(
            "images",
            new Blob([Buffer.alloc(5 * 1024 * 1024 + 1)], {
                type: "image/png",
            }),
            "evidence.png"
        );

        const response = await fetch(`${baseUrl}/evidence`, {
            method: "POST",
            body: formData,
        });

        assert.equal(response.status, 413);
    });
});
