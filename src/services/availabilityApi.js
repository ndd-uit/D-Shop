import api from "./api.js"

const checkGarmentAvailability = async ({
    garmentId,
    size,
    quantity,
    rentalStartAt,
    returnDueAt,
}) => {
    const response = await api.get("/availability/check", {
        params: {
            garmentId,
            size,
            quantity,
            rentalStartAt,
            returnDueAt,
        },
    })

    return response.data.data
}

export { checkGarmentAvailability }
