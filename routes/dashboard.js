import express from "express";
import { PrismaClient } from "@prisma/client";
import authMiddleware from "../middleware/authMiddleware.js";
import { sendEmail } from "../utils/sendEmail.js";
import crypto from "crypto"; // ✅ Add this

const prisma = new PrismaClient();
const router = express.Router();

// Utility to generate transaction reference
function generateReferenceId() {
  return "TRX-" + crypto.randomBytes(3).toString("hex").toUpperCase();
}

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

  const referenceId = generateReferenceId();

  const tx = await prisma.transaction.create({
    data: {
      accountId: account.id,
      type: "CREDIT",
      amount,
      description: description || "Deposit",
      referenceId, // ✅ ADDED
    },
  });

  await sendEmail(
    req.user.email,
    "Deposit Receipt - First City Bank",
    `Hello ${req.user.firstName},

Your deposit of $${amount.toFixed(2)} was successful.

Reference: ${referenceId}
New Balance: $${updated.balance.toFixed(2)}
Date: ${new Date().toLocaleString()}`
  );

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

  const referenceId = generateReferenceId();

  const tx = await prisma.transaction.create({
    data: {
      accountId: account.id,
      type: "DEBIT",
      amount,
      description: description || "Withdrawal",
      referenceId, // ✅ ADDED
    },
  });

  await sendEmail(
    req.user.email,
    "Withdrawal Notification - First City Bank",
    `Hello ${req.user.firstName},

You withdrew $${amount.toFixed(2)}.

Reference: ${referenceId}
Remaining Balance: $${updated.balance.toFixed(2)}
Date: ${new Date().toLocaleString()}`
  );

  res.json({ message: "Withdrawal successful", balance: updated.balance });
});

// ✅ Transfer
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

  if (!amount || amount <= 0)
    return res.status(400).json({ error: "Invalid amount" });

  const sender = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: { accounts: true },
  });
  if (!sender) return res.status(404).json({ error: "Sender not found" });

  const senderAccount = sender.accounts[0];
  if (!senderAccount) return res.status(404).json({ error: "Sender account not found" });

  if (senderAccount.balance < amount)
    return res.status(400).json({ error: "Insufficient funds" });

  const updatedSenderAccount = await prisma.account.update({
    where: { id: senderAccount.id },
    data: { balance: { decrement: amount } },
  });

  const referenceId = generateReferenceId(); // ✅

  await prisma.transaction.create({
    data: {
      accountId: senderAccount.id,
      type: "TRANSFER",
      amount,
      referenceId, // ✅ ADDED
      description:
        transferType === "INTL"
          ? `International Transfer to ${recipientName} (${bankName}) - SWIFT: ${swiftCode}, IBAN: ${iban}, Currency: ${currency}`
          : `Local Transfer to Account ${accountNumber} (${bankName})`,
    },
  });

  await sendEmail(
    sender.email,
    "Transfer Receipt — First City Bank",
    `Hello ${sender.firstName},

Your transfer of ${currency} ${amount} was processed.

Reference: ${referenceId}
Remaining Balance: ${updatedSenderAccount.balance.toFixed(2)}
Date: ${new Date().toLocaleString()}`
  );

  if (recipientEmail) {
    await sendEmail(
      recipientEmail,
      "You received a payment — First City Bank",
      `Hello ${recipientName || "Customer"},

You have received ${currency} ${amount}.
Reference: ${referenceId}
Date: ${new Date().toLocaleString()}`
    );
  }

  return res.json({
    message: "✅ Transfer successful",
    remainingBalance: updatedSenderAccount.balance,
    referenceId,
  });
});

export default router;
