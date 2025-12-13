import express from "express";
import dotenv from "dotenv";
import cors from "cors";

import authRoutes from "./routes/auth.js";
import dashboardRoutes from "./routes/dashboard.js";
import transactionRoutes from "./routes/transactions.js";
import adminRoutes from "./routes/admin.js";
import { sendEmail } from "./utils/sendEmail.js";

dotenv.config();
const app = express();

app.use(express.json());

// ✅ Allow frontend + backend domains
const allowedOrigins = [
  "http://localhost:5173",               // local dev
  "https://city-front.onrender.com",     // Render front
  "https://firstcityfinance.com",        // Custom domain
  "https://www.firstcityfinance.com"
];

// Simplified CORS for production + dev
app.use(cors({
  origin: allowedOrigins,
  credentials: true,  // Allow cookies and auth headers
}));

// ✅ Root route for testing backend
app.get("/", (req, res) => {
  res.json({ message: "Backend is running 🚀" });
});

// ------------------ ROUTES ------------------
app.use("/auth", authRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/transactions", transactionRoutes);
app.use("/admin", adminRoutes);

// ✅ Test email route
app.get("/test-email", async (req, res) => {
  const result = await sendEmail(
    process.env.EMAIL_FROM, // Make sure EMAIL_FROM is set
    "✅ Test Email from First City Bank",
    "If you received this, your email system is working!"
  );

  if (result.ok) {
    return res.json({ message: "Email sent successfully" });
  } else {
    return res.status(500).json({
      error: "Email failed",
      details: result.error,
    });
  }
});

// ------------------ START SERVER ------------------
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
