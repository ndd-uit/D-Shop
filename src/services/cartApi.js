import api from "./api.js"

const getCart = async () => {
    const response = await api.get("/cart")
    return response.data.data
}

const addCartItem = async ({ garmentId, requestedSize, quantity }) => {
    const response = await api.post("/cart/items", {
        garmentId,
        requestedSize,
        quantity,
    })

    return response.data.data
}

const updateCartItemQuantity = async (cartItemId, quantity) => {
    const response = await api.patch(`/cart/items/${cartItemId}`, {
        quantity,
    })

    return response.data.data
}

const removeCartItem = async (cartItemId) => {
    const response = await api.delete(`/cart/items/${cartItemId}`)
    return response.data
}

const updateCartRentalPeriod = async ({ rentalStartAt, returnDueAt }) => {
    const response = await api.patch("/cart/rental-period", {
        rentalStartAt,
        returnDueAt,
    })

    return response.data.data
}

export {
    addCartItem,
    getCart,
    removeCartItem,
    updateCartItemQuantity,
    updateCartRentalPeriod,
}
