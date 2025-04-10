const mongoose = require("mongoose");

const InventorySchema = new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    quantityAdded: { type: Number, required: true },
    quantityRemoved: { type: Number, default: 0 },
    transactionType: { type: String, enum: ["Stock In", "Stock Out"], required: true },
    createdAt: { type: Date, default: Date.now },
});
const Inventory = mongoose.model("Inventory", InventorySchema);
module.exports = Inventory;

