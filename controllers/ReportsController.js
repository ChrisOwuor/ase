const Inventory = require("../models/Inventory.model");
const User = require("../models/User.model");


//user statistics
const getUserStats = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const farmers = await User.countDocuments({ role: "farmer" });
        const buyers = await User.countDocuments({ role: "buyer" });

        res.status(200).json({ totalUsers, farmers, buyers });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
/**
✅ Total products listed
✅ Number of products per category (e.g., fruits, vegetables, dairy)
✅ Best-selling products (ranked by order quantity)
✅ Low-stock products (below a certain threshold)
✅ Products per farmer
 */

const getProductStats = async (req, res) => {
    try {
        const totalProducts = await Product.countDocuments();
        const bestSelling = await OrderItem.aggregate([
            { $group: { _id: "$productId", totalSold: { $sum: "$quantity" } } },
            { $sort: { totalSold: -1 } },
            { $limit: 5 }
        ]);

        const lowStock = await Product.find({ quantity: { $lt: 10 } });

        res.status(200).json({ totalProducts, bestSelling, lowStock });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
✅Total number of orders
✅ Orders per status (Pending, Shipped, Delivered)
✅ Average order value
✅ Orders per farmer
✅ Orders over time (daily, weekly, monthly)
 */

const getOrderStats = async (req, res) => {
    try {
        const totalOrders = await Order.countDocuments();
        const statusCount = await Order.aggregate([
            { $group: { _id: "$status", count: { $sum: 1 } } }
        ]);

        const avgOrderValue = await Order.aggregate([
            { $group: { _id: null, avgValue: { $avg: "$totalAmount" } } }
        ]);

        res.status(200).json({ totalOrders, statusCount, avgOrderValue: avgOrderValue[0]?.avgValue || 0 });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
✅ Total revenue (sum of completed payments)
✅ Revenue per farmer
✅ Revenue over time (daily, weekly, monthly)
✅ Average order revenue
 */
const getRevenueStats = async (req, res) => {
    try {
        const totalRevenue = await Payment.aggregate([
            { $match: { status: "Completed" } },
            { $group: { _id: null, totalRevenue: { $sum: "$amount" } } }
        ]);

        const revenueByFarmer = await Payment.aggregate([
            { $match: { status: "Completed" } },
            { $group: { _id: "$farmerId", totalRevenue: { $sum: "$amount" } } }
        ]);

        res.status(200).json({
            totalRevenue: totalRevenue[0]?.totalRevenue || 0,
            revenueByFarmer
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
/**
✅ Total payments made
✅ Completed vs pending vs failed payments
✅ Most used payment method
✅ Refunds issued
 */
const getPaymentStats = async (req, res) => {
    try {
        const paymentStatusCount = await Payment.aggregate([
            { $group: { _id: "$status", count: { $sum: 1 } } }
        ]);

        res.status(200).json({ paymentStatusCount });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
✅ Average order fulfillment time
✅ Number of late deliveries
✅ Fastest & slowest farmers in fulfilling orders
*/

const getFulfillmentStats = async (req, res) => {
    try {
        const avgFulfillmentTime = await Order.aggregate([
            {
                $match: { status: "Delivered", deliveredAt: { $exists: true } }
            },
            {
                $group: {
                    _id: null,
                    avgTime: {
                        $avg: { $subtract: ["$deliveredAt", "$createdAt"] }
                    }
                }
            }
        ]);

        res.status(200).json({ avgFulfillmentTime: avgFulfillmentTime[0]?.avgTime || 0 });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};



module.exports = {};
