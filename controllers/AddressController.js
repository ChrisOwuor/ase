const Address = require("../models/Address.model");

// Create Address
const createAddress = async (req, res) => {
  try {
    const { street, town, county } = req.body;
    const userId = req.user.id; // Assume user is authenticated

    const address = await Address.create({
      userId,
      street,
      town,
      county,
    });
    res.status(201).json(address);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get User Addresses
const getAddresses = async (req, res) => {
  try {
    const userId = req.user.id;
    const addresses = await Address.find({ userId });
    res.json(addresses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get Single Address
const getAddress = async (req, res) => {
  try {
    const address = await Address.findById(req.params.id);
    if (!address) return res.status(404).json({ message: "Address not found" });
    res.json(address);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update Address
const updateAddress = async (req, res) => {
  try {
    const { street, town, county } = req.body;
    const userId = req.user.id;

    const address = await Address.findByIdAndUpdate(
      req.params.id,
      { street, town, county }, // Fixed city → town
      { new: true }
    );

    if (!address) return res.status(404).json({ message: "Address not found" });
    res.json(address);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete Address
const deleteAddress = async (req, res) => {
  try {
    const address = await Address.findByIdAndDelete(req.params.id);
    if (!address) return res.status(404).json({ message: "Address not found" });
    res.json({ message: "Address deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Export all controllers
module.exports = {
  createAddress,
  getAddresses,
  getAddress,
  updateAddress,
  deleteAddress,
};
