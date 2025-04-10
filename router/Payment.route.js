const express = require("express");
const Stripe = require("stripe");
const dotenv = require("dotenv");
dotenv.config();
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const paymentRouter = express.Router();

paymentRouter.post("/api/payment", async (req, res) => {
    const { paymentIntent } = req.body;

    try {
        const intent = await stripe.paymentIntents.create({
            amount: paymentIntent.amount,
            currency: "usd",
            payment_method: paymentIntent.id,
            confirmation_method: "manual",
            confirm: true,
        });

        if (intent.status === "succeeded") {
            res.status(200).json({ message: "Payment successful" });
        } else {
            res.status(400).json({ message: "Payment failed" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = paymentRouter;

