const mismatch = () => {
    const error = new Error("Số tiền thanh toán không khớp báo giá hoặc đơn thuê. Vui lòng tải lại trang; nếu vẫn lệch, liên hệ cửa hàng trước khi thanh toán.")
    error.code = "PAYMENT_AMOUNT_MISMATCH"
    throw error
}

const assertRentalOrderAmount = (order, expectedAmount) => {
    const amount = Number(expectedAmount)
    if (!Number.isFinite(amount) || amount <= 0 ||
        Number(order?.rentalAmount) !== amount || Number(order?.upfrontAmount) !== amount) mismatch()
}

const assertPaymentAmount = (result, expectedAmount) => {
    const amount = Number(result?.payment?.amount)
    if (!Number.isFinite(amount) || amount <= 0) mismatch()
    if (expectedAmount !== undefined && Number(expectedAmount) !== amount) mismatch()
    if (result?.checkout && Number(result.checkout.fields?.order_amount) !== amount) mismatch()
}

export { assertRentalOrderAmount, assertPaymentAmount }
