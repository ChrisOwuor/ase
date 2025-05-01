const express = require("express");
const {
  requestWithdrawal,
  updateWithdrawalStatus,
  getAllWithdrawals,
} = require("../controllers/withdrawalController");

const WithdrawalRouter = express.Router();

WithdrawalRouter.post("/request", requestWithdrawal);
WithdrawalRouter.post("/update-status", updateWithdrawalStatus);
WithdrawalRouter.get("/all", getAllWithdrawals);

module.exports = WithdrawalRouter;
