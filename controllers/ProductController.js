const Product = require("../models/Product.model");
const mongoose = require("mongoose");

// Add a new product
const addProduct = async (req, res) => {
  const { name, category, quantity, price, description } = req.body;
  const farmerId = req.user._id; // farmId from authenticated user
  const image = req.file ? req.file.path.replace(/\\/g, "/") : ""; // Assuming you're using multer for file uploads

  try {
    const product = await Product.create({ name, category, quantity, price, description, image, farmerId });
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// Get all products
const getProducts = async (req, res) => {
  const { page = 1, limit = 10 } = req.query; // Get page and limit from query parameters
  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
  };

  try {
    const products = await Product.find()
      .limit(options.limit)
      .skip((options.page - 1) * options.limit);
    
    const totalProducts = await Product.countDocuments(); // Get total number of products
    res.status(200).json({
      totalProducts,
      totalPages: Math.ceil(totalProducts / options.limit),
      currentPage: options.page,
      products,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get products specific to a farmer
const getFarmerProducts = async (req, res) => {
  const farmerId = req.user._id; // Authenticated farmer's ID
  try {
    const products = await Product.find({ farmerId });
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
const getFarmerProductsf = async (req, res) => {
  const farmerId = req.user._id;

  try {
    const productsWithRevenue = await Product.aggregate([
      {
        $match: {
          farmerId: mongoose.Types.ObjectId(farmerId),
        },
      },
      {
        $lookup: {
          from: "orders",
          let: { productId: "$_id" },
          pipeline: [
            { $match: { status: "completed", isPaid: true } },
            { $unwind: "$items" },
            {
              $match: {
                $expr: { $eq: ["$items.product", "$$productId"] },
              },
            },
            {
              $group: {
                _id: "$items.product",
                totalRevenue: {
                  $sum: { $multiply: ["$items.price", "$items.quantity"] },
                },
                totalQuantity: { $sum: "$items.quantity" },
              },
            },
          ],
          as: "salesData",
        },
      },
      {
        $addFields: {
          totalRevenue: {
            $ifNull: [{ $arrayElemAt: ["$salesData.totalRevenue", 0] }, 0],
          },
          totalQuantity: {
            $ifNull: [{ $arrayElemAt: ["$salesData.totalQuantity", 0] }, 0],
          },
        },
      },
      {
        $project: {
          salesData: 0,
        },
      },
    ]);

    res.status(200).json(productsWithRevenue);
  } catch (error) {
    console.error("Error fetching farmer products with revenue:", error);
    res.status(500).json({ message: error.message });
  }
};
const getFarmerProductsyu = async (req, res) => {
  const farmerId = req.user._id;

  try {
    const productsWithRevenue = await Product.aggregate([
      {
        $match: { farmerId: new mongoose.Types.ObjectId(farmerId) },
      },
      {
        $lookup: {
          from: "suborders",
          let: { productId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$farmer", new mongoose.Types.ObjectId(farmerId)],
                },
              },
            },
            { $unwind: "$products" },
            {
              $match: {
                $expr: {
                  $eq: ["$products.product", "$$productId"],
                },
              },
            },
            {
              $group: {
                _id: "$products.product",
                totalRevenue: {
                  $sum: {
                    $multiply: ["$products.price", "$products.quantity"],
                  },
                },
                totalQuantity: { $sum: "$products.quantity" },
              },
            },
          ],
          as: "salesData",
        },
      },
      {
        $addFields: {
          totalRevenue: {
            $ifNull: [{ $arrayElemAt: ["$salesData.totalRevenue", 0] }, 0],
          },
          totalQuantity: {
            $ifNull: [{ $arrayElemAt: ["$salesData.totalQuantity", 0] }, 0],
          },
        },
      },
      {
        $project: {
          salesData: 0,
        },
      },
    ]);

    res.status(200).json(productsWithRevenue);
  } catch (error) {
    console.error("Error fetching products with revenue:", error);
    res.status(500).json({ message: error.message });
  }
};

// Update a product (only owner can update)
const updateProduct = async (req, res) => {
  const { id } = req.params;
  const farmerId = req.user._id;
  try {
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    if (product.farmerId.toString() !== farmerId.toString()) {
      return res.status(403).json({ message: "Unauthorized: You can only update your own products" });
    }
    const updatedProduct = await Product.findByIdAndUpdate(id, req.body, { new: true });
    res.status(200).json(updatedProduct);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete a product (only owner can delete)
const deleteProduct = async (req, res) => {
  const { id } = req.params;
  const farmerId = req.user._id;
  try {
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    if (product.farmerId.toString() !== farmerId.toString()) {
      return res.status(403).json({ message: "Unauthorized: You can only delete your own products" });
    }
    await Product.findByIdAndDelete(id);
    res.status(200).json({ message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
const getSingleProduct = async (req, res) => {
  const { id } = req.params;
  console.log(id)
  try {
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { addProduct, getProducts, getSingleProduct, getFarmerProducts, updateProduct, deleteProduct };
