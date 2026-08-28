const calculateSettlementAmounts = ({
    rentalAmount,
    collectedDepositAmount,
    additionalCharge,
}) => {
    const rental = Number(rentalAmount);
    const deposit = Number(collectedDepositAmount);
    const charge = Number(additionalCharge);

    if (
        !Number.isFinite(rental) ||
        !Number.isFinite(deposit) ||
        !Number.isFinite(charge) ||
        rental < 0 ||
        deposit < 0 ||
        charge < 0
    ) {
        throw new Error("INVALID_SETTLEMENT_AMOUNT");
    }

    return {
        additionalCharge: charge,
        depositRefundAmount: Math.max(
            deposit - charge,
            0
        ),
        additionalPayment: Math.max(
            charge - deposit,
            0
        ),
        finalCharge: rental + charge,
    };
};

export { calculateSettlementAmounts };
