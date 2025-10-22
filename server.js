import express from "express";
import dotenv from "dotenv";
import cors from "cors";

import authRoutes from "./routes/auth.js";
import dashboardRoutes from "./routes/dashboard.js";
import transactionRoutes from "./routes/transactions.js";
import adminRoutes from "./routes/admin.js";

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

app.listen(5000, () => console.log("Server running on http://localhost:5000"));
