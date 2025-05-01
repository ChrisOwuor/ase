const express = require("express");
const {
  addProduct,
  getProducts,
  getFarmerProducts,
  updateProduct,
  deleteProduct,
  getSingleProduct,
} = require("../controllers/ProductController");
const productRouter = express.Router();

const multer = require("multer");
const authMiddleware = require("../middlewares/authMiddleware");
const Product = require("../models/Product.model");
const PDFDocument = require("pdfkit");
const moment = require("moment");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads"); // Specify the directory to save uploaded files
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname); // Append timestamp to the original file name
  },
});
const upload = multer({ storage: storage }).single("image"); // Use .single() to handle single file uploads with the field name 'image'

productRouter.post(
  "/",
  authMiddleware(["admin", "farmer"]),
  upload,
  addProduct
); // Route to add a new product with image upload
productRouter.get("/", getProducts);

productRouter.get(
  "/farmer",
  authMiddleware(["admin", "farmer"]),
  getFarmerProducts
);
productRouter.put("/:id", authMiddleware(["admin", "farmer"]), updateProduct);
productRouter.delete(
  "/:id",
  authMiddleware(["admin", "farmer"]),
  deleteProduct
);
productRouter.get("/:id", getSingleProduct);

productRouter.get("/reports/all", async (req, res) => {
  try {
    // 1. Products Per Farmer
    const productsPerFarmer = await Product.aggregate([
      {
        $group: {
          _id: "$farmerId", // Group by farmerId
          totalProducts: { $sum: 1 }, // Count the number of products per farmer
          totalStock: { $sum: "$quantity" }, // Calculate total stock per farmer
          totalValue: { $sum: { $multiply: ["$quantity", "$price"] } }, // Calculate total stock value
        },
      },
      {
        $lookup: {
          from: "users", // Join with the 'users' collection to get the farmer's name
          localField: "_id", // The field to match on
          foreignField: "_id", // The field in the 'users' collection to match
          as: "farmerDetails", // The alias for the joined data
        },
      },
      {
        $unwind: "$farmerDetails", // Flatten the joined data
      },
      {
        $project: {
          farmerName: "$farmerDetails.name", // Project only the farmer's name
          totalProducts: 1,
          totalStock: 1,
          totalValue: 1,
        },
      },
    ]);

    // 2. Products Per Category
    const productsPerCategory = await Product.aggregate([
      {
        $group: {
          _id: "$category", // Group by product category
          totalProducts: { $sum: 1 }, // Count the number of products per category
          totalStock: { $sum: "$quantity" }, // Calculate total stock per category
          totalValue: { $sum: { $multiply: ["$quantity", "$price"] } }, // Calculate total stock value
        },
      },
      {
        $project: {
          category: "$_id", // Project category name
          totalProducts: 1,
          totalStock: 1,
          totalValue: 1,
        },
      },
    ]);

    // 3. Total Inventory Value Per Farmer
    const totalInventoryPerFarmer = await Product.aggregate([
      {
        $group: {
          _id: "$farmerId", // Group by farmerId
          totalValue: { $sum: { $multiply: ["$quantity", "$price"] } }, // Calculate total inventory value per farmer
        },
      },
      {
        $lookup: {
          from: "users", // Join with the 'users' collection to get the farmer's name
          localField: "_id",
          foreignField: "_id",
          as: "farmerDetails",
        },
      },
      {
        $unwind: "$farmerDetails",
      },
      {
        $project: {
          farmerName: "$farmerDetails.name",
          totalValue: 1,
        },
      },
    ]);

    // 4. Stock Trend (Optional - if tracking stock changes over time)
    const stockTrend = await Product.aggregate([
      {
        $group: {
          _id: "$createdAt", // Group by the product creation date
          totalStock: { $sum: "$quantity" }, // Sum the quantity for each date
        },
      },
      {
        $sort: { _id: 1 }, // Sort by date ascending
      },
      {
        $project: {
          date: "$_id", // Project date
          totalStock: 1,
        },
      },
    ]);

    // 5. Expiry Risk Products (if expiry date is tracked)
    const expiryRiskProducts = await Product.find({
      expiryDate: {
        $lte: new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000),
      }, // Expiry within 7 days
    });

    const allProducts = await Product.find().populate("farmerId", "name");


    // 8. Most Sold Products

    // Return all data in a single response
    res.status(200).json({
      allProducts,
      productsPerFarmer,
      productsPerCategory,
      totalInventoryPerFarmer,
    });
  } catch (error) {
    console.error("Error fetching all inventory reports:", error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
});

productRouter.post("/reports/download", async (req, res) => {
  try {
    const productsPerFarmer = await Product.aggregate([
      {
        $group: {
          _id: "$farmerId", // Group by farmerId
          totalProducts: { $sum: 1 }, // Count the number of products per farmer
          totalStock: { $sum: "$quantity" }, // Calculate total stock per farmer
          totalValue: { $sum: { $multiply: ["$quantity", "$price"] } }, // Calculate total stock value
        },
      },
      {
        $lookup: {
          from: "users", // Join with the 'users' collection to get the farmer's name
          localField: "_id", // The field to match on
          foreignField: "_id", // The field in the 'users' collection to match
          as: "farmerDetails", // The alias for the joined data
        },
      },
      {
        $unwind: "$farmerDetails", // Flatten the joined data
      },
      {
        $project: {
          farmerName: "$farmerDetails.name", // Project only the farmer's name
          totalProducts: 1,
          totalStock: 1,
          totalValue: 1,
        },
      },
    ]);

    // 2. Products Per Category
    const productsPerCategory = await Product.aggregate([
      {
        $group: {
          _id: "$category", // Group by product category
          totalProducts: { $sum: 1 }, // Count the number of products per category
          totalStock: { $sum: "$quantity" }, // Calculate total stock per category
          totalValue: { $sum: { $multiply: ["$quantity", "$price"] } }, // Calculate total stock value
        },
      },
      {
        $project: {
          category: "$_id", // Project category name
          totalProducts: 1,
          totalStock: 1,
          totalValue: 1,
        },
      },
    ]);

    // 3. Total Inventory Value Per Farmer
    const totalInventoryPerFarmer = await Product.aggregate([
      {
        $group: {
          _id: "$farmerId", // Group by farmerId
          totalValue: { $sum: { $multiply: ["$quantity", "$price"] } }, // Calculate total inventory value per farmer
        },
      },
      {
        $lookup: {
          from: "users", // Join with the 'users' collection to get the farmer's name
          localField: "_id",
          foreignField: "_id",
          as: "farmerDetails",
        },
      },
      {
        $unwind: "$farmerDetails",
      },
      {
        $project: {
          farmerName: "$farmerDetails.name",
          totalValue: 1,
        },
      },
    ]);

    // 4. Stock Trend (Optional - if tracking stock changes over time)
    const stockTrend = await Product.aggregate([
      {
        $group: {
          _id: "$createdAt", // Group by the product creation date
          totalStock: { $sum: "$quantity" }, // Sum the quantity for each date
        },
      },
      {
        $sort: { _id: 1 }, // Sort by date ascending
      },
      {
        $project: {
          date: "$_id", // Project date
          totalStock: 1,
        },
      },
    ]);

    // 5. Expiry Risk Products (if expiry date is tracked)
    const expiryRiskProducts = await Product.find({
      expiryDate: {
        $lte: new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000),
      }, // Expiry within 7 days
    });

    const doc = new PDFDocument({ margin: 50, size: "A4" });

    // Set file name for the PDF download
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=inventory_report.pdf"
    );

    // Pipe the PDF to the response object
    doc.pipe(res);

    // Helper functions for table creation
    function createTable(
      doc,
      headers,
      data,
      columnWidths,
      startX,
      startY,
      options = {}
    ) {
      const { rowHeight = 25, fontSize = 10, headerFontSize = 10 } = options;

      let y = startY;

      // Draw header row
      doc.font("Helvetica-Bold").fontSize(headerFontSize);

      // Header background
      doc
        .fillColor("#e6e6e6")
        .rect(
          startX,
          y,
          columnWidths.reduce((a, b) => a + b, 0),
          rowHeight
        )
        .fill();

      // Header text and borders
      doc.fillColor("black");
      let x = startX;

      headers.forEach((header, i) => {
        // Draw cell border
        doc.rect(x, y, columnWidths[i], rowHeight).stroke();

        // Draw text
        doc.text(header, x + 5, y + rowHeight / 2 - headerFontSize / 2, {
          width: columnWidths[i] - 10,
        });

        x += columnWidths[i];
      });

      y += rowHeight;

      // Draw data rows
      doc.font("Helvetica").fontSize(fontSize);

      data.forEach((row, rowIndex) => {
        // Check if we need a new page
        if (y + rowHeight > doc.page.height - 50) {
          doc.addPage();
          y = 50;
        }

        // Alternate row background for better readability
        if (rowIndex % 2 === 1) {
          doc
            .fillColor("#f9f9f9")
            .rect(
              startX,
              y,
              columnWidths.reduce((a, b) => a + b, 0),
              rowHeight
            )
            .fill();
        }

        doc.fillColor("black");
        let x = startX;

        row.forEach((cell, i) => {
          // Draw cell border
          doc.rect(x, y, columnWidths[i], rowHeight).stroke();

          // Draw text
          doc.text(cell.toString(), x + 5, y + rowHeight / 2 - fontSize / 2, {
            width: columnWidths[i] - 10,
          });

          x += columnWidths[i];
        });

        y += rowHeight;
      });

      return y; // Return the Y position after the table
    }

    // Draw a header section
    function drawSectionHeader(doc, text, y) {
      doc.fontSize(14).font("Helvetica-Bold").text(text, 50, y);

      doc
        .moveTo(50, y + 20)
        .lineTo(550, y + 20)
        .stroke();

      return y + 30; // Return Y position after section header
    }

    // Title of the document
    doc
      .font("Helvetica-Bold")
      .fontSize(20)
      .text("Inventory Report", { align: "center" });

    // Add a report header with generated timestamp and who generated it
    doc
      .fontSize(10)
      .font("Helvetica")
      .text(
        `Report generated on: ${new Date().toLocaleString()}\nGenerated by: System`,
        { align: "center" }
      );

    let y = 150; // Starting Y position for content

    // Section: Products Per Farmer
    y = drawSectionHeader(doc, "Products Per Farmer", y);

    // Create table for products per farmer
    const farmerHeaders = [
      "Farmer Name",
      "Total Products",
      "Total Stock",
      "Total Value",
    ];
    const farmerData = productsPerFarmer.map((farmer) => [
      farmer.farmerName,
      farmer.totalProducts,
      farmer.totalStock,
      `Ksh. ${farmer.totalValue.toFixed(2)}`,
    ]);
    const farmerColumnWidths = [200, 100, 100, 100]; // Total: 500
    y = createTable(doc, farmerHeaders, farmerData, farmerColumnWidths, 50, y);

    y += 30; // Add some space before next section

    // Section: Products Per Category
    y = drawSectionHeader(doc, "Products Per Category", y);

    // Create table for products per category
    const categoryHeaders = [
      "Category",
      "Total Products",
      "Total Stock",
      "Total Value",
    ];
    const categoryData = productsPerCategory.map((category) => [
      category.category,
      category.totalProducts,
      category.totalStock,
      `Ksh. ${category.totalValue.toFixed(2)}`,
    ]);
    const categoryColumnWidths = [200, 100, 100, 100]; // Total: 500
    y = createTable(
      doc,
      categoryHeaders,
      categoryData,
      categoryColumnWidths,
      50,
      y
    );

    y += 30; // Add some space before next section

    // Check if we need a new page
    if (y > doc.page.height - 200) {
      doc.addPage();
      y = 50;
    }

    // Section: Total Inventory Per Farmer
    y = drawSectionHeader(doc, "Total Inventory Per Farmer", y);

    // Create table for total inventory per farmer
    const inventoryHeaders = ["Farmer Name", "Total Inventory Value"];
    const inventoryData = totalInventoryPerFarmer.map((farmer) => [
      farmer.farmerName,
      `Ksh. ${farmer.totalValue.toFixed(2)}`,
    ]);
    const inventoryColumnWidths = [300, 200]; // Total: 500
    y = createTable(
      doc,
      inventoryHeaders,
      inventoryData,
      inventoryColumnWidths,
      50,
      y
    );

    y += 30; // Add some space before next section

    // Check if we need a new page
    if (y > doc.page.height - 200) {
      doc.addPage();
      y = 50;
    }

    // Add page numbers
    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      doc
        .fontSize(8)
        .text(`Page ${i + 1} of ${pageCount}`, 50, doc.page.height - 50, {
          align: "center",
        });
    }

    // Finalize the document
    doc.end();
  } catch (error) {
    console.error("Error generating PDF:", error);
    res
      .status(500)
      .json({ message: "Failed to generate PDF", error: error.message });
  }
});
module.exports = productRouter;
