// models/FarmerTransaction.js
import mongoose from "mongoose";

const farmerTransactionSchema = new mongoose.Schema({
  farmer: {
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
    enum: ["WITHDRAWAL", "DISBURSEMENT", "SALE_EARNING"],
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  balanceAfter: {
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

export default mongoose.model("FarmerTransaction", farmerTransactionSchema);
