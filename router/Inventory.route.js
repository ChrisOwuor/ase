const express = require("express");
const Inventory = require("../models/Inventory.model");
const Product = require("../models/Product.model");

const inventoryRouter = express.Router();



// Add a new inventory item
inventoryRouter.post("/add", async (req, res) => {
    try {
        const { name, quantity, price } = req.body;
        const newItem = new Inventory({ name, quantity, price });
        await newItem.save();
        res.status(201).json({ message: "Item added successfully", newItem });
    } catch (error) {
        res.status(500).json({ error: "Failed to add item" });
    }
});

// Get all inventory items
inventoryRouter.get("/", async (req, res) => {
    try {
        const items = await Inventory.find();
        res.json(items);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch inventory" });
    }
});

// Update an inventory item
inventoryRouter.put("/update/:id", async (req, res) => {
    try {
        const updatedItem = await Inventory.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updatedItem);
    } catch (error) {
        res.status(500).json({ error: "Failed to update item" });
    }
});

// Delete an inventory item
inventoryRouter.delete("/delete/:id", async (req, res) => {
    try {
        await Inventory.findByIdAndDelete(req.params.id);
        res.json({ message: "Item deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: "Failed to delete item" });
    }
});

inventoryRouter.get("/inventory", async (req, res) => {
  try {
    // Aggregate data for each product
    const products = await Product.aggregate([
      {
        $lookup: {
          from: "suborders", // Joining with SubOrder collection
          localField: "_id",
          foreignField: "products.product",
          as: "subOrders",
        },
      },
      {
        $unwind: {
          path: "$subOrders",
        },
      },
      {
        $group: {
          _id: "$_id",
          name: { $first: "$name" },
          category: { $first: "$category" },
          price: { $first: "$price" },
          totalQuantitySold: { $sum: "$subOrders.quantity" },
          totalRevenue: {
            $sum: { $multiply: ["$subOrders.quantity", "$subOrders.price"] },
          },
        },
      },
    ]);

    // Calculate the total revenue and quantity sold
    const totalInventoryCount = products.reduce(
      (total, product) => total + product.totalQuantitySold,
      0
    );
    const totalRevenue = products.reduce(
      (total, product) => total + product.totalRevenue,
      0
    );

    // Prepare the response with total counts and individual product details
    const inventoryReport = {
      totalInventoryCount,
      totalRevenue,
      products,
    };

    res.json(inventoryReport);
  } catch (error) {
    console.error("Error fetching inventory report:", error);
    res.status(500).json({ message: "Error fetching inventory report" });
  }
});


module.exports = inventoryRouter;
