const Address = require("../models/Address.model");
const Order = require("../models/Order.model");
const Product = require("../models/Product.model");
const OrderItem = require("../models/ProductItem.model");

// Place an order
const createOrder = async (req, res) => {
  const { items, user, total, tax, shipping } = req.body;

  let savedOrder = null; // To keep track of the created order

  try {
    // Ensure that the user exists
    const buyer = req.user;

    // Create the order
    const newOrder = new Order({
      buyerId: buyer._id,
      totalAmount: total,
      tax: tax, // Add tax
      shipping: shipping,
      status: "Pending", // Default status
      paymentStatus: "Unpaid", // Default payment status
    });

    // Save the order to the database
    savedOrder = await newOrder.save();

    // Now create order items
    const orderItemsPromises = items.map(async (item) => {
      const product = await Product.findById(item._id);
      if (!product) {
        throw new Error(`Product ${item.name} not found`);
      }

      // Check if requested quantity is sufficient
      if (item.quantity > product.availableQuantity) {
        // Assuming availableQuantity is a field in the Product model
        throw new Error(
          `Insufficient quantity for product ${item.name}. Available: ${product.availableQuantity}`
        );
      }

      // Create the order item
      const newOrderItem = new OrderItem({
        orderId: savedOrder._id,
        productId: product._id,
        quantity: item.quantity,
        farmerId: product.farmId, // Assuming farmId references the seller
      });

      // Save the order item
      await newOrderItem.save();
    });

    // Wait for all order items to be created
    await Promise.all(orderItemsPromises);

    // Send response back to the client
    res.status(201).json({
      message: "Order created successfully",
      order: savedOrder,
    });
  } catch (error) {
    // In case of any error, delete the order and order items
    if (savedOrder && savedOrder._id) {
      // Delete the order if it was created
      await Order.findByIdAndDelete(savedOrder._id);
    }

    // Delete any created order items if necessary
    if (savedOrder && savedOrder._id) {
      await OrderItem.deleteMany({ orderId: savedOrder._id });
    }

    console.error("Error creating order:", error);
    res.status(500).json({
      message: "An error occurred while creating the order",
      error: error.message,
    });
  }
};

// Get all orders
const getOrders = async (req, res) => {
  try {
    const orders = await Order.find().populate("product buyer");
    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
const getOrdersForUser = async (req, res) => {
  const buyerId = req.user._id; // Get user ID from authentication

  try {
    // Fetch all orders placed by the user
    const orders = await Order.find({ buyerId });
    console.log(orders);

    if (!orders.length) {
      return res
        .status(200)
        .json({ message: "No orders found for this user", orders: [] });
    }

    // Extract order IDs to fetch related order items
    const orderIds = orders.map((order) => order._id);

    // Fetch order items and populate product and farmer details
    const orderItems = await OrderItem.find({ orderId: { $in: orderIds } })
      .populate("productId", "name price") // Get product name & price
      .populate("farmerId", "name"); // Get farmer name

    // Construct response with order details and their respective items
    const response = orders.map((order) => ({
      _id: order._id,
      totalAmount: order.totalAmount,
      status: order.status,
      paymentStatus: order.paymentStatus,
      createdAt: order.createdAt,
      deliveredAt: order.deliveredAt || null,
      tax: order.tax,
      shipping: order.shipping,
      items: orderItems
        .filter((item) => item.orderId.toString() === order._id.toString())
        .map((item) => ({
          product: item.productId.name,
          price: item.productId.price,
          quantity: item.quantity,
          farmer: item.farmerId.name,
        })),
    }));

    res.status(200).json(response);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to fetch orders", error: error.message });
  }
};
// Get orders received by the farmer
const getOrdersForFarmer = async (req, res) => {
  try {
    const farmerId = req.user._id;
    const { page = 1, limit = 2 } = req.query; // Default pagination values

    // Fetch order items related to the farmer
    const orderItems = await OrderItem.find({ farmerId }).populate("orderId");

    // Extract order IDs from the order items
    const orderIds = orderItems.map((item) => item.orderId._id);

    // Get the total number of orders that match the order IDs
    const totalOrders = await Order.countDocuments({ _id: { $in: orderIds } });

    // Fetch orders based on the order IDs, and populate buyerId details
    const orders = await Order.find({ _id: { $in: orderIds } })
      .populate("buyerId", "name email phoneNumber") // Populate basic buyer details
      .sort({ createdAt: -1 }) // Sort by latest orders
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    // Loop through each order to append the address and order items
    for (let order of orders) {
      // Fetch buyer's address (assuming Address model exists)
      const buyerAddress = await Address.findOne({ userId: order.buyerId._id });

      // Append address to the buyer details
      order.buyerId.address = buyerAddress ? buyerAddress : null;

      // Fetch the order items related to this order
      order.items = await OrderItem.find({ orderId: order._id }).populate(
        "productId"
      );
    }

    // Return the response with pagination and the modified orders
    res.status(200).json({
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalOrders / limit),
      totalOrders,
      orders,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// Accept an order
const acceptOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(200).json({ message: "Order not found" });
    }
    order.status = "Accepted";
    await order.save();
    res.status(200).json({ message: "Order accepted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// Confirm payment of an order
const confirmPayment = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    order.paymentStatus = "Paid";
    await order.save();
    res.status(200).json({ message: "Payment confirmed successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// Release product (mark as shipped)
const releaseProduct = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    if (order.paymentStatus !== "Paid") {
      return res.status(400).json({
        message: "Cannot release product before payment confirmation",
      });
    }
    order.status = "Shipped";
    await order.save();
    res.status(200).json({ message: "Product released successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createOrder,
  getOrders,
  getOrdersForUser,
  getOrdersForFarmer,
  acceptOrder,
  confirmPayment,
  releaseProduct,
};
