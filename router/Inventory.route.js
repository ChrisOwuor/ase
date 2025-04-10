const express = require("express");
const Inventory = require("../models/Inventory.model");

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

module.exports = inventoryRouter;
