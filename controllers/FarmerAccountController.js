const FarmerAccount = require("../models/FarmerAccount");
const WithdrawalModel = require("../models/Withdrawal.model");

const getFarmerAccount = async (req, res) => {
  try {
    // Get the farmer's ID from the authenticated user (via token or session)
    const farmerId = req.user._id;

    // Find the farmer's account details
    const farmerAccount = await FarmerAccount.findOne({
      farmer: farmerId,
    }).populate("farmer", "name email phoneNumber");

    if (!farmerAccount) {
      return res.status(404).json({ message: "Farmer account not found" });
    }
    const withdrawals = await WithdrawalModel.find({ farmer: req.user._id })
      .populate("farmer", "name email phoneNumber")
      .sort({ createdAt: -1 });

    // Fetch withdrawal history from the embedded withdrawals field

    // Respond with account details and withdrawal history
    res.status(200).json({
      totalEarnings: farmerAccount.totalEarnings,
      pendingEarnings: farmerAccount.pendingEarnings,
      paidEarnings: farmerAccount.paidEarnings,
      availableEarnings: farmerAccount.availableEarnings,
      withdrawals,
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching farmer account", error: err.message });
  }
};

module.exports = {
  getFarmerAccount,
};
