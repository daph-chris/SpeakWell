const mongoose = require("mongoose");

const clientSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String },
  age: { type: String, required: true }, // can be number/string depending on dropdown
  gender: { type: String, required: true },
  contactNumber: { type: String, required: true },
  email: { type: String },
  address: { type: String },
  speechIssues: [{ type: String }], // multiple selections
  problemDescription: { type: String },
  referredBy: { type: String },
  priorityLevel: { type: String }
}, { timestamps: true });

module.exports = mongoose.model("Client", clientSchema);
