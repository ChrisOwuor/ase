const FarmerAccount = require("../models/FarmerAccount");
const { default: SystemAccount } = require("../models/SystemAccount");
const WithdrawalModel = require("../models/Withdrawal.model");

const getAllWithdrawals = async (req, res) => {
  try {
    const withdrawals = await WithdrawalModel.find()
      .populate("farmer", "name email phoneNumber")
      .sort({ createdAt: -1 });

    // Get system account (assuming only one document exists)
    const systemAccount = await SystemAccount.findOne();

    res.status(200).json({
      withdrawals,
      systemBalance: systemAccount?.balance || 0,
    });
  } catch (err) {
    res.status(500).json({
      message: "Failed to fetch withdrawals",
      error: err.message,
    });
  }
};

const updateWithdrawalStatus = async (req, res) => {
  try {
    const { withdrawalId, action } = req.body;

    const withdrawal = await WithdrawalModel.findById(withdrawalId);
    if (!withdrawal) {
      return res.status(404).json({ message: "Withdrawal not found" });
    }

    if (withdrawal.status !== "pending") {
      return res.status(400).json({ message: "Withdrawal already processed" });
    }

    const farmerAccount = await FarmerAccount.findOne({
      farmer: withdrawal.farmer,
    });
    if (!farmerAccount) {
      return res.status(404).json({ message: "Farmer account not found" });
    }

    const systemBalance = await SystemAccount.findOne(); // assuming single record
    if (!systemBalance) {
      return res
        .status(500)
        .json({ message: "System balance record not found" });
    }

    if (action === "approve") {
      // Step 1: Check if farmer has enough available balance
      if (farmerAccount.availableEarnings < withdrawal.amount) {
        return res
          .status(400)
          .json({ message: "Farmer has insufficient available earnings" });
      }

      // Step 2: Check if system has enough funds
      if (systemBalance.balance < withdrawal.amount) {
        return res
          .status(400)
          .json({ message: "System has insufficient funds" });
      }

      // Step 3: Update balances
      farmerAccount.availableEarnings -= withdrawal.amount;
      farmerAccount.paidEarnings += withdrawal.amount;

      systemBalance.balance -= withdrawal.amount;

      withdrawal.status = "approved";
    } else if (action === "reject") {
      // Step 1: Update the withdrawal status to rejected
      if (withdrawal.status === "approved") {
        return res
          .status(400)
          .json({ message: "Withdrawal already processed" });
      }
      withdrawal.status = "rejected";
    } else {
      return res.status(400).json({ message: "Invalid action" });
    }

    // Save changes
    await Promise.all([
      withdrawal.save(),
      farmerAccount.save(),
      systemBalance.save(),
    ]);

    return res.status(200).json({
      message: `Withdrawal ${action}d successfully`,
      withdrawal,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Error updating withdrawal",
      error: err.message,
    });
  }
};

const requestWithdrawal = async (req, res) => {
  try {
    const { amount } = req.body;
    let farmerId = req.user._id; // Assuming the farmer ID is in the request user object

    const account = await FarmerAccount.findOne({ farmer: farmerId });
    if (!account)
      return res.status(404).json({ message: "Farmer account not found" });

    if (amount > account.availableEarnings) {
      return res.status(400).json({ message: "Insufficient pending earnings" });
    }

    const withdrawal = new WithdrawalModel({
      farmer: farmerId,
      amount,
    });

    await withdrawal.save();

    res
      .status(201)
      .json({ message: "Withdrawal request submitted", withdrawal });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error requesting withdrawal", error: err.message });
  }
};

module.exports = {
  requestWithdrawal,
  getAllWithdrawals,
  updateWithdrawalStatus,
};
