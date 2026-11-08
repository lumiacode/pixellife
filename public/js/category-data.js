/* داده‌های دسته‌بندی‌های سایت؛ تنها منبع برای مگامنوی دسکتاپ و کشوی دسته‌بندی موبایل.
   group: {title, href?, links?, groups?: زیرتیترهای هم‌ستون} */
window.PLCategories = [
  {
    "id": "mobile",
    "name": "موبایل",
    "icon": "ti-device-mobile",
    "groups": [
      {
        "title": "برندهای موبایل",
        "links": [
          {
            "label": "آیفون",
            "href": "/iphone"
          },
          {
            "label": "سامسونگ",
            "href": "/samsung"
          },
          {
            "label": "شیائومی",
            "href": "/xiaomi"
          }
        ]
      },
      {
        "title": "لوازم جانبی موبایل",
        "href": "/accessories",
        "links": [
          {
            "label": "اپل",
            "href": "/accessories/apple",
            "children": [
              {
                "label": "قاب",
                "href": "/accessories/apple/case"
              },
              {
                "label": "گلس",
                "href": "/accessories/apple/glass"
              },
              {
                "label": "شارژر",
                "href": "/accessories/apple/charger"
              },
              {
                "label": "کیف",
                "href": "/accessories/apple/bag"
              }
            ]
          },
          {
            "label": "سامسونگ",
            "href": "/accessories/samsung",
            "children": [
              {
                "label": "قاب",
                "href": "/accessories/samsung/case"
              },
              {
                "label": "گلس",
                "href": "/accessories/samsung/glass"
              },
              {
                "label": "شارژر",
                "href": "/accessories/samsung/charger"
              },
              {
                "label": "کیف",
                "href": "/accessories/samsung/bag"
              }
            ]
          },
          {
            "label": "شیائومی",
            "href": "/accessories/xiaomi",
            "children": [
              {
                "label": "قاب",
                "href": "/accessories/xiaomi/case"
              },
              {
                "label": "گلس",
                "href": "/accessories/xiaomi/glass"
              },
              {
                "label": "شارژر",
                "href": "/accessories/xiaomi/charger"
              },
              {
                "label": "کیف",
                "href": "/accessories/xiaomi/bag"
              }
            ]
          }
        ]
      }
    ],
    "image": "/images/categories/menu-mobile.svg?v=2"
  },
  {
    "id": "tablet",
    "name": "تبلت",
    "icon": "ti-device-tablet",
    "groups": [
      {
        "title": "تبلت",
        "links": [
          {
            "label": "اپل",
            "href": "/ipad"
          },
          {
            "label": "سامسونگ",
            "href": "/samsungtab"
          },
          {
            "label": "شیائومی",
            "href": "/xiaomitab"
          },
          {
            "label": "همه تبلت‌ها",
            "href": "/tablets"
          }
        ]
      }
    ],
    "image": "/images/categories/menu-tablet.svg?v=2"
  },
  {
    "id": "headphone",
    "name": "هدفون و هندزفری",
    "icon": "ti-headphones",
    "groups": [
      {
        "title": "هدفون و هندزفری",
        "links": [
          {
            "label": "اپل",
            "href": "/headphones?brand=%D8%A7%D9%BE%D9%84"
          },
          {
            "label": "سامسونگ",
            "href": "/headphones?brand=%D8%B3%D8%A7%D9%85%D8%B3%D9%88%D9%86%DA%AF"
          },
          {
            "label": "همه هدفون‌ها",
            "href": "/headphones"
          }
        ]
      }
    ],
    "image": "/images/categories/menu-headphone.svg?v=2"
  },
  {
    "id": "watch",
    "name": "ساعت هوشمند",
    "icon": "ti-device-watch",
    "groups": [
      {
        "title": "ساعت هوشمند",
        "links": [
          {
            "label": "اپل",
            "href": "/smartwatches?brand=%D8%A7%D9%BE%D9%84"
          },
          {
            "label": "سامسونگ",
            "href": "/smartwatches?brand=%D8%B3%D8%A7%D9%85%D8%B3%D9%88%D9%86%DA%AF"
          },
          {
            "label": "همه ساعت‌ها",
            "href": "/smartwatches"
          }
        ]
      }
    ],
    "image": "/images/categories/menu-watch.svg?v=2"
  },
  {
    "id": "console",
    "name": "کنسول بازی",
    "icon": "ti-device-gamepad-2",
    "logoLinks": [
      {
        "label": "پلی‌استیشن",
        "href": "/console?brand=playstation",
        "image": "/images/categories/logo-playstation.png"
      },
      {
        "label": "ایکس‌باکس",
        "href": "/console?brand=xbox",
        "image": "/images/categories/logo-xbox.png"
      }
    ],
    "image": "/images/categories/menu-console.svg?v=2"
  }
];
