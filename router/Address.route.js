const express = require("express");

const authMiddleware = require("../middlewares/authMiddleware");
const {
  createAddress,
  getAddress,
  updateAddress,
  deleteAddress,
} = require("../controllers/AddressController");

const addressRouter = express.Router();

addressRouter.post("/", authMiddleware(["farmer", "buyer"]), createAddress);
addressRouter.get("/", authMiddleware(["farmer"]), getAddress);
addressRouter.get("/:id", authMiddleware(["farmer"]), getAddress);
addressRouter.put("/:id", authMiddleware(["farmer", "buyer"]), updateAddress);
addressRouter.delete(
  "/:id",
  authMiddleware(["farmer", "buyer"]),
  deleteAddress
);

module.exports = addressRouter;
