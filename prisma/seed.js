import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  // 🔐 Hash passwords
  const adminPassword = await bcrypt.hash("Admin@123", 10);
  const customerPassword = await bcrypt.hash("User@123", 10);

  // 👤 Create Admin User
  const admin = await prisma.user.create({
    data: {
      firstName: "System",
      lastName: "Admin",
      email: "admin@example.com",
      password: adminPassword,
      phone: "08000000000",
      dob: new Date("1990-01-01"),
      role: "ADMIN",
      accounts: {
        create: {
          type: "CHECKING",
          accountNumber: "10000001", // ✅ fixed here
          balance: 10000,
        },
      },
    },
  });

  // 👤 Create Customer User
  const customer = await prisma.user.create({
    data: {
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      password: customerPassword,
      phone: "08011111111",
      dob: new Date("1995-05-10"),
      role: "CUSTOMER",
      accounts: {
        create: {
          type: "SAVINGS",
          accountNumber: "20000001", // ✅ fixed here
          balance: 5000,
        },
      },
    },
  });

  console.log("✅ Seeded users:", { admin, customer });
}

main()
  .catch((err) => {
    console.error("❌ Seed error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
