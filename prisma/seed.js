import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

import {
  PrismaClient,
  AccountType,
  Currency,
  Role,
} from "@prisma/client";

const prisma = new PrismaClient();

function generateAccountNumber() {
  // 10-digit account number
  return Math.floor(
    1000000000 + Math.random() * 9000000000
  ).toString();
}

async function main() {
  console.log("🌱 Seeding database...");

  const adminEmail = "admin@firstcityfinance.com";

  const existingAdmin = await prisma.user.findUnique({
    where: {
      email: adminEmail,
    },
    include: {
      accounts: true,
    },
  });

  if (existingAdmin) {
    console.log("✅ Admin already exists.");

    if (existingAdmin.accounts.length === 0) {
      await prisma.account.create({
        data: {
          userId: existingAdmin.id,
          accountNumber: generateAccountNumber(),
          balance: 0,
          suspended: false,
        },
      });

      console.log("✅ Admin account created.");
    }

    return;
  }

  const hashedPassword = await bcrypt.hash("Admin@12345", 10);

  const admin = await prisma.user.create({
    data: {
      firstName: "System",
      lastName: "Administrator",
      otherName: "",
      email: adminEmail,
      password: hashedPassword,
      role: Role.ADMIN,
      phone: "+10000000000",
      dob: new Date("1990-01-01"),
      type: AccountType.SAVINGS,
      currency: Currency.USD,
    },
  });

  await prisma.account.create({
    data: {
      userId: admin.id,
      accountNumber: generateAccountNumber(),
      type: "SAVINGS", 
      currency: "USD",
      balance: 0,
      suspended: false,
      
    },
  });

  console.log("✅ Admin created successfully.");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });