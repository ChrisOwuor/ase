const axios = require("axios");
const moment = require("moment");
const dotenv = require("dotenv");
dotenv.config();

// Get M-Pesa Access Token
async function getAccessToken() {
  const auth = Buffer.from(
    `${process.env.CONSUMER_KEY}:${process.env.CONSUMER_SECRET}`
  ).toString("base64");

  const response = await axios.get(
    "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
    {
      headers: {
        Authorization: `Basic ${auth}`,
      },
    }
  );

  return response.data.access_token;
}

// Format phone number to 254 format
function formatPhoneNumber(phone) {
  let number = phone.replace(/^\+/, ""); // Remove '+' if present

  if (number.startsWith("254")) {
    return `254${number.slice(3)}`; // If starts with 254, keep it
  } else {
    return `254${number.slice(1)}`; // Remove leading 0 and prepend 254
  }
}

// Initiate STK Push
async function initiateStkPush({ phoneNumber, amount, orderId, callbackUrl }) {
  const accessToken = await getAccessToken();

  const shortCode = process.env.BUSINESS_SHORTCODE;
  const passkey = process.env.PASSKEY;
  const timestamp = moment().format("YYYYMMDDHHmmss");
  const password = Buffer.from(shortCode + passkey + timestamp).toString(
    "base64"
  );

  const formattedPhone = formatPhoneNumber(phoneNumber);

  const response = await axios.post(
    "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
    {
      BusinessShortCode: shortCode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: amount,
      PartyA: formattedPhone,
      PartyB: shortCode,
      PhoneNumber: formattedPhone,
      CallBackURL: callbackUrl,
      AccountReference: `Order${orderId}`,
      TransactionDesc: `Payment for Order ${orderId}`,
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  return response.data;
}

module.exports = {
  getAccessToken,
  formatPhoneNumber,
  initiateStkPush,
};
