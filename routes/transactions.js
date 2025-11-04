import express from "express";
import prisma from "../prismaClient.js";
import { authenticateToken } from "../middleware/auth.js";
import { v4 as uuidv4 } from "uuid";

const router = express.Router();

// Helper to generate unique reference ID
const generateRef = () => uuidv4();

// Deposit
router.post("/:accountId/deposit", authenticateToken, async (req, res) => {
  try {
    const { accountId } = req.params;
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    const account = await prisma.account.findUnique({
      where: { id: Number(accountId) },
    });

    if (!account) return res.status(404).json({ message: "Account not found" });
    if (account.userId !== req.user.id)
      return res.status(403).json({ message: "Not authorized for this account" });

    const updatedAccount = await prisma.account.update({
      where: { id: Number(accountId) },
      data: { balance: { increment: amount } },
    });

    await prisma.transaction.create({
      data: {
        amount,
        type: "CREDIT",
        accountId: account.id,
        referenceId: generateRef(),
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

    const account = await prisma.account.findUnique({
      where: { id: Number(accountId) },
    });

    if (!account) return res.status(404).json({ error: "Account not found" });
    if (account.userId !== req.user.id)
      return res.status(403).json({ error: "Unauthorized account access" });

    if (account.balance < amount)
      return res.status(400).json({ error: "Insufficient funds" });

    const updated = await prisma.account.update({
      where: { id: Number(accountId) },
      data: {
        balance: { decrement: amount },
        transactions: {
          create: {
            amount,
            type: "DEBIT",
            referenceId: generateRef(),
          },
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

    const fromAccount = await prisma.account.findUnique({
      where: { id: Number(fromId) },
    });

    if (!fromAccount) return res.status(404).json({ error: "Sender account not found" });
    if (fromAccount.userId !== req.user.id)
      return res.status(403).json({ error: "Unauthorized account access" });

    if (fromAccount.balance < amount)
      return res.status(400).json({ error: "Insufficient funds" });

    const referenceId = generateRef();

    const [updatedFrom, updatedTo] = await prisma.$transaction([
      prisma.account.update({
        where: { id: Number(fromId) },
        data: {
          balance: { decrement: amount },
          transactions: {
            create: { amount, type: "TRANSFER", referenceId },
          },
        },
      }),
      prisma.account.update({
        where: { id: Number(toId) },
        data: {
          balance: { increment: amount },
          transactions: {
            create: { amount, type: "TRANSFER", referenceId },
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
