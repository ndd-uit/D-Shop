import prisma from "../../config/prisma.js";

const findCartByCustomerId = async (customerId) => {
    return prisma.rentalCart.findUnique({
        where: {
            customerId,
        },
        include: {
            items: {
                include: {
                    garment: {
                        include: {
                            category: true,
                            rentalUnits: true,
                        },
                    },
                },
            },
        },
    });
};

const createCart = async (customerId) => {
    return prisma.rentalCart.create({
        data: {
            customerId,
            updatedAt: new Date(),
        },
        include: {
            items: true,
        }
    });
};

const findCartItem = async (cartId, garmentId, requestedSize) => {
    return prisma.rentalCartItem.findUnique({
        where: {
            cartId_garmentId_requestedSize: {
                cartId,
                garmentId,
                requestedSize,
            },
        },
    });
}

const createCartItem = async (cartId, garmentId, requestedSize, quantity) => {
    return prisma.rentalCartItem.create({
        data: {
            cartId,
            garmentId,
            requestedSize,
            quantity,
        },
    });
};

const updateCartItemQuantity = async (cartItemId, quantity) => {
    return prisma.rentalCartItem.update({
        where: {
            cartItemId,
        },
        data: {
            quantity,
        },
    });
}

const findCartItemById = async (cartItemId) => {
    return prisma.rentalCartItem.findUnique({
        where: {
            cartItemId,
        },
    });
}

const deleteCartItem = async (cartItemId) => {
    return prisma.rentalCartItem.delete({
        where: {
            cartItemId,
        },
    });
}
// Cap nhat thoi gian thue
const updateRentalPeriod = async (cartId, rentalStartAt, returnDueAt) => {
    return prisma.rentalCart.update({
        where: {
            cartId,
        },
        data: {
            rentalStartAt,
            returnDueAt,
            updatedAt: new Date(),
        },
    });
}

export { updateRentalPeriod, deleteCartItem, findCartItemById, findCartByCustomerId, createCart, findCartItem, createCartItem, updateCartItemQuantity };