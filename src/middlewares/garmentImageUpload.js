import multer from "multer";

const GARMENT_IMAGE_FIELD = "images";
const GARMENT_IMAGE_MAX_COUNT = 5;
const GARMENT_IMAGE_MAX_SIZE = 5 * 1024 * 1024;
const GARMENT_IMAGE_MIME_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
]);

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: GARMENT_IMAGE_MAX_SIZE,
        files: GARMENT_IMAGE_MAX_COUNT,
    },
    fileFilter: (req, file, callback) => {
        if (!GARMENT_IMAGE_MIME_TYPES.has(file.mimetype)) {
            const error = new Error(
                "INVALID_GARMENT_IMAGE_TYPE"
            );
            error.code = "INVALID_GARMENT_IMAGE_TYPE";
            callback(error);
            return;
        }

        callback(null, true);
    },
}).array(
    GARMENT_IMAGE_FIELD,
    GARMENT_IMAGE_MAX_COUNT
);

const uploadGarmentImages = (req, res, next) => {
    upload(req, res, (error) => {
        if (!error) {
            next();
            return;
        }

        if (error.code === "LIMIT_FILE_SIZE") {
            return res.status(413).json({
                success: false,
                message:
                    "Mỗi ảnh trang phục không được vượt quá 5MB",
            });
        }

        if (
            error.code === "LIMIT_FILE_COUNT" ||
            error.code === "LIMIT_UNEXPECTED_FILE"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Chỉ được tải tối đa 5 ảnh trang phục",
            });
        }

        if (
            error.code ===
            "INVALID_GARMENT_IMAGE_TYPE"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Ảnh trang phục phải là JPG, PNG hoặc WEBP",
            });
        }

        next(error);
    });
};

export {
    GARMENT_IMAGE_FIELD,
    GARMENT_IMAGE_MAX_COUNT,
    GARMENT_IMAGE_MAX_SIZE,
    uploadGarmentImages,
};
