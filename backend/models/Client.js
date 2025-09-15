const mongoose = require("mongoose");

const ClientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  mobile: { type: String, required: true },
  age: { type: Number, required: true },
  description: { type: String },
  therapistId: { type: mongoose.Schema.Types.ObjectId, ref: "Therapist" }
});

module.exports = mongoose.model("Client", ClientSchema);
