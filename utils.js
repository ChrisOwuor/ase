const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

// Image compression middleware
const compressImage = async (req, res, next) => {
  if (!req.file) {
    return next(); // Skip if no file uploaded
  }

  try {
    const { filename, path: tempPath } = req.file;
    const outputFilename = `compressed-${filename}`;
    const outputPath = path.join(__dirname, "uploads", outputFilename);

    await sharp(tempPath)
      .resize({ width: 800 }) // Resize to 800px width (optional)
      .jpeg({ quality: 70 }) // Reduce quality to 70% but keep good quality
      .toFile(outputPath);

    // Remove original file to save space
    fs.unlinkSync(tempPath);

    // Update req.file info
    req.file.path = outputPath;
    req.file.filename = outputFilename;

    next();
  } catch (error) {
    console.error("Error compressing image:", error);
    res.status(500).json({ message: "Image compression failed" });
  }
};

module.exports = compressImage;
