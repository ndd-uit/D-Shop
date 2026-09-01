import "dotenv/config";
import bcrypt from "bcrypt";
import {
  PrismaClient,
  UserRole,
} from "../src/generated/prisma/client.ts";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  activateRentalPolicyV2,
} from "./rental-policy-v2.js";

// Khai báo biến môi trường DATABASE_URL
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined");
}

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
});

// Baseline tối thiểu để quản trị hệ thống sau khi dựng database mới.
const INITIAL_STORE_MANAGER = {
  fullName: "Quản lý D Shop",
  email: "manager@dshop.vn",
  password: "Manager@123",
};

async function seedStoreManager() {
  const passwordHash = await bcrypt.hash(
    INITIAL_STORE_MANAGER.password,
    12
  );

  return prisma.user.upsert({
    where: {
      email: INITIAL_STORE_MANAGER.email,
    },
    update: {
      fullName: INITIAL_STORE_MANAGER.fullName,
      passwordHash,
      role: UserRole.STORE_MANAGER,
      isActive: true,
    },
    create: {
      fullName: INITIAL_STORE_MANAGER.fullName,
      email: INITIAL_STORE_MANAGER.email,
      passwordHash,
      role: UserRole.STORE_MANAGER,
      isActive: true,
    },
  });
}

async function seedRentalPolicy(createdBy: string) {
  const result = await activateRentalPolicyV2(
    prisma,
    createdBy,
  );

  return result.policy;
}

async function main() {
  const manager = await seedStoreManager();
  const policy = await seedRentalPolicy(manager.userId);

  console.log("Seed completed");
  console.log({
    manager: {
      userId: manager.userId,
      email: manager.email,
      role: manager.role,
    },
    policy: policy.version,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
