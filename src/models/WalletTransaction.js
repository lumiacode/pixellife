const mongoose = require("mongoose");

// دفتر کل کیف پول: هر حرکت یک ردیف؛ ردیف‌ها هرگز ویرایش یا حذف نمی‌شوند. amount علامت‌دار است (شارژ مثبت، خرج منفی).
const walletTransactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, enum: ["topup", "purchase", "refund", "adjust"], required: true },
    amount: { type: Number, required: true },
    balanceAfter: { type: Number, required: true, min: 0 },
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", default: null },
    ref: { type: String, default: "" },
    note: { type: String, default: "" },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
walletTransactionSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("WalletTransaction", walletTransactionSchema);
