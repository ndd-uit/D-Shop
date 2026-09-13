import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.ts";
import { activateRentalPolicyV3 } from "./rental-policy-v3.js";

const connectionString = process.env.DIRECT_URL?.trim() || process.env.DATABASE_URL?.trim();
if (!connectionString) throw new Error("DATABASE_URL_NOT_CONFIGURED");
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
try {
    const manager = await db.user.findFirst({
        where: { role: "STORE_MANAGER", isActive: true },
        orderBy: { createdAt: "asc" }, select: { userId: true },
    });
    if (!manager) throw new Error("ACTIVE_STORE_MANAGER_NOT_FOUND");
    const { policy, alreadyExists } = await activateRentalPolicyV3(db, manager.userId);
    console.log(JSON.stringify({
        version: policy.version, policyId: policy.policyId,
        effectiveFrom: policy.effectiveFrom, effectiveTo: policy.effectiveTo,
        basis: policy.lateFeePolicy.basis, alreadyExists,
    }));
} catch {
    console.error("Policy v3 activation failed. Check database access and policy timeline; no secrets logged.");
    process.exitCode = 1;
} finally {
    await db.$disconnect();
}
