const Payment = require("../models/Payment.model");
const Order = require("../models/Order.model");

// Make a Payment
const makePayment = async (req, res) => {
    try {
        const { orderId, userId, amount, paymentMethod } = req.body;

        // 1️⃣ Check if order exists
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        // 2️⃣ Check if order is already paid
        if (order.paymentStatus === "Paid") {
            return res.status(400).json({ message: "Order is already paid" });
        }

        // 3️⃣ Create Payment Record
        const payment = new Payment({
            orderId,
            userId,
            amount,
            paymentMethod,
            status: "Pending"
        });

        await payment.save();

        // 🏦 4️⃣ Simulate Payment Processing (Integrate Payment Gateway here)
        setTimeout(async () => {
            try {
                // ✅ Assume Payment is successful
                payment.status = "Completed";
                await payment.save();

                // 🔄 5️⃣ Update Order Payment Status
                order.paymentStatus = "Paid";
                await order.save();

                console.log("Payment processed successfully.");
            } catch (error) {
                console.error("Payment processing error:", error);
            }
        }, 3000); // Simulating delay for real-world payment processing

        res.status(200).json({ message: "Payment initiated. Waiting for confirmation." });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { makePayment };
