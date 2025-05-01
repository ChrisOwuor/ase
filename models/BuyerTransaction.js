// models/BuyerTransaction.js
import mongoose from "mongoose";

const buyerTransactionSchema = new mongoose.Schema({
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  type: {
    type: String,
    enum: ["CREDIT", "DEBIT"],
    required: true,
  },
  category: {
    type: String,
    enum: ["ORDER_PAYMENT", "REFUND"],
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  reference: {
    type: String,
    default: null,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("BuyerTransaction", buyerTransactionSchema);
