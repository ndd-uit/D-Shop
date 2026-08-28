import prisma from "../../config/prisma.js";
import {
    RentalUnitStatus,
    ReservationStatus,
} from "../../generated/prisma/client.ts";
//Tim chinh sach dang co hieu luc
const findActiveRentalPolicy = async (at = new Date(), db = prisma) => {
    // at la thoi diem can tim chinh sach hieu luc
    return db.rentalPolicy.findFirst({
        // SELECT *
        // FROM rentalPolicy
        // WHERE effectiveFrom <= at
        // AND (effectiveTo IS NULL OR effectiveTo > at)
        // ORDER BY effectiveFrom DESC LIMIT 1
        // Khoang hieu luc nua mo: effectiveFrom <= at < effectiveTo.
        where: {
            effectiveFrom: {
                lte: at, // lte: less than or equal to
            },
            OR: [
                {
                    effectiveTo: null, // null: chua co ngay het hieu luc
                }, {
                    effectiveTo: {
                        gt: at, // Khoảng hiệu lực nửa mở: effectiveFrom <= at < effectiveTo
                    },
                }
            ],
        },
        orderBy: [
            {
                effectiveFrom: "desc", // sap xep giam dan theo ngay hieu luc
            },
            {
                version: "desc",
            },
        ]
    });
}

// Tim cac RentalUnit khong bi trung lich
const findAvailableRentalUnits = async (garmentId, requestedSize, blockedStartAt, blockedEndAt, db = prisma) => {
    // blockedStartAt va blockedEndAt la thoi gian muon kiem tra tinh kha dung cua RentalUnit
    const now = new Date(); // lay thoi diem hien tai
    // SELECT * FROM rentalUnit
    // WHERE garmentId = ?
    // AND size = ?
    // AND status NOT IN ('DAMAGED', 'RETIRED')
    // AND NOT EXISTS (
    //     SELECT *
    //     FROM reservation
    //     WHERE rentalUnitId = rentalUnit.id
    //     AND blockedStartAt < ?
    //     AND blockedEndAt > ?
    //     AND (
    //         status = 'CONFIRMED'
    //         OR status = 'ACTIVE'
    //         OR (
    //             status = 'TEMPORARY_HOLD'
    //             AND holdExpiresAt > now
    //         )
    //     )
    // )
    // AND NOT EXISTS (
    //     SELECT *
    //     FROM availabilityBlock
    //     WHERE rentalUnitId = rentalUnit.id
    //     AND startAt < ?
    //     AND endAt > ?
    // )

    // Y nghia: tim cac RentalUnit co garmentId va size nhu yeu cau, khong bi DAMAGED/RETIRED, khong bi trung lich voi cac Reservation co status la CONFIRMED hoac ACTIVE hoac TEMPORARY_HOLD va holdExpiresAt > now, va khong bi trung lich voi cac AvailabilityBlock
    return db.rentalUnit.findMany({
        where: {
            garmentId,
            size: requestedSize,
            status: {
                notIn: [
                    RentalUnitStatus.DAMAGED,
                    RentalUnitStatus.RETIRED,
                ],
            }, // RentalUnit khong bi hu hong hoac ngung su dung
            // Kiem tra RentalUnit co bi trung lich voi cac Reservation khong
            reservations: {
                // Kiem tra cac Reservation cua RentalUnit co bi trung lich voi thoi gian blockedStartAt va blockedEndAt khong
                none: {
                    blockedStartAt: {
                        lt: blockedEndAt, // lt: less than, blockedStartAt < blockedEndAt
                    },
                    blockedEndAt: {
                        gt: blockedStartAt, // gt: greater than, blockedEndAt > blockedStartAt
                    },
                    // Kiem tra cac Reservation co status la CONFIRMED hoac ACTIVE hoac TEMPORARY_HOLD va holdExpiresAt > now khong
                    OR: [
                        {
                            status: ReservationStatus.CONFIRMED,
                        },
                        {
                            status: ReservationStatus.ACTIVE,
                        },
                        {
                            status: ReservationStatus.TEMPORARY_HOLD,
                            holdExpiresAt: {
                                gt: now,
                            },
                        },
                    ],
                },
            },
            availabilityBlocks: {
                none: {
                    startAt: {
                        lt: blockedEndAt, // lt: less than, startAt < blockedEndAt
                    },
                    endAt: {
                        gt: blockedStartAt, // gt: greater than, endAt > blockedStartAt
                    },
                },
            },
        },
    });
};

const findRentalUnitById = async (
    rentalUnitId,
    db = prisma
) => {
    return db.rentalUnit.findUnique({
        where: {
            rentalUnitId,
        },
    });
};

const findBlockingReservationsForUnit = async (
    rentalUnitId,
    startAt,
    endAt,
    now = new Date(),
    db = prisma
) => {
    return db.reservation.findMany({
        where: {
            rentalUnitId,
            blockedStartAt: {
                lt: endAt,
            },
            blockedEndAt: {
                gt: startAt,
            },
            OR: [
                {
                    status: {
                        in: [
                            ReservationStatus.CONFIRMED,
                            ReservationStatus.ACTIVE,
                        ],
                    },
                },
                {
                    status:
                        ReservationStatus.TEMPORARY_HOLD,
                    holdExpiresAt: {
                        gt: now,
                    },
                },
            ],
        },
    });
};

const createAvailabilityBlock = async (
    data,
    db = prisma
) => {
    return db.availabilityBlock.create({
        data,
    });
};

const findAvailabilityBlocks = async (
    db = prisma
) => {
    return db.availabilityBlock.findMany({
        include: {
            rentalUnit: {
                include: {
                    garment: true,
                },
            },
        },
        orderBy: {
            startAt: "desc",
        },
    });
};

const findAvailabilityBlockById = async (
    blockId,
    db = prisma
) => {
    return db.availabilityBlock.findUnique({
        where: {
            blockId,
        },
    });
};

const endAvailabilityBlock = async (
    blockId,
    endAt,
    db = prisma
) => {
    return db.availabilityBlock.update({
        where: {
            blockId,
        },
        data: {
            endAt,
        },
    });
};

const deleteAvailabilityBlock = async (
    blockId,
    db = prisma
) => {
    return db.availabilityBlock.delete({
        where: {
            blockId,
        },
    });
};

export {
    findActiveRentalPolicy,
    findAvailableRentalUnits,
    findRentalUnitById,
    findBlockingReservationsForUnit,
    createAvailabilityBlock,
    findAvailabilityBlocks,
    findAvailabilityBlockById,
    endAvailabilityBlock,
    deleteAvailabilityBlock,
};
