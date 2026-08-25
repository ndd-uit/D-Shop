import { getCart, addItemToCart, updateItemQuantity, updateCartRentalPeriod, removeCartItem } from "./cart.service.js";

const getCustomerCart = async (req, res) => {
    try {
        // Lay customerId tu req.user.userId
        const customerId = req.user.userId

        const cart = await getCart(customerId);

        return res.status(200).json({
            success: true,
            data: cart,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Lỗi máy chủ nội bộ",
        });
    }
};

const addCartItem = async (req, res) => {
    try {
        const customerId = req.user.userId;
        const { garmentId, requestedSize, quantity } = req.body ?? {};
        const item = await addItemToCart(customerId, garmentId, requestedSize, quantity);
        // 201 Created
        return res.status(201).json({
            success: true,
            data: item,
        });
    } catch (error) {
        if (error.message === "INSUFFICIENT_AVAILABILITY") {
            return res.status(409).json({
                success: false,
                message: "Không đủ sản phẩm cho thuê khả dụng",
            });
        }
        if (error.message === "INVALID_QUANTITY") {
            return res.status(400).json({
                success: false,
                message: "Số lượng không hợp lệ",
            });
        }
        if (
            error.message === "INVALID_UUID" ||
            error.message === "INVALID_CART_ITEM_DATA"
        ) {
            return res.status(400).json({
                success: false,
                message: "Thông tin sản phẩm trong giỏ hàng không hợp lệ",
            });
        }
        if (error.message === "GARMENT_NOT_FOUND") {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy trang phục",
            });
        }

        if (error.message === "GARMENT_INACTIVE") {
            return res.status(400).json({
                success: false,
                message: "Trang phục hiện không khả dụng",
            });
        }

        if (error.message === "SIZE_NOT_AVAILABLE") {
            return res.status(400).json({
                success: false,
                message: "Kích cỡ yêu cầu hiện không khả dụng",
            });
        }
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Lỗi máy chủ nội bộ",
        });
    }
};

const updateCartItem = async (req, res) => {
    try {
        const customerId = req.user.userId;
        const { id } = req.params; // cartItemId
        const { quantity } = req.body ?? {}; // new quantity

        const item = await updateItemQuantity(customerId, id, quantity);
        return res.status(200).json({
            success: true,
            data: item,
        });
    } catch (error
    ) {
        if (error.message === "INSUFFICIENT_AVAILABILITY") {
            return res.status(409).json({
                success: false,
                message: "Không đủ sản phẩm cho thuê khả dụng",
            });
        }
        if (error.message === "CART_NOT_FOUND") {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy giỏ hàng",
            });
        }
        if (error.message === "INVALID_QUANTITY") {
            return res.status(400).json({
                success: false,
                message: "Số lượng không hợp lệ",
            });
        }
        if (error.message === "CART_ITEM_NOT_FOUND") {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy sản phẩm trong giỏ hàng",
            });
        }
        if (error.message === "FORBIDDEN_CART_ITEM") {
            return res.status(403).json({
                success: false,
                message: "Bạn không có quyền cập nhật sản phẩm này trong giỏ hàng",
            });
        }
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Lỗi máy chủ nội bộ",
        });
    }
}

const updateRentalPeriod = async (req, res) => {
    try {
        const customerId = req.user.userId;
        const { rentalStartAt, returnDueAt } = req.body ?? {};
        const cart = await updateCartRentalPeriod(customerId, rentalStartAt, returnDueAt);
        return res.status(200).json({
            success: true,
            data: cart,
        });
    } catch (error) {
        if (error.message === "INSUFFICIENT_AVAILABILITY") {
            return res.status(409).json({
                success: false,
                message: "Không đủ sản phẩm cho thuê khả dụng",
            });
        }
        if (error.message === "CART_NOT_FOUND") {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy giỏ hàng",
            });
        }
        if (error.message === "INVALID_RENTAL_PERIOD") {
            return res.status(400).json({
                success: false,
                message: "Thời gian thuê không hợp lệ",
            });
        }
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Lỗi máy chủ nội bộ",
        });
    }
}

const deleteCartItem = async (req, res) => {
    try {
        const customerId = req.user.userId;
        const { id } = req.params; // cartItemId
        await removeCartItem(customerId, id);
        return res.status(200).json({
            success: true,
            message: "Đã xóa sản phẩm khỏi giỏ hàng",
        });
    } catch (error) {
        if (error.message === "CART_NOT_FOUND") {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy giỏ hàng",
            });
        }
        if (error.message === "CART_ITEM_NOT_FOUND") {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy sản phẩm trong giỏ hàng",
            });
        }
        if (error.message === "FORBIDDEN_CART_ITEM") {
            return res.status(403).json({
                success: false,
                message: "Bạn không có quyền xóa sản phẩm này khỏi giỏ hàng",
            });
        }
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Lỗi máy chủ nội bộ",
        });
    }
}
export { getCustomerCart, addCartItem, updateCartItem, updateRentalPeriod, deleteCartItem };
