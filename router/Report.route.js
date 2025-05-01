// routes/reportRouter.js

const express = require("express");
const Product = require("../models/Product.model");
const Payment = require("../models/Payment.model");
const Order = require("../models/Order.model");
const {
  getGeneralSalesReport,
  getSalesTrend,
  getFarmerSales,
  getProductSales,
  getPaymentStatusSummary,
  getCompleteSalesReport,
} = require("../controllers/ReportsController");
const SubOrderModel = require("../models/SubOrder.model");
const User = require("../models/User.model");
const PDFDocument = require("pdfkit");

const reportRouter = express.Router();

// ===================
// 📦 Get Product Stock Statistics
// ===================
reportRouter.get("/products/stock", async (req, res) => {
  try {
    // Total quantity across all products
    const totalQuantityResult = await Product.aggregate([
      {
        $group: {
          _id: null,
          totalQuantity: { $sum: "$quantity" },
        },
      },
    ]);

    const totalQuantity = totalQuantityResult[0]?.totalQuantity || 0;

    // Get all products with their quantity
    const products = await Product.find({}, "name quantity category price");

    // Products nearing out of stock (e.g., quantity < 10)
    const lowStockProducts = await Product.find(
      { quantity: { $lt: 10 } },
      "name quantity category price"
    );

    // Group products by category and count
    const productsByCategory = await Product.aggregate([
      {
        $group: {
          _id: "$category",
          productCount: { $sum: 1 },
        },
      },
      { $sort: { productCount: -1 } }, // sort descending by count
      { $limit: 5 }, // take top 5
    ]);

    res.status(200).json({
      totalQuantity,
      products,
      lowStockProducts,
      topCategories: productsByCategory,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Failed to fetch product stock stats",
      error: error.message,
    });
  }
});
// ===================
// 💰 Get Sales Report
// ===================
reportRouter.get("/sales", async (req, res) => {
  try {
    // Total revenue from completed payments
    const totalRevenueResult = await Payment.aggregate([
      { $match: { status: "Completed" } },
      { $group: { _id: null, totalRevenue: { $sum: "$amount" } } },
    ]);
    const totalRevenue = totalRevenueResult[0]?.totalRevenue || 0;

    // Total number of orders
    const totalOrders = await Order.countDocuments();

    // Orders grouped by status
    const ordersByStatus = await Order.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    // Payments grouped by status
    const paymentsByStatus = await Payment.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    // Daily revenue trend
    const dailyRevenue = await Payment.aggregate([
      { $match: { status: "Completed" } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          total: { $sum: "$amount" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Payment method usage statistics
    const paymentMethods = await Payment.aggregate([
      {
        $group: {
          _id: "$paymentMethod",
          count: { $sum: 1 },
        },
      },
    ]);

    // ================================
    // 📊 Revenue per Category
    // ================================
    const revenuePerCategory = await Payment.aggregate([
      { $match: { status: "Completed" } },
      {
        $lookup: {
          from: "orders", // 'orders' collection
          localField: "orderId",
          foreignField: "_id",
          as: "order",
        },
      },
      { $unwind: "$order" },
      {
        $lookup: {
          from: "products", // 'products' collection
          localField: "order.productId",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
      {
        $group: {
          _id: "$product.category", // Group by category
          totalRevenue: { $sum: "$amount" }, // Sum of revenues per category
        },
      },
      { $sort: { totalRevenue: -1 } }, // Sort by revenue in descending order
    ]);

    // ================================
    // 📅 Revenue per Week
    // ================================
    const revenuePerWeek = await Payment.aggregate([
      { $match: { status: "Completed" } },
      {
        $group: {
          _id: {
            year: { $isoWeekYear: "$createdAt" },
            week: { $isoWeek: "$createdAt" },
          },
          total: { $sum: "$amount" },
        },
      },
      { $sort: { "_id.year": 1, "_id.week": 1 } },
    ]);

    // ================================
    // 📅 Revenue per Month
    // ================================
    const revenuePerMonth = await Payment.aggregate([
      { $match: { status: "Completed" } },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          total: { $sum: "$amount" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    // Send the response with all the data
    res.status(200).json({
      success: true,
      data: {
        totalRevenue,
        totalOrders,
        ordersByStatus,
        paymentsByStatus,
        dailyRevenue,
        paymentMethods,
        revenuePerCategory, // The list of categories with total revenue
        revenuePerWeek,
        revenuePerMonth,
      },
    });
  } catch (error) {
    console.error("Sales report error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch sales report",
      error: error.message,
    });
  }
});

reportRouter.get("/general", getCompleteSalesReport);

// Helper function to generate inventory report
async function generateInventoryReport(startDate, endDate) {
  const products = await Product.aggregate([
    {
      $lookup: {
        from: "MoSubOrderModels",
        localField: "_id",
        foreignField: "products.product",
        as: "subOrders",
      },
    },
    { $unwind: { path: "$subOrders" } },
    {
      $match: {
        "subOrders.createdAt": {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        },
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

  const totalInventoryCount = products.reduce(
    (total, p) => total + p.totalQuantitySold,
    0
  );
  const totalRevenue = products.reduce((total, p) => total + p.totalRevenue, 0);

  return { totalInventoryCount, totalRevenue, products };
}

async function generateSalesReport(startDate, endDate) {
  const sales = await SubOrderModel.aggregate([
    {
      $match: {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        },
      },
    },
    {
      $group: {
        _id: null,
        totalSalesAmount: { $sum: { $multiply: ["$quantity", "$price"] } },
        totalOrders: { $sum: 1 },
      },
    },
  ]);

  const result = sales[0] || { totalSalesAmount: 0, totalOrders: 0 };

  return result;
}

async function generateUserActivityReport(startDate, endDate) {
  const users = await User.find();

  return {
    totalNewUsers: users.length,
    users,
  };
}

// Preview Report Endpoint
reportRouter.post("/preview", async (req, res) => {
  try {
    const { reportType, startDate, endDate } = req.body;

    if (!reportType || !startDate || !endDate) {
      return res.status(400).json({ message: "Missing parameters" });
    }

    let report;

    switch (reportType) {
      case "inventory":
        report = await generateInventoryReport(startDate, endDate);
        break;
      case "sales":
        report = await generateSalesReport(startDate, endDate);
        break;
      case "user_activity":
        report = await generateUserActivityReport(startDate, endDate);
        break;
      default:
        return res.status(400).json({ message: "Invalid report type" });
    }

    res.json({ reportType, startDate, endDate, report });
  } catch (error) {
    console.error("Error generating preview:", error);
    res.status(500).json({ message: "Server error generating preview" });
  }
});

// Download Report Endpoint
reportRouter.post("/download", async (req, res) => {
  try {
    const { reportType, startDate, endDate } = req.body;

    if (!reportType || !startDate || !endDate) {
      return res.status(400).json({ message: "Missing parameters" });
    }

    let report;

    switch (reportType) {
      case "inventory":
        report = await generateInventoryReport(startDate, endDate);
        break;
      case "sales":
        report = await generateSalesReport(startDate, endDate);
        break;
      case "user_activity":
        report = await generateUserActivityReport(startDate, endDate);
        break;
      default:
        return res.status(400).json({ message: "Invalid report type" });
    }

    console.log("Report data:", report); // Log the report data for debugging
    // Create a PDF document
    const doc = new PDFDocument();
    let filename = `${reportType}_report_${Date.now()}.pdf`;

    // Set response headers
    res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
    res.setHeader("Content-Type", "application/pdf");

    // Pipe the PDF into the response
    doc.pipe(res);

    // Write the PDF content
    doc
      .fontSize(20)
      .text(`${reportType.replace("_", " ").toUpperCase()} REPORT`, {
        align: "center",
      });
    doc.moveDown();
    doc.fontSize(14).text(`Report Type: ${reportType}`);
    doc.text(`Start Date: ${startDate}`);
    doc.text(`End Date: ${endDate}`);
    doc.moveDown();

    doc.fontSize(16).text("Report Data:");
    doc.moveDown();

    // Handle the structure based on reportType
    if (reportType === "inventory") {
      report.forEach((item, index) => {
        doc.text(`${index + 1}. Product: ${item.productName}`);
        doc.text(`   Quantity: ${item.quantity}`);
        doc.text(`   Price: Ksh ${item.price}`);
        doc.moveDown();
      });
    } else if (reportType === "sales") {
      doc.text(`Total Sales Amount: Ksh ${report.totalSalesAmount}`);
      doc.text(`Total Orders: ${report.totalOrders}`);
    } else if (reportType === "user_activity") {
      doc.text(`Total New Users: ${report.totalNewUsers}`);
      doc.moveDown();

      // Set up table
      doc.font("Helvetica-Bold");
      const tableTop = doc.y;
      let y = tableTop;

      // Table headers
      doc.text("Name", 50, y, { width: 100 });
      doc.text("Role", 300, y, { width: 70 });
      doc.text("Phone", 370, y, { width: 100 });

      // Draw header underline
      y += 20;
      doc.moveTo(50, y).lineTo(580, y).stroke();
      y += 10;

      // Switch to regular font for data rows
      doc.font("Helvetica");

      // Add user data rows
      report.users.forEach((user) => {
        doc.text(user.name, 50, y, { width: 100 });
        doc.text(user.role, 300, y, { width: 70 });
        doc.text(user.phoneNumber, 370, y, { width: 100 });

        y += 20;

        // Handle page overflow
        if (y > 700) {
          doc.addPage();
          y = 50;
        }
      });
    }
    // Finalize PDF
    doc.end();
  } catch (error) {
    console.error("Error generating PDF download:", error);
    res.status(500).json({ message: "Server error generating download" });
  }
});

module.exports = reportRouter;
