import "dotenv/config";
import bcrypt from "bcrypt";
import {
  PrismaClient,
  RentalUnitStatus,
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

// Dữ liệu mẫu để seed vào cơ sở dữ liệu
const TEST_CUSTOMER = {
  fullName: "Nguyễn Văn Test",
  email: "customer@attira.vn",
  password: "Customer@123",
  nationalId: "001234567890",
};

const TEST_STAFF = {
  fullName: "Nhân viên Test",
  email: "staff@attira.vn",
  password: "Staff@123",
};

const TEST_STORE_MANAGER = {
  fullName: "Quản lý Test",
  email: "manager@attira.vn",
  password: "Manager@123",
};

const TEST_CATEGORY = {
  name: "Váy",
  description: "Trang phục váy cho thuê",
};

const TEST_GARMENT = {
  name: "Váy Satin Đen",
  description: "Váy satin màu đen dành cho sự kiện",
  color: "Đen",
  rentalPrice: 350000,
  depositAmount: 500000,
};

const TEST_RENTAL_UNITS = [
  {
    assetCode: "ATT-DRESS-001",
    size: "S",
  },
  {
    assetCode: "ATT-DRESS-002",
    size: "M",
  },
  {
    assetCode: "ATT-DRESS-003",
    size: "L",
  },
];

// Hàm seed dữ liệu mẫu vào cơ sở dữ liệu
async function seedCustomer() {
  const passwordHash = await bcrypt.hash(TEST_CUSTOMER.password, 12);

  return prisma.user.upsert({
    where: {
      email: TEST_CUSTOMER.email,
    },
    update: {
      fullName: TEST_CUSTOMER.fullName,
      passwordHash,
      nationalId: TEST_CUSTOMER.nationalId,
      role: UserRole.CUSTOMER,
      isActive: true,
    },
    create: {
      fullName: TEST_CUSTOMER.fullName,
      email: TEST_CUSTOMER.email,
      passwordHash,
      nationalId: TEST_CUSTOMER.nationalId,
      role: UserRole.CUSTOMER,
      isActive: true,
    },
  });
}

async function seedRentalStaff() {
  const passwordHash = await bcrypt.hash(
    TEST_STAFF.password,
    12
  );

  return prisma.user.upsert({
    where: {
      email: TEST_STAFF.email,
    },
    update: {
      fullName: TEST_STAFF.fullName,
      passwordHash,
      role: UserRole.RENTAL_STAFF,
      isActive: true,
    },
    create: {
      fullName: TEST_STAFF.fullName,
      email: TEST_STAFF.email,
      passwordHash,
      role: UserRole.RENTAL_STAFF,
      isActive: true,
    },
  });
}

async function seedStoreManager() {
  const passwordHash = await bcrypt.hash(
    TEST_STORE_MANAGER.password,
    12
  );

  return prisma.user.upsert({
    where: {
      email: TEST_STORE_MANAGER.email,
    },
    update: {
      fullName: TEST_STORE_MANAGER.fullName,
      passwordHash,
      role: UserRole.STORE_MANAGER,
      isActive: true,
    },
    create: {
      fullName: TEST_STORE_MANAGER.fullName,
      email: TEST_STORE_MANAGER.email,
      passwordHash,
      role: UserRole.STORE_MANAGER,
      isActive: true,
    },
  });
}

async function seedCategory() {
  const existingCategory = await prisma.category.findFirst({
    where: {
      name: TEST_CATEGORY.name,
    },
  });

  if (existingCategory) {
    return prisma.category.update({
      where: {
        categoryId: existingCategory.categoryId,
      },
      data: {
        description: TEST_CATEGORY.description,
        isActive: true,
      },
    });
  }

  return prisma.category.create({
    data: {
      name: TEST_CATEGORY.name,
      description: TEST_CATEGORY.description,
      isActive: true,
    },
  });
}

async function seedGarment(categoryId: string) {
  const existingGarment = await prisma.garment.findFirst({
    where: {
      categoryId,
      name: TEST_GARMENT.name,
    },
  });

  if (existingGarment) {
    return prisma.garment.update({
      where: {
        garmentId: existingGarment.garmentId,
      },
      data: {
        description: TEST_GARMENT.description,
        color: TEST_GARMENT.color,
        rentalPrice: TEST_GARMENT.rentalPrice,
        depositAmount: TEST_GARMENT.depositAmount,
        isActive: true,
      },
    });
  }

  return prisma.garment.create({
    data: {
      categoryId,
      name: TEST_GARMENT.name,
      description: TEST_GARMENT.description,
      color: TEST_GARMENT.color,
      rentalPrice: TEST_GARMENT.rentalPrice,
      depositAmount: TEST_GARMENT.depositAmount,
      isActive: true,
    },
  });
}

async function seedRentalUnits(garmentId: string) {
  return Promise.all(
    TEST_RENTAL_UNITS.map((unit) =>
      prisma.rentalUnit.upsert({
        where: {
          assetCode: unit.assetCode,
        },
        update: {
          garmentId,
          size: unit.size,
          condition: "Tốt",
          status: RentalUnitStatus.AVAILABLE,
        },
        create: {
          garmentId,
          assetCode: unit.assetCode,
          size: unit.size,
          condition: "Tốt",
          status: RentalUnitStatus.AVAILABLE,
        },
      }),
    ),
  );
}

async function seedRentalPolicy(createdBy: string) {
  const result = await activateRentalPolicyV2(
    prisma,
    createdBy,
  );

  return result.policy;
}

async function main() {
  const customer = await seedCustomer();
  const staff = await seedRentalStaff();
  const manager = await seedStoreManager();
  const category = await seedCategory();
  const garment = await seedGarment(category.categoryId);
  const rentalUnits = await seedRentalUnits(garment.garmentId);
  const policy = await seedRentalPolicy(manager.userId);

  console.log("Seed completed");
  console.log({
    customer: {
      userId: customer.userId,
      email: customer.email,
      role: customer.role,
    },
    staff: {
      userId: staff.userId,
      email: staff.email,
      role: staff.role,
    },
    manager: {
      userId: manager.userId,
      email: manager.email,
      role: manager.role,
    },
    category: category.name,
    garment: garment.name,
    rentalUnits: rentalUnits.map((unit) => ({
      assetCode: unit.assetCode,
      size: unit.size,
      status: unit.status,
    })),
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
