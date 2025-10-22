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

// === REGISTER ===
router.post("/register", async (req, res) => {
  try {
    const {
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

    // Basic validation
    if (!firstName || !lastName || !email || !password || !phone || !dob) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Validate accountType against enum
    const validTypes = ["SAVINGS", "CURRENT", "BUSINESS"];
    if (!validTypes.includes(accountType)) {
      return res.status(400).json({ error: "Invalid account type" });
    }

    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: "User with this email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Create User
    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        otherName,
        email,
        phone,
        address,
        dob: new Date(dob),
        securityQuestion,
        securityAnswer,
        password: hashedPassword,
        role: "CUSTOMER",
      },
    });

    // Generate and create account
    const accountNumber = generateAccountNumber();
    const account = await prisma.account.create({
      data: {
        accountNumber,
        userId: user.id,
        balance: 0, // default starting balance
        type: accountType, // ✅ now stored correctly
      },
    });

    res.json({
      message: "User registered successfully",
      user: {
        id: user.id,
        name: `${user.firstName} ${user.otherName ? user.otherName + " " : ""}${user.lastName}`,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
      account: {
        accountNumber: account.accountNumber,
        balance: account.balance,
        type: account.type,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
});


// === LOGIN ===
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  console.log("HIT /auth/login with:", req.body);

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { accounts: true }, // ✅ include accounts
    });
    console.log("Login attempt:", email, "Found user:", user);

    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    const account = user.accounts[0] || null;

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: `${user.firstName} ${user.otherName ? user.otherName + " " : ""}${user.lastName}`, // ✅ full name
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
      account: account
        ? {
            accountNumber: account.accountNumber,
            balance: account.balance,
          }
        : null,
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error during login" });
  }
});

export default router;
