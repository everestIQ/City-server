import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Example: suspend ALL accounts for testing
  const result = await prisma.account.updateMany({
    data: {
      suspended: true,
      suspensionMessage:
        "Your account has been suspended. Please contact support.",
    },
  });

  console.log(`✅ Suspended ${result.count} accounts`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

