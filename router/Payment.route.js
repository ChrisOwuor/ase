const express = require("express");
const dotenv = require("dotenv");
const { handlePaymentCallback } = require("../controllers/PaymentController");
dotenv.config();
const paymentRouter = express.Router();


paymentRouter.post("/handle", handlePaymentCallback);

module.exports = paymentRouter;
