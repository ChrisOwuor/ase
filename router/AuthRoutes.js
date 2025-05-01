const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User.model");
const FarmerAccount = require("../models/FarmerAccount");
require("dotenv").config();

const authRoute = express.Router();

// User Registration
authRoute.post("/register", async (req, res) => {
  try {
    const { name, email, password, role, phoneNumber } = req.body;

    if (!name || !email || !password || !phoneNumber) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Check if the email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Email already in use" });
    }

    // Create User
    const newUser = new User({ name, email, password, role, phoneNumber });
    const savedUser = await newUser.save();

    // After creating a farmer, create a FarmerAccount if role is farmer
    if (role === "farmer") {
      await FarmerAccount.create({ farmer: savedUser._id });
    }

    savedUser.password = undefined; // Don't send the password in the response
    res
      .status(201)
      .json({ message: "User registered successfully", user: savedUser });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Registration failed" });
  }
});


// User Login
authRoute.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return next({ status: 400, message: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password." });
    }
    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, name: user.name, role: user.role, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );
    res.json({ message: "Login successful", token, role: user.role });
  } catch (error) {
    console.error("Login error:", error);
    next(error);
  }
});

module.exports = authRoute;
