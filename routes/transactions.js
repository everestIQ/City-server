import express from "express";
import prisma from "../prismaClient.js";
import { authenticateToken } from "../middleware/auth.js";
import { v4 as uuidv4 } from "uuid";

const router = express.Router();

// Helper to generate unique reference ID
const generateRef = () => uuidv4();

// 🔐 Helper: check if ACCOUNT is suspended
async function checkAccountSuspension(accountId, userId) {
  const account = await prisma.account.findUnique({
    where: { id: Number(accountId) },
    select: {
      id: true,
      userId: true,
      suspended: true,
      suspensionMessage: true,
      balance: true,
    },
  });

  if (!account) return { error: "Account not found" };
  if (account.userId !== userId) return { error: "Unauthorized account access" };

  return account;
}

// =====================
// Deposit (ALLOWED even if suspended)
// =====================
router.post("/:accountId/deposit", authenticateToken, async (req, res) => {
  try {
    const { accountId } = req.params;
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    const account = await checkAccountSuspension(accountId, req.user.id);
    if (account?.error) return res.status(403).json({ error: account.error });

    const updatedAccount = await prisma.account.update({
      where: { id: account.id },
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

// =====================
// Withdraw (BLOCK IF ACCOUNT SUSPENDED)
// =====================
router.post("/:accountId/withdraw", authenticateToken, async (req, res) => {
  try {
    const { amount } = req.body;
    const { accountId } = req.params;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    const account = await checkAccountSuspension(accountId, req.user.id);
    if (account?.error) return res.status(403).json({ error: account.error });

    if (account.suspended) {
      return res.status(403).json({
        error: "Account suspended",
        message:
          account.suspensionMessage ||
          "Your account is suspended. Withdrawals are disabled.",
      });
    }

    if (account.balance < amount) {
      return res.status(400).json({ error: "Insufficient funds" });
    }

    const updated = await prisma.account.update({
      where: { id: account.id },
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

// =====================
// Transfer (BLOCK IF ACCOUNT SUSPENDED)
// =====================
router.post("/:fromId/transfer/:toId", authenticateToken, async (req, res) => {
  try {
    const { amount } = req.body;
    const { fromId, toId } = req.params;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    const fromAccount = await checkAccountSuspension(fromId, req.user.id);
    if (fromAccount?.error)
      return res.status(403).json({ error: fromAccount.error });

    if (fromAccount.suspended) {
      return res.status(403).json({
        error: "Account suspended",
        message:
          fromAccount.suspensionMessage ||
          "Your account is suspended. Transfers are disabled.",
      });
    }

    if (fromAccount.balance < amount) {
      return res.status(400).json({ error: "Insufficient funds" });
    }

    const toAccount = await prisma.account.findUnique({
      where: { id: Number(toId) },
    });
    if (!toAccount)
      return res.status(404).json({ error: "Recipient account not found" });

    const referenceId = generateRef();

    const [updatedFrom, updatedTo] = await prisma.$transaction([
      prisma.account.update({
        where: { id: fromAccount.id },
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

    res.json({
      message: "Transfer successful",
      from: updatedFrom,
      to: updatedTo,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Transfer failed" });
  }
});

export default router;
