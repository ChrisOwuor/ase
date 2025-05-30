# FarmApp API - Node.js Backend

A backend REST API built with Node.js and Express to support the **FarmApp** platform—a system designed to eliminate middlemen in the agricultural supply chain. This platform empowers farmers by directly connecting them to verified buyers and managing logistics, payments, and withdrawals seamlessly.

---

## 🚀 Purpose

Many farmers are exploited by brokers who buy low and sell high. **FarmApp** eliminates this by:

- Allowing farmers to list their produce
- Enabling buyers to directly place and pay for orders
- Managing logistics centrally
- Paying farmers directly via **M-PESA**

---

## 🧩 Features

- ✅ Farmer and Buyer registration/login (JWT Auth)
- ✅ Role-based access (Farmer / Buyer)
- ✅ Product listing (Farmers)
- ✅ Order placement (Buyers)
- ✅ M-PESA payment integration (via STK push)
- ✅ Order tracking for both parties
- ✅ Farmer wallets and balance tracking
- ✅ Withdrawal requests by farmers

---

## 📁 Folder Structure

```bash
├── controllers        # Route logic
├── models             # Mongoose schemas
├── routes             # Express routes
├── middleware         # Authentication & error handling
├── services           # Mpesa & utility services
├── config             # DB & environment config
├── app.js             # Main app entry
├── server.js          # Starts the server


## 🔐 Authentication

Uses JWT tokens for secure route access

Protected routes based on user role (farmer, buyer)

## 💳 M-PESA Integration

Buyers pay via STK Push

Payment validation handled via callback URL

Farmers’ wallet balance updated after successful payment

Farmers can request withdrawals, triggering M-PESA B2C payments

## 🛠️ Tech Stack

Node.js + Express

MongoDB + Mongoose

JWT for Auth

M-PESA Daraja API for payments

Dotenv for environment management
