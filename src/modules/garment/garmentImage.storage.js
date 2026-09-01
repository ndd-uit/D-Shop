import { randomUUID } from "node:crypto";
import {
    getSupabaseStorageClient,
} from "../../config/supabaseStorage.js";

const DEFAULT_BUCKET = "garments";

const IMAGE_TYPES = {
    "image/jpeg": {
        extension: "jpg",
        matches: (buffer) =>
            buffer.length >= 3 &&
            buffer[0] === 0xff &&
            buffer[1] === 0xd8 &&
            buffer[2] === 0xff,
    },
    "image/png": {
        extension: "png",
        matches: (buffer) =>
            buffer.length >= 8 &&
            buffer.subarray(0, 8).equals(
                Buffer.from([
                    0x89, 0x50, 0x4e, 0x47,
                    0x0d, 0x0a, 0x1a, 0x0a,
                ])
            ),
    },
    "image/webp": {
        extension: "webp",
        matches: (buffer) =>
            buffer.length >= 12 &&
            buffer.subarray(0, 4).toString() ===
                "RIFF" &&
            buffer.subarray(8, 12).toString() ===
                "WEBP",
    },
};

const getGarmentBucket = () =>
    process.env.SUPABASE_GARMENTS_BUCKET?.trim() ||
    DEFAULT_BUCKET;

const validateGarmentImageFile = (file) => {
    const imageType = IMAGE_TYPES[file?.mimetype];

    if (
        !imageType ||
        !Buffer.isBuffer(file?.buffer) ||
        !imageType.matches(file.buffer)
    ) {
        throw new Error(
            "INVALID_GARMENT_IMAGE_CONTENT"
        );
    }

    return imageType;
};

const removeUploadedObjects = async (
    objectPaths,
    options = {}
) => {
    if (!objectPaths.length) return;

    const storageClient =
        options.storageClient ??
        getSupabaseStorageClient();
    const bucket =
        options.bucket ?? getGarmentBucket();

    const { error } = await storageClient.storage
        .from(bucket)
        .remove(objectPaths);

    if (error) {
        console.error(
            "Không thể dọn ảnh Garment vừa upload:",
            error
        );
    }
};

const uploadGarmentImagesToStorage = async (
    files = [],
    options = {}
) => {
    if (!files.length) return [];

    const storageClient =
        options.storageClient ??
        getSupabaseStorageClient();
    const bucket =
        options.bucket ?? getGarmentBucket();

    const uploaded = [];

    try {
        for (const file of files) {
            const imageType =
                validateGarmentImageFile(file);
            const objectPath = `${randomUUID()}.${imageType.extension}`;
            const bucketClient =
                storageClient.storage.from(bucket);
            const { error } = await bucketClient.upload(
                objectPath,
                file.buffer,
                {
                    cacheControl: "31536000",
                    contentType: file.mimetype,
                    upsert: false,
                }
            );

            if (error) {
                throw error;
            }

            const { data } =
                bucketClient.getPublicUrl(objectPath);

            if (!data?.publicUrl) {
                throw new Error(
                    "SUPABASE_PUBLIC_URL_NOT_FOUND"
                );
            }

            uploaded.push({
                objectPath,
                publicUrl: data.publicUrl,
            });
        }

        return uploaded;
    } catch (error) {
        await removeUploadedObjects(
            uploaded.map((item) => item.objectPath),
            { storageClient, bucket }
        );

        if (
            error.message ===
            "INVALID_GARMENT_IMAGE_CONTENT"
        ) {
            throw error;
        }

        const uploadError = new Error(
            "GARMENT_IMAGE_UPLOAD_FAILED"
        );
        uploadError.cause = error;
        throw uploadError;
    }
};

const buildGarmentBodyWithUploadedImages = (
    body = {},
    uploadedImages = []
) => {
    if (!uploadedImages.length) {
        return { ...body };
    }

    return {
        ...body,
        imageUrls: uploadedImages.map(
            (image) => image.publicUrl
        ),
    };
};

export {
    buildGarmentBodyWithUploadedImages,
    getGarmentBucket,
    removeUploadedObjects,
    uploadGarmentImagesToStorage,
    validateGarmentImageFile,
};
