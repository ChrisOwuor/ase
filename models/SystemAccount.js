// models/SystemAccount.js
import mongoose from "mongoose";

const systemAccountSchema = new mongoose.Schema({
  balance: {
    type: Number,
    required: true,
    default: 0,
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("SystemAccount", systemAccountSchema);
