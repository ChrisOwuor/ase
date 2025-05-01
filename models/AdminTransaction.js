// models/AdminTransaction.js
import mongoose from "mongoose";

const adminTransactionSchema = new mongoose.Schema({
  admin: {
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
    enum: ["DISBURSEMENT", "ADJUSTMENT", "FUND_INJECTION"],
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

export default mongoose.model("AdminTransaction", adminTransactionSchema);
