const Inventory = require("../models/Inventory.model");
const Order = require("../models/Order.model");
const User = require("../models/User.model");
const Product = require("../models/Product.model");
const Payment = require("../models/Payment.model");
const SubOrderModel = require("../models/SubOrder.model");
const FarmerAccount = require("../models/FarmerAccount");
const mongoose = require("mongoose");
const OrderItem = require("../models/ProductItem.model");

// User statistics
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

// Product statistics
const getProductStats = async (req, res) => {
  try {
    const totalProducts = await Product.countDocuments();
    const bestSelling = await OrderItem.aggregate([
      { $group: { _id: "$productId", totalSold: { $sum: "$quantity" } } },
      { $sort: { totalSold: -1 } },
      { $limit: 5 },
    ]);

    const lowStock = await Product.find({ quantity: { $lt: 10 } });

    res.status(200).json({ totalProducts, bestSelling, lowStock });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Order statistics
const getOrderStats = async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();
    const statusCount = await Order.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const avgOrderValue = await Order.aggregate([
      { $group: { _id: null, avgValue: { $avg: "$totalAmount" } } },
    ]);

    res.status(200).json({
      totalOrders,
      statusCount,
      avgOrderValue: avgOrderValue[0]?.avgValue || 0,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Revenue statistics
const getRevenueStats = async (req, res) => {
  try {
    const totalRevenue = await Payment.aggregate([
      { $match: { status: "Completed" } },
      { $group: { _id: null, totalRevenue: { $sum: "$amount" } } },
    ]);

    const revenueByFarmer = await Payment.aggregate([
      { $match: { status: "Completed" } },
      { $group: { _id: "$farmerId", totalRevenue: { $sum: "$amount" } } },
    ]);

    res.status(200).json({
      totalRevenue: totalRevenue[0]?.totalRevenue || 0,
      revenueByFarmer,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Payment statistics
const getPaymentStats = async (req, res) => {
  try {
    const paymentStatusCount = await Payment.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    res.status(200).json({ paymentStatusCount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Fulfillment statistics
const getFulfillmentStats = async (req, res) => {
  try {
    const avgFulfillmentTime = await Order.aggregate([
      {
        $match: { status: "Delivered", deliveredAt: { $exists: true } },
      },
      {
        $group: {
          _id: null,
          avgTime: {
            $avg: { $subtract: ["$deliveredAt", "$createdAt"] },
          },
        },
      },
    ]);

    res
      .status(200)
      .json({ avgFulfillmentTime: avgFulfillmentTime[0]?.avgTime || 0 });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getGeneralSalesReport = async (req, res) => {
  try {
    const [totals] = await Order.aggregate([
      { $match: { isPaid: true } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$total" },
          totalTax: { $sum: "$tax" },
          totalShipping: { $sum: "$shipping" },
          orderCount: { $sum: 1 },
        },
      },
    ]);

    res.status(200).json({
      totalRevenue: totals?.totalRevenue || 0,
      totalTax: totals?.totalTax || 0,
      totalShipping: totals?.totalShipping || 0,
      orderCount: totals?.orderCount || 0,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to get sales report", error });
  }
};

// Get sales by day/month
const getSalesTrend = async (req, res) => {
  try {
    const { range = "day" } = req.query; // 'day' or 'month'

    const dateFormat = range === "month" ? "%Y-%m" : "%Y-%m-%d";

    const data = await Order.aggregate([
      { $match: { isPaid: true } },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: "$createdAt" } },
          totalRevenue: { $sum: "$total" },
          orderCount: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ message: "Failed to get sales trend", error });
  }
};

// Get sales per farmer
const getFarmerSales = async (req, res) => {
  try {
    const { farmerId } = req.params;

    const farmerStats = await SubOrderModel.aggregate([
      { $match: { farmer: new mongoose.Types.ObjectId(farmerId) } },
      {
        $group: {
          _id: "$farmer",
          totalEarnings: { $sum: "$subtotal" },
          subOrderCount: { $sum: 1 },
        },
      },
    ]);

    const farmerAccount = await FarmerAccount.findOne({ farmer: farmerId });

    res.status(200).json({
      totalEarnings: farmerStats[0]?.totalEarnings || 0,
      subOrderCount: farmerStats[0]?.subOrderCount || 0,
      paidEarnings: farmerAccount?.paidEarnings || 0,
      pendingEarnings: farmerAccount?.pendingEarnings || 0,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to get farmer sales", error });
  }
};

// Get product sales summary
const getProductSales = async (req, res) => {
  try {
    const productStats = await SubOrderModel.aggregate([
      { $unwind: "$products" },
      {
        $group: {
          _id: "$products.product",
          totalQuantitySold: { $sum: "$products.quantity" },
          totalRevenue: {
            $sum: { $multiply: ["$products.quantity", "$products.price"] },
          },
        },
      },
      { $sort: { totalQuantitySold: -1 } },
    ]);

    res.status(200).json(productStats);
  } catch (error) {
    res.status(500).json({ message: "Failed to get product sales", error });
  }
};

// Get payment status summary
const getPaymentStatusSummary = async (req, res) => {
  try {
    const statusSummary = await Order.aggregate([
      {
        $group: {
          _id: "$paymentStatus",
          count: { $sum: 1 },
          total: { $sum: "$total" },
        },
      },
    ]);

    res.status(200).json(statusSummary);
  } catch (error) {
    res.status(500).json({ message: "Failed to get payment status", error });
  }
};

const getCompleteSalesReport = async (req, res) => {
  try {
    const { range = "day", farmerId } = req.query; // optional query params

    const dateFormat = range === "month" ? "%Y-%m" : "%Y-%m-%d";

    // 1. General Sales
    const [general] = await Order.aggregate([
      { $match: { isPaid: true } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$total" },
          totalTax: { $sum: "$tax" },
          totalShipping: { $sum: "$shipping" },
          orderCount: { $sum: 1 },
        },
      },
    ]);

    // 2. Sales Trend
    const trend = await Order.aggregate([
      { $match: { isPaid: true } },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: "$createdAt" } },
          totalRevenue: { $sum: "$total" },
          orderCount: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // 3. Farmer Sales
    let farmer = null;
    if (farmerId) {
      const farmerStats = await SubOrderModel.aggregate([
        { $match: { farmer: new mongoose.Types.ObjectId(farmerId) } },
        {
          $group: {
            _id: "$farmer",
            totalEarnings: { $sum: "$subtotal" },
            subOrderCount: { $sum: 1 },
          },
        },
      ]);

      const farmerAccount = await FarmerAccount.findOne({ farmer: farmerId });

      farmer = {
        totalEarnings: farmerStats[0]?.totalEarnings || 0,
        subOrderCount: farmerStats[0]?.subOrderCount || 0,
        paidEarnings: farmerAccount?.paidEarnings || 0,
        pendingEarnings: farmerAccount?.pendingEarnings || 0,
      };
    }

    // 4. Product Sales Summary
    const products = await SubOrderModel.aggregate([
      { $unwind: "$products" },
      {
        $group: {
          _id: "$products.product",
          totalQuantitySold: { $sum: "$products.quantity" },
          totalRevenue: {
            $sum: { $multiply: ["$products.quantity", "$products.price"] },
          },
        },
      },
      { $sort: { totalQuantitySold: -1 } },
    ]);

    // 5. Payment Status
    const paymentStatus = await Order.aggregate([
      {
        $group: {
          _id: "$paymentStatus",
          count: { $sum: 1 },
          total: { $sum: "$total" },
        },
      },
    ]);

    res.status(200).json({
      general: {
        totalRevenue: general?.totalRevenue || 0,
        totalTax: general?.totalTax || 0,
        totalShipping: general?.totalShipping || 0,
        orderCount: general?.orderCount || 0,
      },
      trend,
      farmer,
      products,
      paymentStatus,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to get complete sales report", error });
  }
};



// Export all functions
module.exports = {
  getCompleteSalesReport,
  getUserStats,
  getProductStats,
  getOrderStats,
  getRevenueStats,
  getPaymentStats,
  getFulfillmentStats,
  getGeneralSalesReport,
  getSalesTrend,
  getFarmerSales,
  getProductSales,
  getPaymentStatusSummary,
};
