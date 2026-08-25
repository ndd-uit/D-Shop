import {
    createCategoryService,
    createGarmentService,
    createRentalUnitService,
    getCategories,
    getGarments,
    getGarmentById,
    getGarmentsForManagement,
    getRentalUnitsForManagement,
    updateCategoryService,
    updateCategoryStatusService,
    updateGarmentService,
    updateGarmentStatusService,
    updateRentalUnitService,
    retireRentalUnitService,
} from './garment.service.js'


const getAllGarments = async (req, res) => {
    try {
        const garments = await getGarments(req.query)
        return res.status(200).json({
            success: true,
            data: garments
        })

    } catch (error) {
        if (
            error.message === "INVALID_GARMENT_SEARCH" ||
            error.message === "INVALID_RENTAL_PERIOD" ||
            error.message === "INVALID_UUID"
        ) {
            return res.status(400).json({
                success: false,
                message: "Bộ lọc tra cứu không hợp lệ",
            });
        }

        if (error.message === "RENTAL_POLICY_NOT_FOUND") {
            return res.status(409).json({
                success: false,
                message: "Không tìm thấy chính sách thuê đang có hiệu lực",
            });
        }

        console.error(error)
        return res.status(500).json({
            success: false,
            message: 'Không thể lấy danh sách trang phục'
        })
    }
}

const getGarmentDetail = async (req, res) => {
    try {
        const { id } = req.params // Lấy garmentId từ params
        const garment = await getGarmentById(id) // Gọi service để lấy garment theo ID
        return res.status(200).json({
            success: true,
            data: garment
        })
    }
    catch (error) {
        if (error.message === 'GARMENT_NOT_FOUND') {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy trang phục'
            })
        }
        console.error(error)
        return res.status(500).json({
            success: false,
            message: 'Không thể lấy thông tin chi tiết trang phục'
        })
    }
}

const getCategoriesController = async (
    req,
    res
) => {
    try {
        const categories = await getCategories();

        return res.status(200).json({
            success: true,
            data: categories,
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message:
                "Không thể lấy danh sách danh mục",
        });
    }
};

const createCategoryController = async (
    req,
    res
) => {
    try {
        const category =
            await createCategoryService(
                req.body ?? {}
            );

        return res.status(201).json({
            success: true,
            message: "Tạo danh mục thành công",
            data: category,
        });
    } catch (error) {
        if (
            error.message ===
            "INVALID_CATEGORY_DATA"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Thông tin danh mục không hợp lệ",
            });
        }

        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Không thể tạo danh mục",
        });
    }
};

const updateCategoryController = async (
    req,
    res
) => {
    try {
        const category =
            await updateCategoryService(
                req.params.categoryId,
                req.body ?? {}
            );

        return res.status(200).json({
            success: true,
            message: "Cập nhật danh mục thành công",
            data: category,
        });
    } catch (error) {
        if (error.message === "CATEGORY_NOT_FOUND") {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy danh mục",
            });
        }

        if (
            error.message ===
            "CATEGORY_FIELD_NOT_ALLOWED"
        ) {
            return res.status(403).json({
                success: false,
                message:
                    "Không được phép cập nhật trường này",
            });
        }

        if (
            error.message ===
                "INVALID_CATEGORY_DATA" ||
            error.message ===
                "NO_CATEGORY_CHANGES"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Thông tin cập nhật danh mục không hợp lệ",
            });
        }

        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Không thể cập nhật danh mục",
        });
    }
};

const updateCategoryStatusController = async (
    req,
    res
) => {
    try {
        const category =
            await updateCategoryStatusService(
                req.params.categoryId,
                req.body?.isActive
            );

        return res.status(200).json({
            success: true,
            message:
                "Cập nhật trạng thái danh mục thành công",
            data: category,
        });
    } catch (error) {
        if (error.message === "CATEGORY_NOT_FOUND") {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy danh mục",
            });
        }

        if (
            error.message ===
            "INVALID_CATEGORY_STATUS"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Trạng thái danh mục không hợp lệ",
            });
        }

        console.error(error);

        return res.status(500).json({
            success: false,
            message:
                "Không thể cập nhật trạng thái danh mục",
        });
    }
};

const getGarmentsForManagementController = async (
    req,
    res
) => {
    try {
        const garments =
            await getGarmentsForManagement();

        return res.status(200).json({
            success: true,
            data: garments,
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message:
                "Không thể lấy danh sách quản lý trang phục",
        });
    }
};

const createGarmentController = async (
    req,
    res
) => {
    try {
        const garment = await createGarmentService(
            req.body ?? {}
        );

        return res.status(201).json({
            success: true,
            message: "Tạo trang phục thành công",
            data: garment,
        });
    } catch (error) {
        return handleGarmentManagementError(
            error,
            res,
            "Không thể tạo trang phục"
        );
    }
};

const updateGarmentController = async (
    req,
    res
) => {
    try {
        const garment = await updateGarmentService(
            req.params.garmentId,
            req.body ?? {}
        );

        return res.status(200).json({
            success: true,
            message: "Cập nhật trang phục thành công",
            data: garment,
        });
    } catch (error) {
        return handleGarmentManagementError(
            error,
            res,
            "Không thể cập nhật trang phục"
        );
    }
};

const updateGarmentStatusController = async (
    req,
    res
) => {
    try {
        const garment =
            await updateGarmentStatusService(
                req.params.garmentId,
                req.body?.isActive
            );

        return res.status(200).json({
            success: true,
            message:
                "Cập nhật trạng thái trang phục thành công",
            data: garment,
        });
    } catch (error) {
        return handleGarmentManagementError(
            error,
            res,
            "Không thể cập nhật trạng thái trang phục"
        );
    }
};

const handleGarmentManagementError = (
    error,
    res,
    fallbackMessage
) => {
    if (
        error.message === "INVALID_GARMENT_DATA" ||
        error.message ===
            "INVALID_GARMENT_FINANCIAL_DATA" ||
        error.message ===
            "INVALID_GARMENT_IMAGES" ||
        error.message === "NO_GARMENT_CHANGES" ||
        error.message === "INVALID_GARMENT_STATUS"
    ) {
        return res.status(400).json({
            success: false,
            message: "Thông tin trang phục không hợp lệ",
        });
    }

    if (
        error.message === "GARMENT_FIELD_NOT_ALLOWED"
    ) {
        return res.status(403).json({
            success: false,
            message:
                "Không được phép cập nhật trường này",
        });
    }

    if (error.message === "CATEGORY_NOT_FOUND") {
        return res.status(404).json({
            success: false,
            message: "Không tìm thấy danh mục",
        });
    }

    if (error.message === "GARMENT_NOT_FOUND") {
        return res.status(404).json({
            success: false,
            message: "Không tìm thấy trang phục",
        });
    }

    if (error.message === "CATEGORY_INACTIVE") {
        return res.status(409).json({
            success: false,
            message:
                "Danh mục đã ngừng sử dụng",
        });
    }

    console.error(error);

    return res.status(500).json({
        success: false,
        message: fallbackMessage,
    });
};

const getRentalUnitsForManagementController = async (
    req,
    res
) => {
    try {
        const units =
            await getRentalUnitsForManagement();

        return res.status(200).json({
            success: true,
            data: units,
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message:
                "Không thể lấy danh sách RentalUnit",
        });
    }
};

const createRentalUnitController = async (
    req,
    res
) => {
    try {
        const unit = await createRentalUnitService(
            req.body ?? {},
            req.user.userId
        );

        return res.status(201).json({
            success: true,
            message: "Tạo RentalUnit thành công",
            data: unit,
        });
    } catch (error) {
        return handleRentalUnitManagementError(
            error,
            res,
            "Không thể tạo RentalUnit"
        );
    }
};

const updateRentalUnitController = async (
    req,
    res
) => {
    try {
        const unit = await updateRentalUnitService(
            req.params.rentalUnitId,
            req.body ?? {}
        );

        return res.status(200).json({
            success: true,
            message: "Cập nhật RentalUnit thành công",
            data: unit,
        });
    } catch (error) {
        return handleRentalUnitManagementError(
            error,
            res,
            "Không thể cập nhật RentalUnit"
        );
    }
};

const retireRentalUnitController = async (
    req,
    res
) => {
    try {
        const unit = await retireRentalUnitService(
            req.params.rentalUnitId,
            req.user.userId,
            req.body?.reason
        );

        return res.status(200).json({
            success: true,
            message: "Ngừng sử dụng RentalUnit thành công",
            data: unit,
        });
    } catch (error) {
        return handleRentalUnitManagementError(
            error,
            res,
            "Không thể ngừng sử dụng RentalUnit"
        );
    }
};

const handleRentalUnitManagementError = (
    error,
    res,
    fallbackMessage
) => {
    if (
        error.message === "INVALID_RENTAL_UNIT_DATA" ||
        error.message === "NO_RENTAL_UNIT_CHANGES" ||
        error.message === "RETIRE_REASON_REQUIRED"
    ) {
        return res.status(400).json({
            success: false,
            message:
                error.message === "RETIRE_REASON_REQUIRED"
                    ? "Phải cung cấp lý do ngừng sử dụng RentalUnit"
                    : "Thông tin RentalUnit không hợp lệ",
        });
    }

    if (
        error.message ===
        "RENTAL_UNIT_FIELD_NOT_ALLOWED"
    ) {
        return res.status(403).json({
            success: false,
            message:
                "Không được phép cập nhật trường này",
        });
    }

    if (error.message === "GARMENT_NOT_FOUND") {
        return res.status(404).json({
            success: false,
            message: "Không tìm thấy trang phục",
        });
    }

    if (error.message === "RENTAL_UNIT_NOT_FOUND") {
        return res.status(404).json({
            success: false,
            message: "Không tìm thấy RentalUnit",
        });
    }

    if (
        error.message === "GARMENT_INACTIVE" ||
        error.message ===
            "RENTAL_UNIT_ASSET_CODE_EXISTS" ||
        error.message ===
            "RENTAL_UNIT_RETIRE_NOT_ALLOWED" ||
        error.message ===
            "RENTAL_UNIT_HAS_ACTIVE_RESERVATION"
    ) {
        const messages = {
            GARMENT_INACTIVE:
                "Trang phục đã ngừng sử dụng",
            RENTAL_UNIT_ASSET_CODE_EXISTS:
                "Mã tài sản đã được sử dụng",
            RENTAL_UNIT_RETIRE_NOT_ALLOWED:
                "Không thể ngừng sử dụng RentalUnit ở trạng thái hiện tại",
            RENTAL_UNIT_HAS_ACTIVE_RESERVATION:
                "RentalUnit đang có Reservation còn hiệu lực",
        };

        return res.status(409).json({
            success: false,
            message: messages[error.message],
        });
    }

    console.error(error);

    return res.status(500).json({
        success: false,
        message: fallbackMessage,
    });
};

export {
    getAllGarments,
    getGarmentDetail,
    getCategoriesController,
    createCategoryController,
    updateCategoryController,
    updateCategoryStatusController,
    getGarmentsForManagementController,
    createGarmentController,
    updateGarmentController,
    updateGarmentStatusController,
    getRentalUnitsForManagementController,
    createRentalUnitController,
    updateRentalUnitController,
    retireRentalUnitController,
}
