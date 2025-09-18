const express = require("express");
const router = express.Router();
const Damage = require("../models/Damages"); // example mongoose model

// Example route
router.get("/fetch-damages", async (req, res) => {
  try {
    const damages = await Damage.find();
    res.json(damages);
  } catch (error) {
    console.error("Error fetching damages:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
