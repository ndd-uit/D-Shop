import {
    completeReturnedReservationBlocks,
    expirePendingPaymentOrders,
} from "../modules/rental/rental.service.js";

const EXPIRE_TEMPORARY_HOLDS_INTERVAL_MS = 60_000;

let intervalId = null;
let isRunning = false;

const runExpireTemporaryHoldsTick = async (
    expire = expirePendingPaymentOrders
) => {
    if (isRunning) {
        return {
            skipped: true,
        };
    }

    isRunning = true;

    try {
        const expiredHolds = await expire();
        const completedReservationBlocks =
            await completeReturnedReservationBlocks();

        return {
            ...expiredHolds,
            ...completedReservationBlocks,
        };
    } catch (error) {
        console.error(
            "Không thể tự động xử lý giữ chỗ đã hết hạn",
            error
        );

        return {
            failed: true,
        };
    } finally {
        isRunning = false;
    }
};

const startExpireTemporaryHoldsJob = () => {
    if (intervalId) {
        return intervalId;
    }

    intervalId = setInterval(
        () => {
            void runExpireTemporaryHoldsTick();
        },
        EXPIRE_TEMPORARY_HOLDS_INTERVAL_MS
    );

    intervalId.unref?.();

    return intervalId;
};

export {
    runExpireTemporaryHoldsTick,
    startExpireTemporaryHoldsJob,
};
