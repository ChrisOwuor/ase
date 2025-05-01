// models/FarmerAccount.js
const mongoose = require("mongoose");

const WithdrawalSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
});

const FarmerAccountSchema = new mongoose.Schema(
  {
    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    totalEarnings: { type: Number, default: 0 },
    pendingEarnings: { type: Number, default: 0 },
    paidEarnings: { type: Number, default: 0 },
    availableEarnings: { type: Number, default: 0 },
    withdrawals: [WithdrawalSchema], // Withdrawal history embedded here
  },
  { timestamps: true }
);

module.exports = mongoose.model("FarmerAccount", FarmerAccountSchema);
