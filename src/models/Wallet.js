const mongoose = require("mongoose");

// موجودی کیف پول هر کاربر (تومان، عدد صحیح). جمع تراکنش‌های WalletTransaction باید همیشه با این عدد برابر باشد.
const walletSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    balance: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Wallet", walletSchema);
