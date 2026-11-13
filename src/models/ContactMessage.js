const mongoose = require("mongoose");

const contactMessageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      default: null,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    orderNumber: {
      type: String,
      trim: true,
      default: "",
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    // حساب کاربری که پیام را فرستاده (فقط کاربر واردشده می‌تواند پیام بفرستد)
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    status: {
      type: String,
      enum: ["new", "read", "replied"],
      default: "new",
    },
  },
  {
    timestamps: true,
  },
);

module.exports =
  mongoose.models.ContactMessage ||
  mongoose.model("ContactMessage", contactMessageSchema);
