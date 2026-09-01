import multer from "multer";

const RENTAL_EVIDENCE_FIELD = "images";
const RENTAL_EVIDENCE_MAX_COUNT = 5;
const RENTAL_EVIDENCE_MAX_SIZE = 5 * 1024 * 1024;
const RENTAL_EVIDENCE_MIME_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
]);

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: RENTAL_EVIDENCE_MAX_SIZE,
        files: RENTAL_EVIDENCE_MAX_COUNT,
    },
    fileFilter: (req, file, callback) => {
        if (!RENTAL_EVIDENCE_MIME_TYPES.has(file.mimetype)) {
            const error = new Error("INVALID_RENTAL_EVIDENCE_TYPE");
            error.code = "INVALID_RENTAL_EVIDENCE_TYPE";
            callback(error);
            return;
        }

        callback(null, true);
    },
}).array(RENTAL_EVIDENCE_FIELD, RENTAL_EVIDENCE_MAX_COUNT);

const uploadRentalEvidenceImages = (req, res, next) => {
    upload(req, res, (error) => {
        if (!error) {
            next();
            return;
        }

        if (error.code === "LIMIT_FILE_SIZE") {
            return res.status(413).json({
                success: false,
                message: "Mỗi ảnh bằng chứng không được vượt quá 5MB",
            });
        }

        if (
            error.code === "LIMIT_FILE_COUNT" ||
            error.code === "LIMIT_UNEXPECTED_FILE"
        ) {
            return res.status(400).json({
                success: false,
                message: "Chỉ được tải tối đa 5 ảnh bằng chứng",
            });
        }

        if (error.code === "INVALID_RENTAL_EVIDENCE_TYPE") {
            return res.status(400).json({
                success: false,
                message: "Ảnh bằng chứng phải là JPG, PNG hoặc WEBP",
            });
        }

        next(error);
    });
};

export {
    RENTAL_EVIDENCE_FIELD,
    RENTAL_EVIDENCE_MAX_COUNT,
    RENTAL_EVIDENCE_MAX_SIZE,
    uploadRentalEvidenceImages,
};
