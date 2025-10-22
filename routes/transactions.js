import express from "express";
import prisma from "../prismaClient.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// Deposit
router.post("/:accountId/deposit", authenticateToken, async (req, res) => {
  try {
    const { accountId } = req.params;
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    // Make sure the account belongs to the logged-in user
    const account = await prisma.account.findUnique({
      where: { id: parseInt(accountId) },
    });

    if (!account) {
      return res.status(404).json({ message: "Account not found" });
    }

    if (account.userId !== req.user.id) {
      return res.status(403).json({ message: "Not authorized for this account" });
    }

    // Update balance
    const updatedAccount = await prisma.account.update({
      where: { id: parseInt(accountId) },
      data: { balance: { increment: amount } },
    });

    // Log transaction
    await prisma.transaction.create({
      data: {
        amount,
        type: "DEPOSIT",
        accountId: account.id,
      },
    });

    res.json({ message: "Deposit successful", account: updatedAccount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Something went wrong" });
  }
});
// Withdraw
router.post("/:accountId/withdraw", authenticateToken, async (req, res) => {
  try {
    const { amount } = req.body;
    const { accountId } = req.params;

    const account = await prisma.account.findUnique({ where: { id: parseInt(accountId) } });

    if (!account || account.balance < amount) {
      return res.status(400).json({ error: "Insufficient funds" });
    }

    const updated = await prisma.account.update({
      where: { id: parseInt(accountId) },
      data: {
        balance: { decrement: amount },
        transactions: {
          create: { amount, type: "WITHDRAWAL" },
        },
      },
      include: { transactions: true },
    });

    res.json({ message: "Withdrawal successful", account: updated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Withdrawal failed" });
  }
});

// Transfer
router.post("/:fromId/transfer/:toId", authenticateToken, async (req, res) => {
  try {
    const { amount } = req.body;
    const { fromId, toId } = req.params;

    const fromAccount = await prisma.account.findUnique({ where: { id: parseInt(fromId) } });

    if (!fromAccount || fromAccount.balance < amount) {
      return res.status(400).json({ error: "Insufficient funds" });
    }

    // transaction to ensure consistency
    const [updatedFrom, updatedTo] = await prisma.$transaction([
      prisma.account.update({
        where: { id: parseInt(fromId) },
        data: {
          balance: { decrement: amount },
          transactions: {
            create: { amount, type: "TRANSFER" },
          },
        },
      }),
      prisma.account.update({
        where: { id: parseInt(toId) },
        data: {
          balance: { increment: amount },
          transactions: {
            create: { amount, type: "TRANSFER" },
          },
        },
      }),
    ]);

    res.json({ message: "Transfer successful", from: updatedFrom, to: updatedTo });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Transfer failed" });
  }
});

export default router;
