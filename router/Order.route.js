const express = require("express");
const {
  createOrder,
  getOrders,
  getOrdersForFarmer,
  acceptOrder,
  makeOrder,
  getOrdersForUser,
  confirmPayment,
  releaseProduct,
  markAsDelivered,
  getSalesReport,
  downloadSalesReportPDF,
} = require("../controllers/OrderController");
const authMiddleware = require("../middlewares/authMiddleware");
const orderRouter = express.Router();

orderRouter.post(
  "/creat",
  authMiddleware(["admin", "farmer", "buyer"]),
  createOrder
);

orderRouter.get("/",  getOrders); //statistics
orderRouter.get("/farmer", authMiddleware(["farmer"]), getOrdersForFarmer);
orderRouter.put("/:id/accept", acceptOrder);
orderRouter.put("/:id/confirm-payment", confirmPayment);
orderRouter.put("/:id/release", releaseProduct);
orderRouter.get("/buyer", authMiddleware(["buyer"]), getOrdersForUser);
orderRouter.get("/sales", getSalesReport);
orderRouter.post("/sales/pdf", downloadSalesReportPDF);

orderRouter.patch(
  "/order/:orderId/mark-delivered",
  authMiddleware(["admin"]),
  markAsDelivered
);

orderRouter.post(
  "/create",
  authMiddleware(["admin", "farmer", "buyer"]),
  makeOrder
);

module.exports = orderRouter;
