const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User.model");
require("dotenv").config();
const Address = require("../models/Address.model");

const userRouter = express.Router();

// Get all users (for admin or privileged access)
userRouter.get("/", async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Update User
userRouter.put("/", async (req, res) => {
  try {
    const { name, phoneNumber, street, town, county, newPassword } = req.body;

    // Find and update the user
    const user = req.user;

    if (name) user.name = name;
    if (phoneNumber) user.phoneNumber = phoneNumber;
    if (newPassword) user.password = newPassword; // No need to hash, handled in pre-save

    await user.save(); // Save updated user

    // Find and update the address, or create if not exists
    await Address.findOneAndUpdate(
      { userId: req.user._id }, // Find by user ID
      { street, town, county }, // Update fields
      { new: true, upsert: true } // Create if not found
    );

    res.json({ message: "User updated successfully", user });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({ error: "Failed to update user" });
  }
});

// Delete User
userRouter.delete("/:id", async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ error: "Failed to delete user" });
  }
});
// Get User and Address Details
userRouter.get("/user", async (req, res) => {
  try {
    const user = req.user;
    user.password = undefined; // The logged-in user

    const address = await Address.findOne({ userId: user._id });
    res.json({
      user,
      address: address ? address : "No address found for this user.",
      addressAvailable: !!address,
    });
  } catch (error) {
    console.error("Error fetching user and address details:", error);
    res.status(500).json({ error: "Failed to fetch user and address details" });
  }
});

module.exports = userRouter;
