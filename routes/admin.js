import express from "express";
import { authenticateAdmin } from "../middleware/authMiddleware.js";
import prisma from "../prismaClient.js";

const router = express.Router();

/* 🔒 Disable caching for ALL admin routes */
router.use((req, res, next) => {
  res.set({
    "Cache-Control": "no-store, no-cache, must-revalidate, private",
    Pragma: "no-cache",
    Expires: "0",
  });
  next();
});

// ✅ Fetch all users (with accounts & transactions)
router.get("/users", authenticateAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        accounts: {
          include: { transactions: true },
        },
        sentTransactions: {
          include: {
            account: true,
            receiver: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                otherName: true,
                email: true,
              },
            },
          },
        },
        receivedTransactions: {
          include: {
            account: true,
            sender: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                otherName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    res.json({ users });
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// ✅ Update user details
router.put("/users/:id", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, otherName, email } = req.body;

    await prisma.user.update({
      where: { id: parseInt(id) },
      data: { firstName, lastName, otherName, email },
    });

    res.json({ message: "User updated successfully" });
  } catch (err) {
    console.error("Error updating user:", err);
    res.status(500).json({ error: "Failed to update user" });
  }
});

// ✅ Change user role
router.put("/users/:id/role", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    await prisma.user.update({
      where: { id: parseInt(id) },
      data: { role },
    });

    res.json({ message: "Role updated successfully" });
  } catch (err) {
    console.error("Error updating role:", err);
    res.status(500).json({ error: "Failed to update role" });
  }
});

// ✅ Delete user
router.delete("/users/:id", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.user.delete({ where: { id: parseInt(id) } });
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    console.error("Error deleting user:", err);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

// ✅ Fetch all transactions
router.get("/transactions", authenticateAdmin, async (req, res) => {
  try {
    const transactions = await prisma.transaction.findMany({
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            otherName: true,
            email: true,
          },
        },
        receiver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            otherName: true,
            email: true,
          },
        },
        account: true,
      },
      orderBy: { timestamp: "desc" },
    });

    res.json({ transactions });
  } catch (err) {
    console.error("Error fetching transactions:", err);
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
});

// ✅ Update transaction
router.put("/transactions/:id", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, type } = req.body;

    await prisma.transaction.update({
      where: { id: parseInt(id) },
      data: { amount: parseFloat(amount), type },
    });

    res.json({ message: "Transaction updated successfully" });
  } catch (err) {
    console.error("Error updating transaction:", err);
    res.status(500).json({ error: "Failed to update transaction" });
  }
});

// ✅ Create transaction
router.post("/transactions", authenticateAdmin, async (req, res) => {
  try {
    const {
      userId,
      accountId,
      amount,
      type,
      method,
      status,
      bankAccount,
      receiverId,
    } = req.body;

    const newTx = await prisma.transaction.create({
      data: {
        senderId: userId ? parseInt(userId) : null,
        receiverId: receiverId ? parseInt(receiverId) : null,
        accountId: parseInt(accountId),
        amount: parseFloat(amount),
        type,
        method,
        status,
        bankAccount,
      },
    });

    if (status === "SUCCESS") {
      if (type === "DEPOSIT") {
        await prisma.account.update({
          where: { id: parseInt(accountId) },
          data: { balance: { increment: parseFloat(amount) } },
        });
      }

      if (type === "WITHDRAWAL") {
        await prisma.account.update({
          where: { id: parseInt(accountId) },
          data: { balance: { decrement: parseFloat(amount) } },
        });
      }

      if (type === "TRANSFER" && receiverId) {
        await prisma.account.update({
          where: { id: parseInt(accountId) },
          data: { balance: { decrement: parseFloat(amount) } },
        });

        const receiverAccount = await prisma.account.findFirst({
          where: { userId: parseInt(receiverId) },
        });

        if (receiverAccount) {
          await prisma.account.update({
            where: { id: receiverAccount.id },
            data: { balance: { increment: parseFloat(amount) } },
          });
        }
      }
    }

    res.json({ message: "Transaction created successfully", transaction: newTx });
  } catch (err) {
    console.error("Error creating transaction:", err);
    res.status(500).json({ error: "Failed to create transaction" });
  }
});

// ✅ Admin credit
router.post("/credit", authenticateAdmin, async (req, res) => {
  try {
    const { accountNumber, amount } = req.body;

    if (!accountNumber || !amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid input data" });
    }

    const account = await prisma.account.findUnique({
      where: { accountNumber },
    });

    if (!account) {
      return res.status(404).json({ message: "Account not found" });
    }

    const updated = await prisma.account.update({
      where: { id: account.id },
      data: { balance: { increment: parseFloat(amount) } },
    });

    await prisma.transaction.create({
      data: {
        amount: parseFloat(amount),
        type: "ADMIN_CREDIT",
        status: "SUCCESS",
        accountId: account.id,
        senderId: null,
        receiverId: account.userId,
        method: "ADMIN_PANEL",
        bankAccount: accountNumber,
      },
    });

    res.json({ message: "Account credited successfully", updated });
  } catch (err) {
    console.error("Error crediting account:", err);
    res.status(500).json({ message: "Failed to credit account" });
  }
});

// ✅ Add funds (SECURED)
router.post("/fund", authenticateAdmin, async (req, res) => {
  const { accountId, amount } = req.body;

  const acc = await prisma.account.update({
    where: { id: parseInt(accountId) },
    data: { balance: { increment: parseFloat(amount) } },
  });

  res.json({ message: `✅ Funded $${amount} to account ${acc.accountNumber}` });
});

// ✅ Suspend / Reactivate user accounts
router.patch("/users/:id/suspend", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { suspend, message } = req.body;

    await prisma.user.update({
      where: { id: parseInt(id) },
      data: { suspended: suspend },
    });

    await prisma.account.updateMany({
      where: { userId: parseInt(id) },
      data: {
        suspended: suspend,
        suspensionReason: suspend
          ? message || "Your account has been suspended. Please contact support."
          : null,
      },
    });

    res.json({
      message: suspend
        ? "🚫 User & accounts suspended"
        : "✅ User & accounts reactivated",
    });
  } catch (err) {
    console.error("Error suspending account:", err);
    res.status(500).json({ error: "Failed to update suspension status" });
  }
});

export default router;
