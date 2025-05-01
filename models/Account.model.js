const mongoose = require("mongoose");

const accountSchema = new mongoose.Schema({
  farmerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Farmer",
    required: true,
  },
  totalEarnings: { type: Number, default: 0 }, // Total earnings for the farmer
});

module.exports = mongoose.model("Account", accountSchema);
