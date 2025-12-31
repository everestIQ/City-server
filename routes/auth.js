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
  // 🔴 TEMP DEBUG LOG (ADD THIS)
  console.log("🟢 REGISTER HIT");
  console.log("Method:", req.method);
  console.log("URL:", req.originalUrl);
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


    // ---------- Normalize empty strings ----------
    otherName = otherName || null;
    address = address || null;
    securityQuestion = securityQuestion || "What is your favorite color?";
    securityAnswer = securityAnswer || "blue";

    // ---------- Basic validation ----------
    if (!firstName || !lastName || !email || !password || !phone) {
      return res.status(400).json({
        error: "firstName, lastName, email, phone and password are required",
      });
    }

    // ---------- DOB validation ----------
    const parsedDob = dob ? new Date(dob) : null;
    if (!parsedDob || isNaN(parsedDob.getTime())) {
      return res.status(400).json({ error: "Invalid or missing date of birth" });
    }

    // ---------- Account type validation ----------
    const validTypes = ["SAVINGS", "CURRENT", "BUSINESS"];
    if (!validTypes.includes(accountType)) {
      return res.status(400).json({
        error: `Invalid account type. Must be one of ${validTypes.join(", ")}`,
      });
    }

    // ---------- Check existing user ----------
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res
        .status(400)
        .json({ error: "User with this email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // ---------- Create user ----------
    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        otherName,
        email,
        phone,
        address,
        dob: parsedDob,
        securityQuestion,
        securityAnswer,
        password: hashedPassword,
        role: "CUSTOMER",
      },
    });

    // ---------- Create account ----------
    const account = await prisma.account.create({
      data: {
        accountNumber: generateAccountNumber(),
        userId: user.id,
        balance: 0,
        type: accountType,
      },
    });

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user.id,
        name: `${user.firstName} ${
          user.otherName ? user.otherName + " " : ""
        }${user.lastName}`,
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
  }  catch (error) {
  console.error("❌ REGISTRATION ERROR FULL:", error);
  console.error("❌ ERROR MESSAGE:", error.message);
  console.error("❌ ERROR STACK:", error.stack);

  return res.status(500).json({
    message: "Registration failed",
    error: error.message,
  });
  }
});



// === LOGIN ===
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  console.log("HIT /auth/login with:", req.body);

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

    // ✅ ENSURE ACCOUNT EXISTS
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
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error during login" });
  }
});


export default router;
