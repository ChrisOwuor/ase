const express = require("express");
const {
  addProduct,
  getProducts,
  getFarmerProducts,
  updateProduct,
  deleteProduct,
  getSingleProduct,
} = require("../controllers/ProductController");
const productRouter = express.Router();

const multer = require("multer");
const authMiddleware = require("../middlewares/authMiddleware");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads"); // Specify the directory to save uploaded files
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname); // Append timestamp to the original file name
  },
});
const upload = multer({ storage: storage }).single("image"); // Use .single() to handle single file uploads with the field name 'image'

productRouter.post(
  "/",
  authMiddleware(["admin", "farmer"]),
  upload,
  addProduct
); // Route to add a new product with image upload
productRouter.get("/", getProducts);
productRouter.get(
  "/farmer",
  authMiddleware(["admin", "farmer"]),
  getFarmerProducts
);
productRouter.put("/:id", authMiddleware(["admin", "farmer"]), updateProduct);
productRouter.delete(
  "/:id",
  authMiddleware(["admin", "farmer"]),
  deleteProduct
);
productRouter.get("/:id", getSingleProduct);
module.exports = productRouter;
