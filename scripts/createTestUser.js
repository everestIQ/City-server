import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash("EvRy24tn", 10);

  const user = await prisma.user.create({
    data: {
      firstName: "Richard",
      lastName: "Williamson",
      otherName: "",
      email: "richardwilliamson279@gmail.com",        // ⚠️ MUST NOT BE EMPTY
      phone: "08000111",
      address: "Kings Ave",        // ⚠️ MUST NOT BE EMPTY
      dob: new Date("1967-01-07"),
      accountType: "SAVINGS",
      role: "CUSTOMER",                  // 👈 for admin dashboard
      password: hashedPassword,
      securityQuestion: "test",
      securityAnswer: "test",
    },
  });

  console.log("✅ Test user created:", user.email);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
