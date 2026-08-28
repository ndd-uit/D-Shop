import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  PrismaClient,
  UserRole,
} from "../src/generated/prisma/client.ts";
import {
  activateRentalPolicyV2,
  policyMatchesV2,
} from "./rental-policy-v2.js";

const connectionString =
  process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

try {
  const manager = await prisma.user.findFirst({
    where: {
      role: UserRole.STORE_MANAGER,
      isActive: true,
    },
    orderBy: { createdAt: "asc" },
    select: { userId: true },
  });

  if (!manager) {
    throw new Error("ACTIVE_STORE_MANAGER_NOT_FOUND");
  }

  const result = await activateRentalPolicyV2(
    prisma,
    manager.userId,
  );

  if (!policyMatchesV2(result.policy)) {
    throw new Error("POLICY_V2_VERIFICATION_FAILED");
  }

  console.log(JSON.stringify({
    version: result.policy.version,
    policyId: result.policy.policyId,
    effectiveFrom: result.policy.effectiveFrom,
    effectiveTo: result.policy.effectiveTo,
    closedPolicyCount: result.closedPolicyCount,
  }, null, 2));
} finally {
  await prisma.$disconnect();
}
