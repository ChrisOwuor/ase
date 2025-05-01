const express = require("express");
const adminMiddleware = require("../middlewares/adminMiddleware");
const {
  verifyFarmer,
  getAllUsers,
  deleteUser,
  UpdateFarmer,getUserById,
  toggleUserStatus,
} = require("../controllers/AdminController");
const authMiddleware = require("../middlewares/authMiddleware");


const adminRouter = express.Router();

// Get all users
adminRouter.get("/users", authMiddleware(['admin']), getAllUsers);

// Get a single user by ID
adminRouter.get("/users/:id", authMiddleware(['admin']), getUserById);


// Activate/Deactivate a user
adminRouter.put("/users/:id/toggle-status", authMiddleware(['admin']), toggleUserStatus);

// Verify a farmer
adminRouter.put("/users/:id/verify", authMiddleware(['admin']), verifyFarmer);

// Delete a user
adminRouter.delete("/users/:id", authMiddleware(['admin']), deleteUser);

adminRouter.put("/users/:id/update", authMiddleware(["admin"]), UpdateFarmer);






module.exports = adminRouter;