import { updateRentalPeriod, deleteCartItem, findCartItemById, findCartByCustomerId, createCart, findCartItem, createCartItem, updateCartItemQuantity } from "./cart.repository.js";
import { getGarmentById } from "../garment/garment.service.js";
import { checkAvailability } from "../availability/availability.service.js";
import { validateUuidValue } from "../../utils/validation.js";
// Lay cart cua customer: chi tim --> k co --> null
const getCart = async (customerId) => {
    return findCartByCustomerId(customerId)
}

// Tao cart neu chua co: tim --> k co --> tao moi
const getOrCreateCart = async (customerId) => {
    let cart = await findCartByCustomerId(customerId);
    if (!cart) {
        cart = await createCart(customerId);
    }
    return cart;
};

const addItemToCart = async (customerId, garmentId, requestedSize, quantity = 1) => {
    validateUuidValue(garmentId);

    if (!Number.isInteger(quantity) || quantity < 1) {
        throw new Error("INVALID_QUANTITY");
    }

    if (
        typeof requestedSize !== "string" ||
        !requestedSize.trim()
    ) {
        throw new Error("INVALID_CART_ITEM_DATA");
    }

    const normalizedSize = requestedSize.trim();

    //Kiem tra garmentId co ton tai khong
    const garment = await getGarmentById(garmentId);
    //Kiem tra garment co con hoat dong khong
    if (!garment.isActive) {
        throw new Error("GARMENT_INACTIVE");
    }
    //Kiem tra size co thuoc garment khong
    const hasSize = garment.rentalUnits.some(unit => unit.size === normalizedSize);
    if (!hasSize) {
        throw new Error("SIZE_NOT_AVAILABLE");
    }

    //Lay cart cua customer: duoc phep tao cart moi neu chua co
    const cart = await getOrCreateCart(customerId);

    //Xem garment + size da co trong cart chua
    const existingCartItem = await findCartItem(cart.cartId, garmentId, normalizedSize);

    // Tong so luong yeu cau = so luong hien co trong cart + so luong moi yeu cau
    const totalQuantity = existingCartItem ? existingCartItem.quantity + quantity : quantity;

    // Chi check availability neu cart da co thoi gian thue
    if (cart.rentalStartAt && cart.returnDueAt) {
        const result = await checkAvailability({
            garmentId,
            requestedSize: normalizedSize,
            quantity: totalQuantity,
            rentalStartAt: cart.rentalStartAt,
            returnDueAt: cart.returnDueAt,
        });
        // Neu khong du so luong RentalUnit kha dung
        if (!result.available) {
            throw new Error("INSUFFICIENT_AVAILABILITY");
        }
    }
    //Neu co roi thi update quantity
    if (existingCartItem) {
        return updateCartItemQuantity(existingCartItem.cartItemId, totalQuantity);
    }
    //Neu chua co thi tao moi
    return createCartItem(cart.cartId, garmentId, normalizedSize, quantity);
};


const updateItemQuantity = async (customerId, cartItemId, quantity) => {
    if (!Number.isInteger(quantity) || quantity < 1) {
        throw new Error("INVALID_QUANTITY");
    }
    //Lay cart cua customer: khong duoc tao moi neu chua co
    const cart = await getCart(customerId);

    if (!cart) {
        throw new Error("CART_NOT_FOUND");
    }
    // Tim item trong cart
    const item = await findCartItemById(cartItemId);
    // Neu khong tim thay item
    if (!item) {
        throw new Error("CART_ITEM_NOT_FOUND");
    }
    // Neu item khong thuoc cart cua customer
    if (item.cartId !== cart.cartId) {
        throw new Error("FORBIDDEN_CART_ITEM");
    };
    //
    if (cart.rentalStartAt && cart.returnDueAt) {
        const result = await checkAvailability({
            garmentId: item.garmentId, // Lấy garmentId từ RentalCartItem mà repository vừa tìm được
            requestedSize: item.requestedSize, // Lấy requestedSize từ RentalCartItem mà repository vừa tìm được
            quantity: quantity, // Số lượng mới yêu cầu
            rentalStartAt: cart.rentalStartAt,
            returnDueAt: cart.returnDueAt,
        });
        if (!result.available) {
            throw new Error("INSUFFICIENT_AVAILABILITY");
        }
    }
    return updateCartItemQuantity(cartItemId, quantity);
}


const removeCartItem = async (customerId, cartItemId) => {
    //Lay cart cua customer
    const cart = await getCart(customerId);
    // Neu khong tim thay cart
    if (!cart) {
        throw new Error("CART_NOT_FOUND");
    }
    // Tim item trong cart
    const item = await findCartItemById(cartItemId);
    // Neu khong tim thay item
    if (!item) {
        throw new Error("CART_ITEM_NOT_FOUND");
    }
    // Neu item khong thuoc cart cua customer
    if (item.cartId !== cart.cartId) {
        throw new Error("FORBIDDEN_CART_ITEM");
    };
    return deleteCartItem(cartItemId);
}

const updateCartRentalPeriod = async (customerId, rentalStartAt, returnDueAt) => {
    //Lay cart cua customer
    const cart = await getCart(customerId);
    if (!cart) {
        throw new Error("CART_NOT_FOUND");
    }
    // đổi string từ body thành Date để Prisma lưu vào DateTime
    const start = new Date(rentalStartAt);
    const end = new Date(returnDueAt);
    // Kiểm tra tính hợp lệ của ngày
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) {
        throw new Error("INVALID_RENTAL_PERIOD");
    }
    // Check tat ca item trong cart co du RentalUnit kha dung khong, tat ca hop le --> update thoi gian
    for (const item of cart.items) {
        const result = await checkAvailability({
            garmentId: item.garmentId,
            requestedSize: item.requestedSize,
            quantity: item.quantity,
            rentalStartAt: start,
            returnDueAt: end,
        });
        if (!result.available) {
            throw new Error('INSUFFICIENT_AVAILABILITY');
        }
    }
    return updateRentalPeriod(cart.cartId, start, end);
};

export { getCart, addItemToCart, updateItemQuantity, removeCartItem, updateCartRentalPeriod };
