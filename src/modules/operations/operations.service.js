import {
    RentalUnitStatus,
} from "../../generated/prisma/client.ts";
import {
    findOperationalRentalUnits,
    findOverdueOrders,
} from "./operations.repository.js";

const getOperationalDashboard = async () => {
    const overdueOrders = await findOverdueOrders();
    const units = await findOperationalRentalUnits();

    const rentalUnits = {
        [RentalUnitStatus.RENTED]: [],
        [RentalUnitStatus.CLEANING]: [],
        [RentalUnitStatus.MAINTENANCE]: [],
        [RentalUnitStatus.RETIRED]: [],
    };

    for (const unit of units) {
        rentalUnits[unit.status].push(unit);
    }

    return {
        overdueOrders,
        rentalUnits,
        summary: {
            overdueOrderCount:
                overdueOrders.length,
            rentedUnitCount:
                rentalUnits[RentalUnitStatus.RENTED]
                    .length,
            cleaningUnitCount:
                rentalUnits[RentalUnitStatus.CLEANING]
                    .length,
            maintenanceUnitCount:
                rentalUnits[
                    RentalUnitStatus.MAINTENANCE
                ].length,
            retiredUnitCount:
                rentalUnits[RentalUnitStatus.RETIRED]
                    .length,
        },
    };
};

export { getOperationalDashboard };
