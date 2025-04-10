const mongoose = require("mongoose");

const OrderItemSchema = new mongoose.Schema({
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    quantity: { type: Number, required: true },
    farmerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true } // Seller
});

const OrderItem = mongoose.model("OrderItem", OrderItemSchema);
module.exports = OrderItem;
