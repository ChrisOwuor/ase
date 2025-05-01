const express = require("express");
const { getFarmerAccount } = require("../controllers/FarmerAccountController");

const farmerAccountRouter = express.Router();

// Route for farmers to view their account details and withdrawal history
farmerAccountRouter.get("/account",  getFarmerAccount);

module.exports = farmerAccountRouter;
