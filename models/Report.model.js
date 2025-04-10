const mongoose = require("mongoose");

const ReportSchema = new mongoose.Schema({
    reportType: { type: String, enum: ["Sales", "Inventory"], required: true },
    generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    data: { type: Object, required: true }, // Stores sales or inventory details
    createdAt: { type: Date, default: Date.now },
});

const Report=  mongoose.model("Report", ReportSchema);
module.exports = Report;
