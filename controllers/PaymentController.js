const FarmerAccount = require("../models/FarmerAccount");
const SubOrderModel = require("../models/SubOrder.model");
const { default: SystemAccount } = require("../models/SystemAccount");
const mongoose = require("mongoose");
const Order = require("../models/Order.model");
const { default: BuyerTransaction } = require("../models/BuyerTransaction");

const handlePaymentCallbacks = async (req, res) => {
  try {
    const callbackData = req.body;
    console.log("Received STK Callback:", JSON.stringify(callbackData));

    const resultCode = callbackData?.Body?.stkCallback?.ResultCode;
    const metadata = callbackData?.Body?.stkCallback?.CallbackMetadata;
    const merchantRequestID =
      callbackData?.Body?.stkCallback?.MerchantRequestID;
    const checkoutRequestID =
      callbackData?.Body?.stkCallback?.CheckoutRequestID;

    // You should have saved merchantRequestID or checkoutRequestID in DB if needed to map orders.
    // But if you're sending Order ID in AccountReference, you can retrieve it more easily.

    // --- Get the Order ID from AccountReference or from a mapping
    const accountReference =
      callbackData?.Body?.stkCallback?.Metadata?.AccountReference || null;
    const orderId = accountReference
      ? accountReference.replace("Order", "")
      : null;

    if (!orderId) {
      console.error("Order ID missing in callback");
      return res
        .status(400)
        .json({ message: "Order ID not found in callback" });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      console.error("Order not found for callback");
      return res.status(404).json({ message: "Order not found" });
    }

    // --- Update based on payment status
    if (resultCode === 0) {
      // Payment Successful
      order.isPaid = true;
      order.paymentStatus = "Paid";
      order.paidAt = Date.now();
      await order.save();

      console.log("Payment successful for order", orderId);

      res.status(200).json({ message: "Payment successful" });
    } else {
      // Payment Failed
      order.isPaid = false;
      order.paymentStatus = "Unpaid";
      await order.save();

      console.log("Payment failed for order", orderId);

      res.status(200).json({ message: "Payment failed" });
    }
  } catch (error) {
    console.error("Error handling payment callback:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

const handlePaymentCallbacka = async (req, res) => {
  try {
    const callbackData = req.body;
    console.log("Received STK Callback:", JSON.stringify(callbackData));

    const resultCode = callbackData?.Body?.stkCallback?.ResultCode;
    const metadata = callbackData?.Body?.stkCallback?.CallbackMetadata;
    const checkoutRequestID =
      callbackData?.Body?.stkCallback?.CheckoutRequestID;

    if (!checkoutRequestID) {
      console.error("CheckoutRequestID missing in callback");
      return res.status(400).json({ message: "CheckoutRequestID not found" });
    }

    // Find the order by checkoutRequestID
    const order = await Order.findOne({ checkoutRequestID });

    if (!order) {
      console.error("Order not found for callback");
      return res.status(404).json({ message: "Order not found" });
    }

    // Update order based on payment result
    if (resultCode === 0) {
      // Payment Successful
      order.isPaid = true;
      order.paymentStatus = "Paid";
      order.paidAt = Date.now();
      await order.save();

      console.log("Payment successful for order", order._id);

      res.status(200).json({ message: "Payment successful" });
    } else {
      // Payment Failed
      order.isPaid = false;
      order.paymentStatus = "Unpaid";
      await order.save();

      console.log("Payment failed for order", order._id);

      res.status(200).json({ message: "Payment failed" });
    }
  } catch (error) {
    console.error("Error handling payment callback:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};
const handlePaymentCallbackb = async (req, res) => {
  try {
    const callbackData = req.body;
    console.log("Received STK Callback:", JSON.stringify(callbackData));

    const resultCode = callbackData?.Body?.stkCallback?.ResultCode;
    const checkoutRequestID =
      callbackData?.Body?.stkCallback?.CheckoutRequestID;

    if (!checkoutRequestID) {
      return res.status(400).json({ message: "CheckoutRequestID not found" });
    }

    const order = await Order.findOne({ checkoutRequestID }).populate(
      "subOrders"
    );
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (resultCode === 0) {
      order.isPaid = true;
      order.paymentStatus = "Paid";
      order.paidAt = Date.now();
      await order.save();

      console.log("Payment successful for order", order._id);

      // Step: Credit each farmer
      for (const subOrder of order.subOrders) {
        const farmer = await Farmer.findById(subOrder.farmer);
        if (farmer) {
          farmer.accountBalance =
            (farmer.accountBalance || 0) + subOrder.subtotal;
          await farmer.save();
          console.log(
            `Credited Farmer ${farmer._id} with KES ${subOrder.subtotal}`
          );
        }
      }

      res
        .status(200)
        .json({ message: "Payment successful and farmers credited" });
    } else {
      order.isPaid = false;
      order.paymentStatus = "Unpaid";
      await order.save();

      console.log("Payment failed for order", order._id);
      res.status(200).json({ message: "Payment failed" });
    }
  } catch (error) {
    console.error("Error handling payment callback:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};
const handlePaymentCallbackr = async (req, res) => {
  try {
    const callbackData = req.body;
    console.log("Received STK Callback:", JSON.stringify(callbackData));

    const resultCode = callbackData?.Body?.stkCallback?.ResultCode;
    const metadata = callbackData?.Body?.stkCallback?.CallbackMetadata;
    const checkoutRequestID =
      callbackData?.Body?.stkCallback?.CheckoutRequestID;

    if (!checkoutRequestID) {
      console.error("CheckoutRequestID missing in callback");
      return res.status(400).json({ message: "CheckoutRequestID not found" });
    }

    // Find the order by checkoutRequestID
    const order = await Order.findOne({ checkoutRequestID }).populate(
      "subOrders"
    );

    if (!order) {
      console.error("Order not found for callback");
      return res.status(404).json({ message: "Order not found" });
    }

    if (resultCode === 0) {
      // Payment Successful
      order.isPaid = true;
      order.paymentStatus = "Paid";
      order.paidAt = Date.now();
      await order.save();

      // Update farmer accounts
      for (const subOrderId of order.subOrders) {
        const subOrder = await SubOrderModel.findById(subOrderId);

        if (!subOrder) continue;

        const farmerId = subOrder.farmer;
        const amount = subOrder.subtotal;

        let farmerAccount = await FarmerAccount.findOne({ farmer: farmerId });

        if (!farmerAccount) {
          // Create a new account if it doesn't exist
          farmerAccount = new FarmerAccount({
            farmer: farmerId,
            totalEarnings: 0,
            pendingEarnings: 0,
            paidEarnings: 0,
            withdrawals: [],
          });
        }

        farmerAccount.totalEarnings += amount;
        farmerAccount.pendingEarnings += amount;
        await farmerAccount.save();
      }

      console.log(
        "Payment successful and farmer accounts updated for order",
        order._id
      );
      res.status(200).json({ message: "Payment successful" });
    } else {
      // Payment Failed
      order.isPaid = false;
      order.paymentStatus = "Unpaid";
      await order.save();

      console.log("Payment failed for order", order._id);
      res.status(200).json({ message: "Payment failed" });
    }
  } catch (error) {
    console.error("Error handling payment callback:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};
const handlePaymentCallbackio = async (req, res) => {
  try {
    const callbackData = req.body;
    console.log("Received STK Callback:", JSON.stringify(callbackData));

    const resultCode = callbackData?.Body?.stkCallback?.ResultCode;
    const metadata = callbackData?.Body?.stkCallback?.CallbackMetadata;
    const checkoutRequestID =
      callbackData?.Body?.stkCallback?.CheckoutRequestID;

    if (!checkoutRequestID) {
      console.error("CheckoutRequestID missing in callback");
      return res.status(400).json({ message: "CheckoutRequestID not found" });
    }

    const order = await Order.findOne({ checkoutRequestID }).populate(
      "subOrders"
    );

    if (!order) {
      console.error("Order not found for callback");
      return res.status(404).json({ message: "Order not found" });
    }

    if (resultCode === 0) {
      order.isPaid = true;
      order.paymentStatus = "Paid";
      order.paidAt = Date.now();
      await order.save();

      for (const subOrderId of order.subOrders) {
        const subOrder = await SubOrderModel.findById(subOrderId);
        if (!subOrder) continue;

        const farmerId = subOrder.farmer;
        const amount = subOrder.subtotal;

        let farmerAccount = await FarmerAccount.findOne({ farmer: farmerId });
        if (!farmerAccount) {
          farmerAccount = new FarmerAccount({
            farmer: farmerId,
            totalEarnings: 0,
            pendingEarnings: 0,
            paidEarnings: 0,
            withdrawals: [],
          });
        }

        farmerAccount.totalEarnings += amount;
        farmerAccount.pendingEarnings += amount;
        await farmerAccount.save();
      }

      // System account update
      let systemAccount = await SystemAccount.findOne();
      if (!systemAccount) {
        systemAccount = new SystemAccount({ balance: 0 });
      }

      systemAccount.balance += order.total;
      await systemAccount.save();

      // Buyer transaction
      await BuyerTransaction.create({
        buyer: order.buyerId,
        type: "DEBIT",
        category: "ORDER_PAYMENT",
        amount: order.total,
        reference: order._id.toString(),
        metadata: {
          method: "Mpesa",
          phone: metadata?.Item?.find((i) => i.Name === "PhoneNumber")?.Value,
          transactionId: metadata?.Item?.find(
            (i) => i.Name === "MpesaReceiptNumber"
          )?.Value,
        },
        timestamp: new Date(),
      });

      console.log(
        "Payment successful and accounts updated for order",
        order._id
      );
      res.status(200).json({ message: "Payment successful" });
    } else {
      order.isPaid = false;
      order.paymentStatus = "Unpaid";
      await order.save();

      console.log("Payment failed for order", order._id);
      res.status(200).json({ message: "Payment failed" });
    }
  } catch (error) {
    console.error("Error handling payment callback:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};
const handlePaymentCallback = async (req, res) => {
  try {
    const callbackData = req.body;
    console.log("Received STK Callback:", JSON.stringify(callbackData));

    const resultCode = callbackData?.Body?.stkCallback?.ResultCode;
    const metadata = callbackData?.Body?.stkCallback?.CallbackMetadata;
    const checkoutRequestID =
      callbackData?.Body?.stkCallback?.CheckoutRequestID;

    if (!checkoutRequestID) {
      console.error("CheckoutRequestID missing in callback");
      return res.status(400).json({ message: "CheckoutRequestID not found" });
    }

    const order = await Order.findOne({ checkoutRequestID }).populate(
      "subOrders"
    );
    if (!order) {
      console.error("Order not found for callback");
      return res.status(404).json({ message: "Order not found" });
    }

    if (resultCode === 0) {
      // Payment success
      order.isPaid = true;
      order.paymentStatus = "Paid";
      order.paidAt = Date.now();
      await order.save();

      for (const subOrderId of order.subOrders) {
        const subOrder = await SubOrderModel.findById(subOrderId);
        if (!subOrder) continue;

        const farmerId = subOrder.farmer;
        const amount = subOrder.subtotal;

        let farmerAccount = await FarmerAccount.findOne({ farmer: farmerId });
        if (!farmerAccount) {
          farmerAccount = new FarmerAccount({
            farmer: farmerId,
            totalEarnings: 0,
            pendingEarnings: 0,
            availableEarnings: 0,
            paidEarnings: 0,
            withdrawals: [],
          });
        }

        farmerAccount.totalEarnings += amount;
        farmerAccount.pendingEarnings += amount; // Awaiting delivery confirmation
        await farmerAccount.save();
      }

      // Update system account
      let systemAccount = await SystemAccount.findOne();
      if (!systemAccount) {
        systemAccount = new SystemAccount({ balance: 0 });
      }
      systemAccount.balance += order.total;
      await systemAccount.save();

      // Buyer transaction
      await BuyerTransaction.create({
        buyer: order.buyerId,
        type: "DEBIT",
        category: "ORDER_PAYMENT",
        amount: order.total,
        reference: order._id.toString(),
        metadata: {
          method: "Mpesa",
          phone: metadata?.Item?.find((i) => i.Name === "PhoneNumber")?.Value,
          transactionId: metadata?.Item?.find(
            (i) => i.Name === "MpesaReceiptNumber"
          )?.Value,
        },
        timestamp: new Date(),
      });

      console.log(
        "Payment successful and accounts updated for order",
        order._id
      );
      res.status(200).json({ message: "Payment successful" });
    } else {
      // Payment failure
      order.isPaid = false;
      order.paymentStatus = "Unpaid";
      await order.save();

      console.log("Payment failed for order", order._id);
      res.status(200).json({ message: "Payment failed" });
    }
  } catch (error) {
    console.error("Error handling payment callback:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};


module.exports = { handlePaymentCallback };
