import express from "express";
import { PrismaClient } from "@prisma/client";
import authMiddleware from "../middleware/authMiddleware.js";
import { sendEmail } from "../services/sendEmail.js";
import crypto from "crypto";
import { sendDepositAlert } from "../services/email.js";


const prisma = new PrismaClient();
const router = express.Router();

// Utility to generate transaction reference
function generateReferenceId() {
  return "TRX-" + crypto.randomBytes(3).toString("hex").toUpperCase();
}

// =======================
// ✅ GET DASHBOARD
// =======================
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

    // 🔍 DEBUG (can remove later)
    console.log("DASHBOARD ACCOUNT:", {
      id: account?.id,
      suspended: account?.suspended,
      suspensionMessage: account?.suspensionMessage,
    });

    console.log("DASHBOARD USER:", {
      id: user.id,
      suspended: user.suspended,
    });

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
            id: account.id,
            accountNumber: account.accountNumber,
            balance: account.balance,
            suspended: account.suspended, // ✅ now meaningful
            suspensionMessage: account.suspensionMessage,
            createdAt: account.createdAt,
          }
        : null,
      transactions: account ? account.transactions : [],
    });
  } catch (err) {
    console.error("Dashboard error:", err);
    res.status(500).json({ error: "Failed to fetch dashboard" });
  }
});

// =======================
// ✅ DEPOSIT (ALLOWED EVEN IF SUSPENDED)
// =======================
router.post("/deposit", authMiddleware, async (req, res) => {
  const { amount, description } = req.body;
  const transferAmount = Number(amount);

if (isNaN(transferAmount) || transferAmount <= 0) {
  return res.status(400).json({
    error: "Invalid amount",
  });
}

  const account = await prisma.account.findFirst({
    where: { userId: req.user.id },
  });

  if (!account) return res.status(404).json({ error: "Account not found" });

  const updated = await prisma.account.update({
    where: { id: account.id },
    data: { balance: { increment: transferAmount } },
  });

  const referenceId = generateReferenceId();

  await prisma.transaction.create({
    data: {
      accountId: account.id,
      type: "CREDIT",
      amount: transferAmount,
      description: description || "Deposit",
      referenceId,
    },
  });

  sendEmail(
    req.user.email,
    "Deposit Receipt - First City Bank",
    `Hello ${req.user.firstName},

Your deposit of $${transferAmount.toFixed(2)} was successful.

Reference: ${referenceId}
New Balance: $${updated.balance.toFixed(2)}
Date: ${new Date().toLocaleString()}`
  ).catch(console.error);

const user = await prisma.user.findUnique({
  where: { id: req.user.id },
});
  //  send deposit alert email
  sendDepositAlert(user, transferAmount).catch(console.error);

  res.json({ message: "Deposit successful", balance: updated.balance });
});

// =======================
// 🔒 WITHDRAW (BLOCK IF SUSPENDED)
// =======================
router.post("/withdraw", authMiddleware, async (req, res) => {
  const { amount, description } = req.body;
  if (amount <= 0) return res.status(400).json({ error: "Invalid amount" });

  const account = await prisma.account.findFirst({
    where: { userId: req.user.id },
  });

  if (!account) return res.status(404).json({ error: "Account not found" });

  // 🔒 SUSPENSION CHECK
  if (account.suspended) {
    return res.status(403).json({
      error: "Account suspended",
      message:
        account.suspensionMessage ||
        "Your account is suspended. Withdrawals are disabled.",
    });
  }

  if (account.balance < transferAmount)
    return res.status(400).json({ error: "Insufficient funds" });

  const updated = await prisma.account.update({
    where: { id: account.id },
    data: { balance: { decrement: transferAmount } },
  });

  const referenceId = generateReferenceId();

  await prisma.transaction.create({
    data: {
      accountId: account.id,
      type: "DEBIT",
      amount: transferAmount,
      description: description || "Withdrawal",
      referenceId,
    },
  });

  sendEmail(
    req.user.email,
    "Withdrawal Notification - First City Bank",
    `Hello ${req.user.firstName},

You withdrew $${amount.toFixed(2)}.

Reference: ${referenceId}
Remaining Balance: $${updated.balance.toFixed(2)}
Date: ${new Date().toLocaleString()}`
  ).catch(console.error);

  res.json({ message: "Withdrawal successful", balance: updated.balance });
});

// =======================
// 🔒 TRANSFER (BLOCK IF SUSPENDED)
// =======================
router.post("/transfer", authMiddleware, async (req, res) => {
  try {
  const {
  transferType,
  amount,
  bankName,
  accountNumber,
  recipientEmail,
  recipientName,
  recipientAddress,
  bankAddress,
  iban,
  swiftCode,
  routingNumber,
  purpose,
  remark,
  currency = "USD",
} = req.body;

  const transferAmount = Number(amount);

  if (isNaN(transferAmount) || transferAmount <= 0) {
  return res.status(400).json({
    error: "Invalid amount",
  });
  }

//  transfer validation
  if (transferType === "LOCAL") {

  if (!bankName || !accountNumber) {
    return res.status(400).json({
      error: "Bank name and account number are required",
    });
  }

}

if (transferType === "INTL") {

  if (!bankName || !iban || !swiftCode) {
    return res.status(400).json({
      error: "IBAN and SWIFT required",
    });
  }

}

  const sender = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: { accounts: true },
  });


  if (!sender) return res.status(404).json({ error: "Sender not found" });

  const senderAccount = sender.accounts[0];
  if (!senderAccount)
    return res.status(404).json({ error: "Sender account not found" });

  // 🔒 SUSPENSION CHECK
  if (senderAccount.suspended) {
    return res.status(403).json({
      error: "Account suspended",
      message:
        senderAccount.suspensionMessage ||
        "Your account is suspended. Transfers are disabled.",
    });
  }

  if (senderAccount.balance < transferAmount)
    return res.status(400).json({ error: "Insufficient funds" });

  const updatedSenderAccount = await prisma.account.update({
    where: { id: senderAccount.id },
    data: { balance: { decrement: transferAmount } },
  });

  const referenceId = generateReferenceId();

  await prisma.transaction.create({
    data: {
      accountId: senderAccount.id,
      type: "TRANSFER",
      amount: transferAmount,
      referenceId,
      description:
        transferType === "INTL"
    ? `INTL_TRANSFER:${recipientName}:${bankName}:${currency}:${amount}`
          : `Local Transfer to Account ${accountNumber} (${bankName})`,
    },
  });

  sendEmail(
    sender.email,
    "Transfer Receipt — First City Bank",
    `Hello ${sender.firstName},

Your transfer of ${currency} ${amount} was processed.

Reference: ${referenceId}
Remaining Balance: ${Number(updatedSenderAccount.balance).toFixed(2)}
Date: ${new Date().toLocaleString()}`
  ).catch(console.error);;

  const isValidEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

if (accountNumber) {
  const recipientAccount = await prisma.account.findUnique({
    where: { accountNumber },
    include: { user: true },
  });

  if (recipientAccount?.user) {
    await sendEmail(
      recipientAccount.user.email,
      "You received a payment — First City Bank",
      `Hello ${recipientAccount.user.firstName},

You have received ${currency} ${transferAmount}.
Reference: ${referenceId}
Date: ${new Date().toLocaleString()}`
    ).catch(console.error);
  }
}

// //  send transfer alert email
sendSuspensionEmail(
  sender,
  "Suspicious account activity detected."
).catch(console.error);

sendReactivationEmail(sender).catch(console.error);

  res.json({
    message: "✅ Transfer successful",
    remainingBalance: updatedSenderAccount.balance,
    referenceId,
  }); 

    } catch (err) {
     console.error(err);

     return res.status(500).json({
       error: "Transfer failed",
     });
  }
});

export default router;
