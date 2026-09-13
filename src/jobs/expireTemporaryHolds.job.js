import {
    completeReturnedReservationBlocks,
    expirePendingPaymentOrders,
    markOverdueRentalOrders,
} from "../modules/rental/rental.service.js";

const EXPIRE_TEMPORARY_HOLDS_INTERVAL_MS = 60_000;

// Injectable dependencies keep tests independent from the database and clock.
const createRentalLifecycleJob = ({
    expire = expirePendingPaymentOrders,
    markOverdue = markOverdueRentalOrders,
    completeReturned = completeReturnedReservationBlocks,
    schedule = setInterval,
    cancel = clearInterval,
    logger = console,
} = {}) => {
    let intervalId = null;
    let running = null;

    const tick = async () => {
        if (running) return { skipped: true };
        running = Promise.resolve().then(async () => {
            const result = {};
            for (const [task, run] of [
                ["expirePendingPayments", expire],
                ["markOverdue", markOverdue],
                ["completeReturnedBlocks", completeReturned],
            ]) {
                try {
                    Object.assign(result, await run());
                } catch {
                    // Never log raw DB errors, payloads or connection strings.
                    logger.error("Rental lifecycle task failed", { task });
                    result.failed = true;
                }
            }
            return result;
        });
        try {
            return await running;
        } finally {
            running = null;
        }
    };

    const start = () => {
        if (intervalId !== null) return intervalId;
        intervalId = schedule(() => { void tick(); }, EXPIRE_TEMPORARY_HOLDS_INTERVAL_MS);
        intervalId.unref?.();
        void tick(); // Catch up after a restart.
        return intervalId;
    };

    const stop = async () => {
        if (intervalId !== null) cancel(intervalId);
        intervalId = null;
        await running;
    };

    return { tick, start, stop };
};

const lifecycleJob = createRentalLifecycleJob();
const runExpireTemporaryHoldsTick = lifecycleJob.tick;
const startExpireTemporaryHoldsJob = lifecycleJob.start;
const stopExpireTemporaryHoldsJob = lifecycleJob.stop;

export {
    createRentalLifecycleJob,
    runExpireTemporaryHoldsTick,
    startExpireTemporaryHoldsJob,
    stopExpireTemporaryHoldsJob,
};
