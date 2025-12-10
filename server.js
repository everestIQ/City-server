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
  "http://localhost:5173",
  "https://firstcityfinance.com",
  "https://www.firstcityfinance.com",
  "https://city-server-6geb.onrender.com", // <-- Render backend domain
  "https://city-front.onrender.com"
];

app.options("*", cors());

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (e.g. mobile apps, curl)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        console.log("❌ Blocked by CORS:", origin);
        return callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// ------------------ ROUTES ------------------
app.use("/auth", authRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/transactions", transactionRoutes);
app.use("/admin", adminRoutes);

// ✅ Test email route
app.get("/test-email", async (req, res) => {
  const result = await sendEmail(
    "your-email@gmail.com",
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
