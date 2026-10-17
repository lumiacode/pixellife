// تنظیمات فرایند ثبت سفارش. برای افزودن روش پرداخت یا ارسال جدید (مثلاً اسنپ‌پی)
// یک مورد به لیست مربوطه اضافه کنید و enabled را true بگذارید.
module.exports = {
  // ارسال برای سفارش‌های با جمع کالای بیشتر یا مساوی این مبلغ (تومان) رایگان است.
  freeShippingThreshold: 5000000,

  shippingMethods: [
    {
      id: "post",
      title: "ارسال پستی",
      eta: "تحویل تا ۳ روز کاری پس از ثبت سفارش",
      fee: 150000,
      enabled: true,
    },
  ],

  // orderPaymentMethod مقدار فیلد paymentMethod در مدل Order است.
  paymentMethods: [
    {
      id: "zarinpal",
      title: "پرداخت اینترنتی",
      description: "پرداخت امن با کارت‌های عضو شتاب از طریق درگاه زرین‌پال",
      orderPaymentMethod: "online",
      enabled: true,
    },
  ],
};
