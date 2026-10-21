const mongoose = require("mongoose");

// درخواست شارژ کیف پول از درگاه؛ فقط وقتی «paid» شود موجودی اضافه می‌شود (یک‌بار، با claim اتمیک).
const walletTopupSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    amount: { type: Number, required: true, min: 1 },
    status: { type: String, enum: ["pending", "paid", "failed"], default: "pending", index: true },
    authority: { type: String, default: "", index: true },
    refId: { type: Number, default: null },
    cardPan: { type: String, default: "" },
    paidAt: { type: Date, default: null },
  },
  { timestamps: true },
);

module.exports = mongoose.model("WalletTopup", walletTopupSchema);
