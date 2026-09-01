import prisma from "../../config/prisma.js";

const findCartByCustomerId = async (customerId, db = prisma) => {
    return db.rentalCart.findUnique({
        where: {
            customerId,
        },
        include: {
            items: {
                select: {
                    cartItemId: true,
                    cartId: true,
                    garmentId: true,
                    requestedSize: true,
                    quantity: true,
                    garment: {
                        select: {
                            garmentId: true,
                            name: true,
                            imageUrls: true,
                            rentalPrice: true,
                            depositAmount: true,
                            isActive: true,
                        },
                    },
                },
            },
        },
    });
};

const deleteCartItems = async (
    cartId,
    cartItemIds,
    db = prisma
) => {
    return db.rentalCartItem.deleteMany({
        where: {
            cartId,
            cartItemId: {
                in: cartItemIds,
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

export {
    createCart,
    createCartItem,
    deleteCartItem,
    deleteCartItems,
    findCartByCustomerId,
    findCartItem,
    findCartItemById,
    updateCartItemQuantity,
    updateRentalPeriod,
};
