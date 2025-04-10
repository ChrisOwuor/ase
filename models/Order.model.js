const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema({
  buyerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  }, // Buyer
  totalAmount: { type: Number, required: true },
  tax: { type: Number, required: true }, // Add tax
  shipping: { type: Number, required: true }, // Ad
  status: {
    type: String,
    enum: ["Pending", "Accepted", "Shipped", "Delivered"],
    default: "Pending",
  },
  paymentStatus: { type: String, enum: ["Unpaid", "Paid"], default: "Unpaid" },
  createdAt: { type: Date, default: Date.now },
  deliveredAt: { type: Date },
});

const Order = mongoose.model("Order", OrderSchema);
module.exports = Order;
