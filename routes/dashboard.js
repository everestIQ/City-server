import express from "express";
import { PrismaClient } from "@prisma/client";
import authMiddleware from "../middleware/authMiddleware.js";
import { sendEmail } from "../utils/sendEmail.js";

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

  const tx = await prisma.transaction.create({
    data: {
      accountId: account.id,
      type: "CREDIT",
      amount,
      description: description || "Deposit",
    },
  });

  // ✅ Notify Customer
  await sendEmail(
    req.user.email,
    "Deposit Receipt - First City Bank",
    `Hello ${req.user.firstName},\n\nYour deposit of $${amount.toFixed(2)} was successful.\n\nNew Balance: $${updated.balance.toFixed(2)}\nTransaction ID: ${tx.id}\nDate: ${new Date().toLocaleString()}`
  );

  res.json({ message: "Deposit successful", balance: updated.balance });
});


// ✅ Withdraw
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

  const tx = await prisma.transaction.create({
    data: {
      accountId: account.id,
      type: "DEBIT",
      amount,
      description: description || "Withdrawal",
    },
  });

  // ✅ Notify Customer
  await sendEmail(
    req.user.email,
    "Withdrawal Notification - First City Bank",
    `Hello ${req.user.firstName},\n\nYou withdrew $${amount.toFixed(2)}.\n\nRemaining Balance: $${updated.balance.toFixed(2)}\nTransaction ID: ${tx.id}\nDate: ${new Date().toLocaleString()}`
  );

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

  // ✅ Deduct from sender
  const updatedSenderAccount = await prisma.account.update({
    where: { id: senderAccount.id },
    data: { balance: { decrement: amount } },
  });

  // ✅ Record transfer transaction
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

  // ✅ Notify sender
 const senderRemaining = updatedSenderAccount.balance;

await sendEmail(
  sender.email,
  "Transfer Receipt — First City Bank",
  `Hello ${sender.firstName},

Your transfer of ${currency} ${amount} was successfully processed.

Details:
- Transfer Type: ${transferType}
- Bank: ${bankName || "N/A"}
- Destination Account: ${transferType === "LOCAL" ? accountNumber : "N/A"}
- Time: ${new Date().toLocaleString()}
- Remaining Balance: ${senderRemaining.toFixed(2)}

Thank you for banking with First City Bank.`,
  {
    // optional HTML receipt (simple example)
    html: `
      <div style="font-family: Inter, system-ui, Arial; max-width:600px;">
        <h2 style="color:#0d6efd">First City Bank — Transfer Receipt</h2>
        <p>Hello ${sender.firstName},</p>
        <p>Your transfer of <strong>${currency} ${amount}</strong> was processed successfully.</p>
        <ul>
          <li><strong>Transfer Type:</strong> ${transferType}</li>
          <li><strong>Bank:</strong> ${bankName || "N/A"}</li>
          <li><strong>Destination:</strong> ${transferType === "LOCAL" ? accountNumber : "N/A"}</li>
          <li><strong>Time:</strong> ${new Date().toLocaleString()}</li>
          <li><strong>Remaining Balance:</strong> ${senderRemaining.toFixed(2)}</li>
        </ul>
        <p style="color:#6c757d; font-size:0.9rem;">If you didn't authorize this transfer, contact support immediately.</p>
      </div>
    `,
  }
);
  // ✅ Notify recipient ONLY if `recipientEmail` exists (Local transfers only)
  if (recipientEmail) {
  await sendEmail(
    recipientEmail,
    "You received a payment — First City Bank",
    `Hello ${recipientName || "Customer"},

You have received ${currency} ${amount} from ${sender.firstName} ${sender.lastName}.

Time: ${new Date().toLocaleString()}

Thank you.`
  );
}

  return res.json({
    message: "✅ Transfer successful",
    remainingBalance: updatedSenderAccount.balance,
  });
});


export default router;
