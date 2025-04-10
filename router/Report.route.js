const express = require("express");
const Inventory = require("../models/Inventory.model");

const reportRouter = express.Router();

// Generate Sales Report
reportRouter.get("/sales", async (req, res) => {
    try {
        // Example: Fetch sales data (Assuming an Orders model exists)
        const salesData = [
            { product: "Tomatoes", quantitySold: 50, totalEarnings: 250 },
            { product: "Carrots", quantitySold: 30, totalEarnings: 150 },
        ];
        res.json(salesData);
    } catch (error) {
        res.status(500).json({ error: "Failed to generate sales report" });
    }
});

// Generate Inventory Report
reportRouter.get("/inventory", async (req, res) => {
    try {
        const inventory = await Inventory.find();
        res.json(inventory);
    } catch (error) {
        res.status(500).json({ error: "Failed to generate inventory report" });
    }
});


//user statistics

module.exports = reportRouter;
