const Address = require("../models/Address.model");
const Order = require("../models/Order.model");
const Product = require("../models/Product.model");
const OrderItem = require("../models/ProductItem.model");
const mongoose = require("mongoose");
const PDFDocument = require("pdfkit");

const dotenv = require("dotenv");
dotenv.config();

// Place an order
const axios = require("axios");
const moment = require("moment");
const Payment = require("../models/Payment.model");
const AccountModel = require("../models/Account.model");
const {
  getAccessToken,
  formatPhoneNumber,
  initiateStkPush,
} = require("../mpesa");
const SubOrderModel = require("../models/SubOrder.model");
const { getNgrokUrl } = require("../utils");
const FarmerAccount = require("../models/FarmerAccount");

const createOrder = async (req, res) => {
  const { items, total, tax, shipping } = req.body;
  let savedOrder = null;

  try {
    const buyer = req.user;

    // 1. Create the Order
    const newOrder = new Order({
      buyerId: buyer._id,
      totalAmount: total,
      tax,
      shipping,
      status: "pending",
      paymentStatus: "Unpaid",
    });

    savedOrder = await newOrder.save();

    // 2. Create Order Items and Calculate Farmer Earnings
    const farmerContributions = {}; // To track how much each farmer will earn

    const orderItemsPromises = items.map(async (item) => {
      const product = await Product.findById(item._id);
      if (!product) throw new Error(`Product ${item.name} not found`);

      if (item.quantity > product.availableQuantity) {
        throw new Error(
          `Insufficient quantity for product ${item.name}. Available: ${product.availableQuantity}`
        );
      }

      const orderItemTotal = item.quantity * product.price;

      const newOrderItem = new OrderItem({
        orderId: savedOrder._id,
        productId: product._id,
        quantity: item.quantity,
        farmerId: product.farmId,
        totalAmount: orderItemTotal, // Store total for each product
      });

      await newOrderItem.save();

      // Track the total amount for each farmer
      if (farmerContributions[product.farmId]) {
        farmerContributions[product.farmId] += orderItemTotal;
      } else {
        farmerContributions[product.farmId] = orderItemTotal;
      }
    });

    await Promise.all(orderItemsPromises);

    // 3. Get Access Token for M-Pesa payment
    const auth = Buffer.from(
      `${process.env.CONSUMER_KEY}:${process.env.CONSUMER_SECRET}`
    ).toString("base64");

    const tokenResponse = await axios.get(
      "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
      {
        headers: {
          Authorization: `Basic ${auth}`,
        },
      }
    );

    const accessToken = tokenResponse.data.access_token;
    const ngrokUrl = await getNgrokUrl(); // Get Ngrok URL for callback

    // Remove leading '+' if present
    let number = buyer.phoneNumber.replace(/^\+/, ""); // Removes leading '+'

    // Ensure the number starts with '254' and remove any leading '0'
    if (number.startsWith("254")) {
      // If it starts with '254', no need to modify it
      number = `254${number.slice(3)}`; // Remove any leading '0' after '254'
    } else {
      // If it doesn't start with '254', prepend '254' and remove leading '0'
      number = `254${number.slice(1)}`;
    }

    const phoneNumber = number; // Use the formatted number
    const amount = Math.round(total);
    const shortCode = process.env.BUSINESS_SHORTCODE;
    const passkey = process.env.PASSKEY;
    const timestamp = moment().format("YYYYMMDDHHmmss");
    const password = Buffer.from(shortCode + passkey + timestamp).toString(
      "base64"
    );

    const stkPushResponse = await axios.post(
      "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
      {
        BusinessShortCode: shortCode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: 1,
        PartyA: phoneNumber,
        PartyB: shortCode,
        PhoneNumber: phoneNumber,
        CallBackURL: `${ngrokUrl}/callback`, // Replace with your backend
        AccountReference: `Order${savedOrder._id}`,
        TransactionDesc: "Payment for order",
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (
      stkPushResponse.data.ResponseCode === "0" ||
      stkPushResponse.data.ResponseCode === "1"
    ) {
      // 5. Payment Initiated Successfully
      console.log("Payment initiated successfully");
      console.log(stkPushResponse.data);
      const payment = new Payment({
        orderId: savedOrder._id,
        userId: buyer._id,
        amount: amount,
        status: "Completed", // Assume success in sandbox
        paymentMethod: "Mpesa",
      });

      await payment.save();

      // 6. Update the Order
      savedOrder.paymentStatus = "Paid";
      savedOrder.status = "Accepted";
      await savedOrder.save();

      // 7. Distribute Earnings to Farmers
      for (let farmerId in farmerContributions) {
        const earnings = farmerContributions[farmerId];
        await distributeEarningsToFarmer(farmerId, earnings);
      }

      return res.status(201).json({
        message: "Order created and payment initiated successfully",
        order: savedOrder,
        payment,
      });
    } else {
      console.log("Payment initiation failed", stkPushResponse.data);
      throw new Error("Failed to initiate payment");
    }
  } catch (error) {
    // Cleanup if order was created but something failed
    if (savedOrder && savedOrder._id) {
      await Order.findByIdAndDelete(savedOrder._id);
      await OrderItem.deleteMany({ orderId: savedOrder._id });
    }

    console.error("Error creating order with payment:", error);

    return res.status(500).json({
      message:
        "An error occurred while creating the order and initiating payment",
      error: error.message || "Unknown error",
    });
  }
};

// Helper function to distribute earnings to the farmer
async function distributeEarningsToFarmer(farmerId, earnings) {
  const account = await AccountModel.findOne({ farmerId });
  if (account) {
    account.totalEarnings += earnings;
    await account.save();
  } else {
    const newAccount = new AccountModel({
      farmerId,
      totalEarnings: earnings,
    });
    await newAccount.save();
  }
}

// Get all orders
const getOrder = async (req, res) => {
  try {
    const orders = await Order.find().populate("product buyer");
    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getOrdersui = async (req, res) => {
  try {
    // Fetch all orders with their associated subOrders populated
    const orders = await Order.find({
      status: { $ne: "completed" },
      status: { $ne: "cancelled" },
    })
      .populate("subOrders")
      .populate("buyerId") // Populate the buyer details if needed
      .populate("items.product"); // Populate product details in the items array

    if (!orders || orders.length === 0) {
      return res
        .status(404)
        .json({ message: "No orders available for processing." });
    }

    res.status(200).json({ orders });
  } catch (err) {
    console.error("Error fetching orders:", err);
    res
      .status(500)
      .json({ message: "Internal server error", error: err.message });
  }
};
const getOrders = async (req, res) => {
  try {
    // Get page and limit from query params, with defaults
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;

    const skip = (page - 1) * limit;

    // Build query filter
    const filter = {
      status: { $nin: ["completed", "cancelled"] },
    };

    // Get total count
    const totalOrders = await Order.countDocuments(filter);

    // Get paginated orders
    const orders = await Order.find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }) // Optional: newest first
      .populate("subOrders")
      .populate("buyerId")
      .populate("items.product");

    if (!orders || orders.length === 0) {
      return res
        .status(404)
        .json({ message: "No orders available for processing." });
    }

    // Send response with metadata
    res.status(200).json({
      orders,
      currentPage: page,
      totalPages: Math.ceil(totalOrders / limit),
      totalOrders,
    });
  } catch (err) {
    console.error("Error fetching orders:", err);
    res
      .status(500)
      .json({ message: "Internal server error", error: err.message });
  }
};
const getOrdersForUse = async (req, res) => {
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

const getOrdersForUser = async (req, res) => {
  try {
    const buyerId = new mongoose.Types.ObjectId(req.user._id);
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    // Step 1: Fetch orders made by the user
    const orders = await Order.find({ buyerId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    if (!orders.length) {
      return res
        .status(200)
        .json({ message: "No orders found for this user", orders: [] });
    }

    const orderIds = orders.map((o) => o._id);

    // Step 2: Fetch related SubOrders for these orders
    const subOrders = await SubOrderModel.find({ order: { $in: orderIds } })
      .populate("farmer", "name")
      .populate("products.product", "name price images") // populate product fields
      .lean();

    // Step 3: Group SubOrders under their main Order
    const groupedSubOrders = {};

    for (let subOrder of subOrders) {
      const orderId = subOrder.order.toString();

      if (!groupedSubOrders[orderId]) {
        groupedSubOrders[orderId] = [];
      }

      groupedSubOrders[orderId].push({
        _id: subOrder._id,
        farmer: subOrder.farmer
          ? { _id: subOrder.farmer._id, name: subOrder.farmer.name }
          : null,
        status: subOrder.status,
        subtotal: subOrder.subtotal,
        products: subOrder.products.map((p) => ({
          _id: p.product?._id,
          name: p.product?.name,
          price: p.product?.price,
          images: p.product?.images,
          quantity: p.quantity,
        })),
      });
    }

    // Step 4: Build final response
    const response = orders.map((order) => ({
      _id: order._id,
      amount: order.total,
      tax: order.tax,
      shipping: order.shipping,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      createdAt: order.createdAt,
      deliveredAt: order.deliveredAt || null,
      subOrders: groupedSubOrders[order._id.toString()] || [],
    }));

    res.status(200).json({
      currentPage: parseInt(page),
      totalPages: Math.ceil((await Order.countDocuments({ buyerId })) / limit),
      totalOrders: await Order.countDocuments({ buyerId }),
      orders: response,
    });
  } catch (error) {
    console.error("Get orders for user error:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch orders", error: error.message });
  }
};
// Get orders received by the farmer
const getOrdersForFarme = async (req, res) => {
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
const getOrdersForFarmer = async (req, res) => {
  try {
    const farmerId = new mongoose.Types.ObjectId(req.user._id);
    const { page = 1, limit = 2 } = req.query;

    const skip = (page - 1) * limit;

    // Step 1: Aggregation pipeline
    const results = await SubOrderModel.aggregate([
      // Filter suborders by farmer
      { $match: { farmer: farmerId } },

      // Lookup order details
      {
        $lookup: {
          from: "orders",
          localField: "order",
          foreignField: "_id",
          as: "orderDetails",
        },
      },
      { $unwind: "$orderDetails" },

      // Lookup buyer details
      {
        $lookup: {
          from: "users",
          localField: "orderDetails.buyerId",
          foreignField: "_id",
          as: "buyerDetails",
        },
      },
      { $unwind: "$buyerDetails" },

      // Lookup address of buyer
      {
        $lookup: {
          from: "addresses",
          localField: "buyerDetails._id",
          foreignField: "userId",
          as: "buyerAddress",
        },
      },
      {
        $addFields: {
          buyerAddress: { $arrayElemAt: ["$buyerAddress", 0] },
        },
      },

      // Lookup product details inside suborder.products
      {
        $unwind: "$products",
      },
      {
        $lookup: {
          from: "products",
          localField: "products.product",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      {
        $addFields: {
          productInfo: { $arrayElemAt: ["$productDetails", 0] },
        },
      },
      {
        $group: {
          _id: "$_id",
          orderId: { $first: "$orderDetails._id" },
          createdAt: { $first: "$orderDetails.createdAt" },
          paymentMethod: { $first: "$orderDetails.paymentMethod" },
          amount: { $first: "$orderDetails.total" },
          tax: { $first: "$orderDetails.tax" },
          shipping: { $first: "$orderDetails.shipping" },
          isPaid: { $first: "$orderDetails.isPaid" },
          paymentStatus: { $first: "$orderDetails.paymentStatus" },
          status: { $first: "$orderDetails.status" },
          buyer: { $first: "$buyerDetails" },
          buyerAddress: { $first: "$buyerAddress" },
          subOrderStatus: { $first: "$status" },
          subtotal: { $first: "$subtotal" },
          products: {
            $push: {
              product: {
                _id: "$productInfo._id",
                name: "$productInfo.name",
                images: "$productInfo.images",
              },
              quantity: "$products.quantity",
              price: "$products.price",
            },
          },
        },
      },

      // Sort by order creation date
      { $sort: { createdAt: -1 } },

      // Pagination
      { $skip: skip },
      { $limit: parseInt(limit) },
    ]);

    // Step 2: Count total for pagination
    const totalOrders = await SubOrderModel.countDocuments({
      farmer: farmerId,
    });

    res.status(200).json({
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalOrders / limit),
      totalOrders,
      orders: results.map((r) => ({
        _id: r.orderId,
        paymentMethod: r.paymentMethod,
        amount: r.total,
        tax: r.tax,
        shipping: r.shipping,
        isPaid: r.isPaid,
        paymentStatus: r.paymentStatus,
        status: r.status,
        createdAt: r.createdAt,
        subtotal: r.subtotal,
        subOrderStatus: r.subOrderStatus,
        buyerId: {
          _id: r.buyer._id,
          name: r.buyer.name,
          email: r.buyer.email,
          phoneNumber: r.buyer.phoneNumber,
          address: r.buyerAddress || null,
        },
        items: r.products,
      })),
    });
  } catch (error) {
    console.error("Farmer order error:", error);
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

// Mark order as delivered
const markAsDelivere = async (req, res) => {
  try {
    const { orderId } = req.params;

    // Fetch the order with suborders
    const order = await Order.findById(orderId).populate("subOrders");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Update main order
    order.status = "completed";
    order.deliveredAt = Date.now();
    await order.save();

    // Process each suborder
    for (const subOrderId of order.subOrders) {
      const subOrder = await SubOrderModel.findById(subOrderId);

      if (!subOrder) continue;

      subOrder.status = "delivered";
      await subOrder.save();

      const farmerId = subOrder.farmer;
      const amount = subOrder.subtotal;

      const farmerAccount = await FarmerAccount.findOne({ farmer: farmerId });

      if (farmerAccount) {
        // Only update if pendingEarnings >= amount
        if (farmerAccount.pendingEarnings >= amount) {
          farmerAccount.pendingEarnings -= amount;
          farmerAccount.paidEarnings += amount;
          await farmerAccount.save();
        } else {
          console.warn(
            `Farmer ${farmerId} has insufficient pendingEarnings for transfer`
          );
        }
      }
    }

    res
      .status(200)
      .json({ message: "Order and suborders marked as delivered" });
  } catch (error) {
    console.error("Error marking order as delivered:", error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

const markAsDelivered = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId).populate("subOrders");
    if (order.status === "completed") {
      return res.status(400).json({ message: "Order already completed" });
    }

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.paymentStatus === "Unpaid") {
      return res.status(400).json({
        message: "Cannot mark as delivered before payment confirmation",
      });
    }
    // Mark main order as completed
    order.status = "completed";
    order.deliveredAt = Date.now();
    await order.save();

    // Process each suborder
    for (const subOrder of order.subOrders) {
      if (!subOrder) continue;

      // Update suborder status
      subOrder.status = "delivered";
      await subOrder.save();

      const farmerId = subOrder.farmer;
      const amount = subOrder.subtotal;

      const farmerAccount = await FarmerAccount.findOne({ farmer: farmerId });

      if (!farmerAccount) {
        console.warn(`Farmer account not found for ID ${farmerId}`);
        continue;
      }

      if (farmerAccount.pendingEarnings >= amount) {
        farmerAccount.pendingEarnings -= amount;
        farmerAccount.availableEarnings += amount;
        await farmerAccount.save();
      } else {
        console.warn(
          `Farmer ${farmerId} has insufficient pendingEarnings for transfer. Expected at least ${amount}, but has ${farmerAccount.pendingEarnings}`
        );
      }
    }

    res.status(200).json({
      message: "Order and suborders marked as delivered successfully",
    });
  } catch (error) {
    console.error("Error marking order as delivered:", error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};
const makeOrders = async (req, res) => {
  try {
    const { items, paymentMethod, totalAmount, tax, shipping, user } = req.body;

    // Step 1: Save the main Order
    const newOrder = new Order({
      buyerId: user._id,
      items: items.map((item) => ({
        product: item._id,
        quantity: item.quantity,
      })),
      shippingAddress,
      paymentMethod,
      totalAmount,
      tax,
      shipping,
    });

    const savedOrder = await newOrder.save();

    // Step 2: Group items by farmer and create SubOrders
    const farmerGroups = {};

    for (const item of items) {
      if (!farmerGroups[item.farmerId]) {
        farmerGroups[item.farmerId] = [];
      }
      farmerGroups[item.farmerId].push(item);
    }

    const subOrderIds = [];

    for (const farmerId in farmerGroups) {
      const farmerItems = farmerGroups[farmerId];

      const subOrder = new SubOrderModel({
        farmer: farmerId,
        order: savedOrder._id,
        products: farmerItems.map((prod) => ({
          product: prod._id,
          quantity: prod.quantity,
          price: prod.price,
        })),
        subtotal: farmerItems.reduce(
          (sum, prod) => sum + prod.price * prod.quantity,
          0
        ),
      });

      const savedSubOrder = await subOrder.save();
      subOrderIds.push(savedSubOrder._id);
    }

    // Step 3: Update Order with SubOrders
    savedOrder.subOrders = subOrderIds;
    await savedOrder.save();

    // Step 4: Initiate M-Pesa STK Push
    const accessToken = await getAccessToken();
    const ngrokUrl = await getNgrokUrl(); // for callback
    const formattedPhone = formatPhoneNumber(user.phoneNumber);

    const stkPushResponse = awaitsinitiateStkPush({
      accessToken,
      phoneNumber: formattedPhone,
      amount: Math.round(totalAmount),
      orderId: savedOrder._id,
      callbackUrl: `${ngrokUrl}/api/payment/callback`,
    });

    // Step 5: Respond to user
    res.status(201).json({
      message: "Order created. STK push sent to phone.",
      orderId: savedOrder._id,
      stkPushResponse,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Something went wrong", error: error.message });
  }
};
const makeOrdera = async (req, res) => {
  try {
    const { items, paymentMethod, total, tax, shipping, user } = req.body;

    // Step 1: Save the main Order
    const newOrder = new Order({
      buyerId: user.userData._id,
      items: items.map((item) => ({
        product: item._id,
        quantity: item.quantity,
      })),
      paymentMethod,
      total,
      tax,
      shipping,
    });

    const savedOrder = await newOrder.save();

    // Step 2: Group items by farmer and create SubOrders
    const farmerGroups = {};

    for (const item of items) {
      if (!farmerGroups[item.farmerId]) {
        farmerGroups[item.farmerId] = [];
      }
      farmerGroups[item.farmerId].push(item);
    }

    const subOrderIds = [];

    for (const farmerId in farmerGroups) {
      const farmerItems = farmerGroups[farmerId];

      const subOrder = new SubOrderModel({
        farmer: farmerId,
        order: savedOrder._id,
        products: farmerItems.map((prod) => ({
          product: prod._id,
          quantity: prod.quantity,
          price: prod.price,
        })),
        subtotal: farmerItems.reduce(
          (sum, prod) => sum + prod.price * prod.quantity,
          0
        ),
      });

      const savedSubOrder = await subOrder.save();
      subOrderIds.push(savedSubOrder._id);
    }

    // Step 3: Update Order with SubOrders
    savedOrder.subOrders = subOrderIds;
    await savedOrder.save();

    // Step 4: Initiate M-Pesa STK Push
    const accessToken = await getAccessToken();
    const ngrokUrl = await getNgrokUrl(); // For callback
    const formattedPhone = formatPhoneNumber(user?.userData.phoneNumber);

    const stkPushResponse = await initiateStkPush({
      accessToken,
      phoneNumber: formattedPhone,
      amount: Math.round(1),
      orderId: savedOrder._id,
      callbackUrl: `https://0c8d-102-211-145-215.ngrok-free.app/callback`,
    });

    // Step 5: Save CheckoutRequestID to Order
    const checkoutRequestID = stkPushResponse?.CheckoutRequestID;
    if (checkoutRequestID) {
      savedOrder.checkoutRequestID = checkoutRequestID;
      await savedOrder.save();
    }

    // Step 6: Respond to user
    res.status(201).json({
      message: "Order created. STK push sent to phone.",
      orderId: savedOrder._id,
      stkPushResponse,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Something went wrong", error: error.message });
  }
};

const makeOrder = async (req, res) => {
  try {
    const { items, paymentMethod, total, tax, shipping, user } = req.body;

    const newOrder = new Order({
      buyerId: user.userData._id,
      items: items.map((item) => ({
        product: item._id,
        quantity: item.quantity,
      })),
      paymentMethod,
      total,
      tax,
      shipping,
    });
    const address = await Address.findOne({
      userId: user.userData._id,
    });
    if (!address) {
      let newAddress = new Address({
        userId: user.userData._id,
        street: user?.addressData?.street,
        county: user?.addressData?.county,
        town: user?.addressData?.town,
      });
      await newAddress.save();
    }
    const savedOrder = await newOrder.save();

    const farmerGroups = {};
    for (const item of items) {
      if (!farmerGroups[item.farmerId]) {
        farmerGroups[item.farmerId] = [];
      }
      farmerGroups[item.farmerId].push(item);
    }

    const subOrderIds = [];
    for (const farmerId in farmerGroups) {
      const farmerItems = farmerGroups[farmerId];
      const subOrder = new SubOrderModel({
        farmer: farmerId,
        order: savedOrder._id,
        products: farmerItems.map((prod) => ({
          product: prod._id,
          quantity: prod.quantity,
          price: prod.price,
        })),
        subtotal: farmerItems.reduce(
          (sum, prod) => sum + prod.price * prod.quantity,
          0
        ),
      });

      const savedSubOrder = await subOrder.save();
      subOrderIds.push(savedSubOrder._id);
    }

    savedOrder.subOrders = subOrderIds;
    await savedOrder.save();

    const accessToken = await getAccessToken();
    const ngrokUrl = await getNgrokUrl();
    const formattedPhone = formatPhoneNumber(user?.userData.phoneNumber);
    console.log("Formatted Phone Number:", formattedPhone);

    const stkPushResponse = await initiateStkPush({
      accessToken,
      phoneNumber: formattedPhone,
      amount: Math.round(total), // Use total instead of 1
      orderId: savedOrder._id,
      callbackUrl: `${ngrokUrl}/callback`,
    });

    const checkoutRequestID = stkPushResponse?.CheckoutRequestID;
    if (checkoutRequestID) {
      savedOrder.checkoutRequestID = checkoutRequestID;
      await savedOrder.save();
    }

    res.status(201).json({
      message: "Order created. STK push sent to phone.",
      orderId: savedOrder._id,
      stkPushResponse,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Something went wrong", error: error.message });
  }
};

const getSalesReport = async (req, res) => {
  try {
    const completedOrders = await Order.find({
      status: "completed",
      isPaid: true,
    });

    const totalRevenue = completedOrders.reduce(
      (sum, order) => sum + order.total,
      0
    );
    const totalOrders = completedOrders.length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const pendingOrders = await Order.countDocuments({ status: "pending" });
    const canceledOrders = await Order.countDocuments({ status: "cancelled" });

    // Orders by payment method
    const paymentMethodAgg = await Order.aggregate([
      { $match: { status: "completed", isPaid: true } },
      {
        $group: {
          _id: "$paymentMethod",
          count: { $sum: 1 },
          revenue: { $sum: "$total" },
        },
      },
    ]);

    // Revenue over time (last 30 days)
    const last30Days = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          status: "completed",
          isPaid: true,
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          dailyRevenue: { $sum: "$total" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.status(200).json({
      totalRevenue,
      totalOrders,
      averageOrderValue,
      pendingOrders,
      canceledOrders,
      paymentMethodStats: paymentMethodAgg,
      revenueTrend: last30Days,
    });
  } catch (error) {
    console.error("Sales report error:", error);
    res.status(500).json({ message: "Server error generating report." });
  }
};
const downloadSalesReportPDF = async (req, res) => {
  try {
    const completedOrders = await Order.find({
      status: "completed",
      isPaid: true,
    });

    const totalRevenue = completedOrders.reduce(
      (sum, order) => sum + order.total,
      0
    );
    const totalOrders = completedOrders.length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const pendingOrders = await Order.countDocuments({ status: "pending" });
    const canceledOrders = await Order.countDocuments({ status: "cancelled" });

    const paymentMethodAgg = await Order.aggregate([
      { $match: { status: "completed", isPaid: true } },
      {
        $group: {
          _id: "$paymentMethod",
          count: { $sum: 1 },
          revenue: { $sum: "$total" },
        },
      },
    ]);

    const last30Days = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          status: "completed",
          isPaid: true,
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          dailyRevenue: { $sum: "$total" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Create PDF
    const doc = new PDFDocument({ margin: 50 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=sales-report.pdf"
    );

    doc.pipe(res);

    // --- HEADER ---
    doc
      .fontSize(20)
      .fillColor("#333333")
      .text("Sales Performance Report", { align: "center", underline: true });
    doc.moveDown(0.5);

    doc
      .fontSize(10)
      .fillColor("#666666")
      .text(`Generated on: ${new Date().toLocaleString()}`, { align: "center" })
      .text(`Generated by: System Administrator`, { align: "center" });

    doc.moveDown(1);

    // --- SUMMARY SECTION ---
    doc
      .fillColor("#000000")
      .fontSize(14)
      .text("Overview Summary", { underline: true });
    doc.moveDown(0.5);

    doc
      .fontSize(12)
      .list(
        [
          `Total Revenue: Ksh ${totalRevenue.toLocaleString()}`,
          `Total Orders: ${totalOrders}`,
          `Average Order Value: Ksh ${averageOrderValue.toFixed(2)}`,
          `Pending Orders: ${pendingOrders}`,
          `Canceled Orders: ${canceledOrders}`,
        ],
        { bulletIndent: 20 }
      );

    doc.moveDown(1);

    // --- PAYMENT METHODS SECTION ---
    doc.fontSize(14).text("Payment Methods Summary", { underline: true });
    doc.moveDown(0.5);

    paymentMethodAgg.forEach((pm) => {
      doc
        .fontSize(12)
        .text(
          `• ${pm._id}: ${
            pm.count
          } orders | Ksh ${pm.revenue.toLocaleString()}`,
          { indent: 20 }
        );
    });

    doc.moveDown(1);

    // --- REVENUE TREND SECTION ---
    doc.fontSize(14).text("Revenue Trend (Last 30 Days)", { underline: true });
    doc.moveDown(0.5);

    last30Days.forEach((entry) => {
      doc
        .fontSize(12)
        .text(
          `• ${entry._id}: Ksh ${entry.dailyRevenue.toLocaleString()} (${
            entry.count
          } orders)`,
          { indent: 20 }
        );
    });

    doc.end();
  } catch (err) {
    console.error("PDF generation error:", err);
    res.status(500).json({ message: "Error generating PDF" });
  }
};

module.exports = {
  makeOrder,
  createOrder,
  markAsDelivered,
  getOrders,
  getOrdersForUser,
  getOrdersForFarmer,
  acceptOrder,
  confirmPayment,
  releaseProduct,
  createOrder,
  getSalesReport,
  downloadSalesReportPDF,
};
