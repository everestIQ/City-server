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

/* ✅ BODY PARSERS (CRITICAL) */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ✅ CORS */
const allowedOrigins = [
  "http://localhost:5173",
  "https://city-front.onrender.com",
  "https://firstcityfinance.com",
  "https://www.firstcityfinance.com",
];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

/* ✅ HARD TEST ROUTES */
app.get("/", (req, res) => {
  res.json({ message: "Backend is running 🚀" });
});

app.get("/health", (req, res) => {
  res.send("OK");
});

/* ------------------ ROUTES ------------------ */
app.use("/auth", authRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/transactions", transactionRoutes);
app.use("/admin", adminRoutes);

/* ------------------ EMAIL TEST ------------------ */
app.get("/test-email", async (req, res) => {
  const result = await sendEmail(
    process.env.EMAIL_FROM,
    "✅ Test Email from First City Bank",
    "If you received this, your email system is working!"
  );

  if (result.ok) {
    res.json({ message: "Email sent successfully" });
  } else {
    res.status(500).json({
      error: "Email failed",
      details: result.error,
    });
  }
});

/* ------------------ START SERVER ------------------ */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
