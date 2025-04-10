const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  image: { type: String, required: true }, // URL of the product image
  description: { type: String, required: true }, // Description of the product
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  farmId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Farmer ID
});

const Product = mongoose.model("Product", productSchema);
module.exports = Product;
