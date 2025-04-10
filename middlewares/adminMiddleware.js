const jwt = require("jsonwebtoken");
const User = require("../models/User.model");

// Middleware to verify admin access
const adminMiddleware = async (req, res, next) => {
    try {
        const token = req.header("Authorization").replace("Bearer ", "");
        if (!token) return res.status(401).json({ message: "Access denied. No token provided." });

        const decoded = jwt.verify(token, "SECRET_KEY"); // Replace with your secret key
        const user = await User.findById(decoded.id);

        if (!user || user.role !== "admin") {
            return res.status(403).json({ message: "Access denied. Admin privileges required." });
        }

        req.user = user; // Add user info to the request object
        next();
    } catch (error) {
        res.status(401).json({ message: "Invalid token." });
    }
};

module.exports = adminMiddleware;