import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  const accounts = await prisma.account.findMany();

  if (accounts.length === 0) {
    console.log("⚠️ No accounts found, skipping suspension seed");
    return;
  }

  const updated = await prisma.account.updateMany({
    where: {},
    data: {
      suspended: true,
      suspensionMessage:
        "Your account has been suspended. Please contact support.",
    },
  });

  console.log("✅ Suspended accounts:", updated.count);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
