const sharp = require("sharp");
const path = require("path");
const fs = require("fs");
const ngrok = require("ngrok");
const dotenv = require("dotenv");
dotenv.config();

// ------------------------
// Image Compression Middleware
// ------------------------
async function compressImage(req, res, next) {
  if (!req.file) {
    return next(); // No file to compress
  }

  try {
    const { filename, path: tempPath } = req.file;
    const outputFilename = `compressed-${filename}`;
    const outputPath = path.join(__dirname, "uploads", outputFilename);

    await sharp(tempPath)
      .resize({ width: 800 }) // Resize image
      .jpeg({ quality: 70 }) // Compress JPEG quality
      .toFile(outputPath);

    // Remove original file
    fs.unlinkSync(tempPath);

    // Update request file info
    req.file.path = outputPath;
    req.file.filename = outputFilename;

    next();
  } catch (error) {
    console.error("Error compressing image:", error);
    res.status(500).json({ message: "Image compression failed" });
  }
}

// ------------------------
// Get Nairobi TimeStamp
// ------------------------
function getTimeStamp() {
  const dateString = new Date().toLocaleString("en-US", {
    timeZone: "Africa/Nairobi",
  });
  const date = new Date(dateString);

  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0"); // Month is 0-based
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

// ------------------------
// Initialize Ngrok Tunnel
// ------------------------

let callbackUrl = null;

async function getNgrokUrl() {
  try {
    // Initialize ngrok only once
    if (!callbackUrl) {
      callbackUrl = await ngrok.connect({
        addr: process.env.PORT || 5000,
        authtoken: process.env.NGROK_AUTHTOKEN,
      });
    }
    return callbackUrl;
  } catch (error) {
    console.error("Ngrok Connection Error:", error.message);
    throw new Error("Failed to initialize Ngrok tunnel");
  }
}

// ------------------------
// Export all functions
// ------------------------
module.exports = {
  compressImage,
  getTimeStamp,
  getNgrokUrl,
};
