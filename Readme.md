# FarmConnect API - Node.js Backend

A backend REST API built with Node.js and Express to support the **FarmConnect** platform—a system designed to eliminate middlemen in the agricultural supply chain. This platform empowers farmers by directly connecting them to verified buyers and managing logistics, payments, and withdrawals seamlessly.

---

## 🚀 Purpose

Many farmers are exploited by brokers who buy low and sell high. **FarmConnect** eliminates this by:

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
```

---

## 🔐 Authentication

- Uses **JWT tokens** for secure route access
- Protected routes based on user role (`farmer`, `buyer`)

---

## 💳 M-PESA Integration

- Buyers pay via **STK Push**
- Payment validation handled via callback URL
- Farmers’ wallet balance updated after successful payment
- Farmers can **request withdrawals**, triggering M-PESA B2C payments

---

## 🛠️ Tech Stack

- **Node.js + Express**
- **MongoDB + Mongoose**
- **JWT** for Auth
- **M-PESA Daraja API** for payments
- **Dotenv** for environment management

---

## 🧪 API Endpoints

| Method | Endpoint             | Role   | Description                    |
| ------ | -------------------- | ------ | ------------------------------ |
| POST   | /api/auth/register   | All    | Register as buyer or farmer    |
| POST   | /api/auth/login      | All    | Login and receive token        |
| POST   | /api/products        | Farmer | Add a new product              |
| GET    | /api/products        | Buyer  | View available products        |
| POST   | /api/orders          | Buyer  | Place order & initiate payment |
| GET    | /api/orders          | Farmer | View orders placed             |
| GET    | /api/wallet          | Farmer | View wallet & balance          |
| POST   | /api/wallet/withdraw | Farmer | Request withdrawal             |

---

## 🧰 Installation

```bash
git clone https://github.com/ChrisOwuor/ase.git
cd farmApp
npm install
cp .env.example .env
# Fill in environment variables
npm run dev
```

---

## ⚙️ Environment Variables (`.env`)

```env
PORT=5000
MONGO_URI=mongodb+srv://your-mongo-uri
JWT_SECRET=your_jwt_secret
MPESA_CONSUMER_KEY=xxx
MPESA_CONSUMER_SECRET=xxx
MPESA_SHORTCODE=600XXX
MPESA_PASSKEY=xxx
CALLBACK_URL=https://yourdomain.com/api/mpesa/callback
```

---

## 📌 Roadmap

- Add admin panel and dashboard analytics
- Enhance order lifecycle management with delivery tracking
- Exportable farmer transaction statements
- Add SMS notifications for key actions

---

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

---

## 📄 License

[MIT](LICENSE)

---

## 🙌 Acknowledgements

This project is built for submission to the **MLH Fellowship** program to showcase practical problem-solving for real-world issues in agriculture and fintech.

---

