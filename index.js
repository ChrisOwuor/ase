const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const listEndpoints = require("express-list-endpoints");
const cors = require("cors");
const bodyParser = require("body-parser");
const morgan = require("morgan");
const path = require("path");
const swaggerUi = require("swagger-ui-express");

const productRouter = require("./router/Product.route");
const orderRouter = require("./router/Order.route");
const userRouter = require("./router/User.route");
const inventoryRouter = require("./router/Inventory.route");
const reportRouter = require("./router/Report.route");
const paymentRouter = require("./router/Payment.route");
const authMiddleware = require("./middlewares/authMiddleware");
const swaggerDocs = require("./Swagger");
const addressRouter = require("./router/Address.route");
const authRoute = require("./router/AuthRoutes");
const adminRouter = require("./router/Admin.route");

const app = express();
dotenv.config();

// Middleware
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(morgan("dev"));

// Route
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Route to list all endpoints
app.get("/api/endpoints", (req, res) => {
  res.json(listEndpoints(app));
});
app.get("/", (req, res) => {
  res.send("Farm Produce Supply Chain API is Running...");
});

app.use("/api/users", authMiddleware(["admin", "farmer", "buyer"]), userRouter);
app.use("/api/stats", authMiddleware(["admin",]), adminRouter);

app.use("/api/address", addressRouter);
app.use("/api/products", productRouter); // protected
app.use("/api/orders", orderRouter);
app.use("/api/auth", authRoute); // public
app.use("/api/inventory", authMiddleware(["admin", "farmer"]), inventoryRouter); // protected
app.use("/api/reports", authMiddleware(["admin", "buyer"]), reportRouter); // protected
app.use("/api/payment", authMiddleware(["admin", "farmer"]), paymentRouter); // protected
// app.use('/api/manage-products', authMiddleware, productManagementRoutes);

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, 'localhost', () => {
      console.log(`Server running at ${PORT}`);
      console.log("MongoDB Connected");
    });
  })
  .catch((err) => console.log(err));

// Error Handling
app.use((req, res, next) => {
  const error = new Error("Not found");
  error.status = 404;
  next(error);
});

app.use((error, req, res, next) => {
  res.status(error.status || 500);
  res.json({
    error: {
      message: error.message,
    },
  });
});
