import express from "express";
const router = express.Router();

// For now we just log, later we can save in DB
router.post("/", async (req, res) => {
  try {
    const { name, email, message } = req.body;
    console.log("📩 Contact form:", { name, email, message });
    res.json({ success: true, message: "Message received" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
