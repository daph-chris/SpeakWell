const express = require("express");
const Therapist = require("../models/Therapist");
const router = express.Router();

// Therapist signup
router.post("/signup", async (req, res) => {
  try {
    const { name, mobile, email, password } = req.body;
    const therapist = new Therapist({ name, mobile, email, password });
    await therapist.save();
    res.json({ message: "Therapist registered successfully!" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
