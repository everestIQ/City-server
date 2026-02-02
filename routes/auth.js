// server/routes/auth.js
import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

const router = express.Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

// Helper: Generate 8-digit account number
function generateAccountNumber() {
  return Math.floor(10000000 + Math.random() * 90000000).toString();
}

/* =====================================================
   REGISTER
===================================================== */
router.post("/register", async (req, res) => {
  console.log("🟢 REGISTER HIT");
  console.log("Body:", req.body);

  try {
    let {
      firstName,
      lastName,
      otherName,
      email,
      phone,
      address,
      dob,
      accountType,
      securityQuestion,
      securityAnswer,
      password,
    } = req.body;

    // Normalize
    otherName = otherName || null;
    address = address || null;
    securityQuestion =
      securityQuestion || "What is your favorite color?";
    securityAnswer = securityAnswer || "blue";

    // Validation
    if (!firstName || !lastName || !email || !phone || !password) {
      return res.status(400).json({
        error: "firstName, lastName, email, phone and password are required",
      });
    }

    const parsedDob = new Date(dob);
    if (!dob || isNaN(parsedDob.getTime())) {
      return res.status(400).json({ error: "Invalid date of birth" });
    }

    const validTypes = ["SAVINGS", "CURRENT", "BUSINESS"];
    if (!validTypes.includes(accountType)) {
      return res.status(400).json({
        error: `Invalid account type. Must be one of ${validTypes.join(", ")}`,
      });
    }

    // Check existing user
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res
        .status(400)
        .json({ error: "User with this email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    /* ===============================
       TRANSACTION (CRITICAL FIX)
    ================================ */
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          firstName,
          lastName,
          otherName,
          email,
          phone,
          address,
          dob: parsedDob,
          password: hashedPassword,
          securityQuestion,
          securityAnswer,
          role: "CUSTOMER",
          accountType, // ✅ store on user
        },
      });

      const account = await tx.account.create({
        data: {
          accountNumber: generateAccountNumber(),
          userId: user.id,
          balance: 0,
          type: accountType,
        },
      });

      return { user, account };
    });

    console.log("✅ USER + ACCOUNT CREATED:", result.user.id);

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: result.user.id,
        name: `${result.user.firstName} ${
          result.user.otherName ? result.user.otherName + " " : ""
        }${result.user.lastName}`,
        email: result.user.email,
        phone: result.user.phone,
        role: result.user.role,
      },
      account: {
        accountNumber: result.account.accountNumber,
        balance: result.account.balance,
        type: result.account.type,
      },
    });
  } catch (error) {
    console.error("❌ REGISTRATION ERROR:", error);

    res.status(500).json({
      error: "Registration failed",
      details: error.message,
    });
  }
});

/* =====================================================
   LOGIN
===================================================== */
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  console.log("🔐 LOGIN HIT:", email);

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { accounts: true },
    });

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Ensure account exists
    let account = user.accounts[0] || null;

    if (!account) {
      account = await prisma.account.create({
        data: {
          accountNumber: generateAccountNumber(),
          userId: user.id,
          balance: 0,
          type: user.accountType || "SAVINGS",
        },
      });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: `${user.firstName} ${
          user.otherName ? user.otherName + " " : ""
        }${user.lastName}`,
        email: user.email,
        phone: user.phone,
        role: user.role,
        suspended: user.suspended,
        suspensionReason: user.suspensionReason,
        suspendedAt: user.suspendedAt,
      },
      account: {
        accountNumber: account.accountNumber,
        balance: account.balance,
        type: account.type,
      },
    });
  } catch (err) {
    console.error("❌ LOGIN ERROR:", err);
    res.status(500).json({ error: "Server error during login" });
  }
});

export default router;
