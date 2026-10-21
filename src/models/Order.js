const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    items: [{
      product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
      name: { type: String, required: true }, brand: { type: String, default: "" }, image: { type: String, default: "" },
      price: { type: Number, required: true, min: 0 }, quantity: { type: Number, required: true, min: 1 },
      color: { type: String, default: "" }, storage: { type: String, default: "" }, warranty: { type: String, default: "" },
    }],
    shippingAddress: {
      receiverName: { type: String, required: true }, receiverMobile: { type: String, required: true },
      province: { type: String, required: true }, city: { type: String, required: true },
      fullAddress: { type: String, required: true }, postalCode: { type: String, default: "" },
      location: { type: new mongoose.Schema({ lat: Number, lng: Number, accuracy: Number }, { _id: false }), default: undefined },
    },
    shippingMethod: { id: { type: String, default: "post" }, title: { type: String, default: "ارسال پستی" } },
    discountCode: { type: String, default: "" },
    // سفارش پرداخت‌نشده‌ای که با ثبت سفارش جدید جایگزین شده؛ در لیست سفارش‌های کاربر نمایش داده نمی‌شود.
    superseded: { type: Boolean, default: false },
    // موجودی کالاها بعد از تأیید پرداخت فقط یک بار کم می‌شود.
    stockApplied: { type: Boolean, default: false },
    subtotal: { type: Number, required: true, min: 0 }, deliveryFee: { type: Number, default: 0, min: 0 },
    discount: { type: Number, default: 0, min: 0 }, total: { type: Number, required: true, min: 0 },
    paymentMethod: { type: String, enum: ["online", "bale"], default: "online" },
    paymentStatus: { type: String, enum: ["unpaid", "paid", "failed"], default: "unpaid" },
    status: { type: String, enum: ["awaiting_payment", "processing", "shipped", "delivered", "cancelled", "returned"], default: "awaiting_payment", index: true },
    statusHistory: [{ _id: false, status: String, note: String, changedAt: { type: Date, default: Date.now } }],
    // مرحله‌های روند ارسال که ادمین تیک زده است (به ترتیب: confirmed، packed، shipped، delivered)
    trackingSteps: [{ _id: false, key: { type: String, required: true }, at: { type: Date, default: Date.now } }],
    balePayment: {
      payload: { type: String, default: "", index: true },
      chatId: { type: String, default: "" },
      amountRial: { type: Number, default: 0 },
      status: { type: String, enum: ["created", "sent", "paid", "failed"], default: "created" },
      chargeId: { type: String, default: "" },
      expiresAt: { type: Date, default: null },
      paidAt: { type: Date, default: null },
    },
    zarinpal: {
      authority: { type: String, default: "", index: true },
      refId: { type: Number, default: null },
      cardPan: { type: String, default: "" },
      paidAt: { type: Date, default: null },
    },
  },
  { timestamps: true },
);
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });

orderSchema.pre("validate", function () {
  if (!this.orderNumber) this.orderNumber = `PL-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
  if (!this.statusHistory?.length) this.statusHistory = [{ status: this.status, note: "سفارش ثبت شد" }];
});

module.exports = mongoose.model("Order", orderSchema);
