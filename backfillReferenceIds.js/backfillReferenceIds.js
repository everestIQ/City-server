import prisma from "../prismaClient.js";
import { v4 as uuid } from "uuid";

async function main() {
  const transactions = await prisma.transaction.findMany({
    where: { referenceId: null },
  });

  for (const tx of transactions) {
    await prisma.transaction.update({
      where: { id: tx.id },
      data: { referenceId: uuid() },
    });
  }

  console.log("✅ Backfill complete!");
  process.exit(0);
}

main();
