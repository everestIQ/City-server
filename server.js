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

// ✅ Enable CORS for frontend (Vite dev server runs on port 5173)
app.use(cors({
  origin: "http://localhost:5173", // allow frontend
  credentials: true,
}));

// Routes
app.use("/auth", authRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/transactions", transactionRoutes);
app.use("/admin", adminRoutes);

// ✅ Test email route
app.get("/test-email", async (req, res) => {
  const result = await sendEmail(
    "your-email@gmail.com", // <-- replace with your real email
    "✅ Test Email from First City Bank",
    "If you receive this, Resend is working!"
  );

  if (result.ok) {
    return res.json({ message: "✅ Test email sent successfully" });
  } else {
    return res.status(500).json({ error: "❌ Email failed", details: result.error });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
