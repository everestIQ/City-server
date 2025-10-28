import express from "express";
import { PrismaClient } from "@prisma/client";
import authMiddleware from "../middleware/authMiddleware.js";

const prisma = new PrismaClient();
const router = express.Router();

// ✅ Get user dashboard
router.get("/", authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        accounts: {
          include: {
            transactions: {
              orderBy: { timestamp: "desc" },
            },
          },
        },
      },
    });

    if (!user) return res.status(404).json({ error: "User not found" });

    const account = user.accounts[0] || null;

    res.json({
      user: {
        id: user.id,
        name: `${user.firstName} ${user.otherName ? user.otherName + " " : ""}${user.lastName}`,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
      account: account
        ? {
            accountNumber: account.accountNumber,
            balance: account.balance,
          }
        : null,
      transactions: account ? account.transactions : [],
    });
  } catch (err) {
    console.error("Dashboard error:", err);
    res.status(500).json({ error: "Failed to fetch dashboard" });
  }
});

// ✅ Deposit
router.post("/deposit", authMiddleware, async (req, res) => {
  const { amount, description } = req.body;
  if (amount <= 0) return res.status(400).json({ error: "Invalid amount" });

  const account = await prisma.account.findFirst({ where: { userId: req.user.id } });
  if (!account) return res.status(404).json({ error: "Account not found" });

  const updated = await prisma.account.update({
    where: { id: account.id },
    data: { balance: { increment: amount } },
  });

  await prisma.transaction.create({
    data: {
      accountId: account.id,
      type: "CREDIT", // ✅ unified
      amount,
      description: description || "Deposit",
    },
  });

  res.json({ message: "Deposit successful", balance: updated.balance });
});

// ✅ Withdraw
router.post("/withdraw", authMiddleware, async (req, res) => {
  const { amount, description } = req.body;
  if (amount <= 0) return res.status(400).json({ error: "Invalid amount" });

  const account = await prisma.account.findFirst({ where: { userId: req.user.id } });
  if (!account) return res.status(404).json({ error: "Account not found" });

  if (account.balance < amount)
    return res.status(400).json({ error: "Insufficient funds" });

  const updated = await prisma.account.update({
    where: { id: account.id },
    data: { balance: { decrement: amount } },
  });

  await prisma.transaction.create({
    data: {
      accountId: account.id,
      type: "DEBIT", // ✅ unified
      amount,
      description: description || "Withdrawal",
    },
  });

  res.json({ message: "Withdrawal successful", balance: updated.balance });
});

// ✅ Transfer (Supports Local & International, external banks included)
router.post("/transfer", authMiddleware, async (req, res) => {
  const {
    transferType,
    amount,
    bankName,
    accountNumber,
    recipientEmail,
    recipientName,
    iban,
    swiftCode,
    currency = "USD",
  } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: "Invalid amount" });
  }

  // ✅ Find sender account
  const sender = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: { accounts: true },
  });
  if (!sender) return res.status(404).json({ error: "Sender not found" });

  const senderAccount = sender.accounts[0];
  if (!senderAccount) return res.status(404).json({ error: "Sender account not found" });

  if (senderAccount.balance < amount) {
    return res.status(400).json({ error: "Insufficient funds" });
  }

  // ✅ Deduct from sender (ALWAYS allowed, no recipient lookup required)
  const updatedSenderAccount = await prisma.account.update({
    where: { id: senderAccount.id },
    data: { balance: { decrement: amount } },
  });

  // ✅ Log transaction as EXTERNAL TRANSFER
  await prisma.transaction.create({
    data: {
      accountId: senderAccount.id,
      type: "TRANSFER",
      amount,
      description:
        transferType === "INTL"
          ? `International Transfer to ${recipientName} (${bankName}) - SWIFT: ${swiftCode}, IBAN: ${iban}, Currency: ${currency}`
          : `Local Transfer to Account ${accountNumber} (${bankName})`,
    },
  });

  return res.json({
    message: "✅ Transfer successful",
    remainingBalance: updatedSenderAccount.balance,
  });
});

export default router;
