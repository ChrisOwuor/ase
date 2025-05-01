const express = require("express");
const HelpRequest = require("../models/HelpRequest");
const helpRouter = express.Router();

// POST /apa/help - Submit a help request
helpRouter.post("/help", async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const helpRequest = new HelpRequest({ name, email, subject, message });
    await helpRequest.save();

    res.status(201).json({ message: "Help request submitted successfully." });
  } catch (error) {
    console.error("Error submitting help request:", error);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
});

// GET /apa/help - Fetch all help requests (for admin use)
helpRouter.get("/help", async (req, res) => {
  try {
    const helpRequests = await HelpRequest.find().sort({ createdAt: -1 });
    res.status(200).json(helpRequests);
  } catch (error) {
    console.error("Error fetching help requests:", error);
    res.status(500).json({ message: "Server error." });
  }
});

helpRouter.put("/help/:id/read", async (req, res) => {
  try {
    const helpRequest = await HelpRequest.findByIdAndUpdate(
      req.params.id,
      { status: "read" },
      { new: true }
    );

    if (!helpRequest) {
      return res.status(404).json({ message: "Help request not found" });
    }

    res.json({ message: "Marked as read", helpRequest });
  } catch (error) {
    console.error("Error marking as read:", error);
    res.status(500).json({ message: "Error marking help request as read" });
  }
});

module.exports = helpRouter;
