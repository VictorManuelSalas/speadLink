import mongoose from "mongoose";

const customerSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ["Processed", "Agendado", "Inactive"],
    default: "Agendado",
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: false,
  },
  phone: {
    type: String,
    required: true,
  },

  plan: {
    type: String,
    required: true,
  },
  megas: {
    type: String,
    required: true,
  },
  date_to_Pay: {
    type: Date,
    required: true,
  },
  services: Array,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("Customer", customerSchema);
