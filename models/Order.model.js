const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema(
  {
    buyerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
        },
      },
    ],
    paymentMethod: {
      type: String,
      required: true,
    },
    total: {
      type: Number,
      required: true,
    },
    tax: {
      type: Number,
      required: true,
    },
    shipping: {
      type: Number,
      required: true,
    },
    isPaid: {
      type: Boolean,
      default: false,
    },
    paidAt: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "cancelled"],
      default: "pending",
    },
    paymentStatus: {
      type: String,
      enum: ["Unpaid", "Paid"],
      default: "Unpaid",
    },
    deliveredAt: {
      type: Date,
    },
    checkoutRequestID: { type: String }, // Add this inside OrderSchema
    subOrders: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "SubOrder",
      },
    ],
  },
  { timestamps: true }
);

const Order = mongoose.model("Order", OrderSchema);


module.exports = Order
