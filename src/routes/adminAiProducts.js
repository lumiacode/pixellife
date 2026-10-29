const express=require("express");
const axios=require("axios");
const Product=require("../models/Product");
const requireAdmin=require("../middleware/adminAuth");
const adminSession=require("../middleware/adminSession");
const { getAiConfig } = require("../services/aiSettings");
const router=express.Router();
router.use(express.json({limit:"80kb"}));router.use(adminSession);router.use(requireAdmin);
const allowed=["description","specs","seoTitle","seoDescription","instagramCaption"];
const recent=new Map();
router.post("/products/suggest",async(req,res)=>{try{
 const aiConfig=await getAiConfig();if(!aiConfig.apiKey)return res.status(503).json({success:false,message:"کلید OpenAI ثبت نشده است؛ از منوی «هوش مصنوعی» در پنل کلید را وارد کنید"});
 const key=req.sessionID||req.ip,now=Date.now();if(now-(recent.get(key)||0)<5000)return res.status(429).json({success:false,message:"لطفاً چند ثانیه صبر کنید"});recent.set(key,now);
 const product=await Product.findById(req.body.productId).lean();if(!product)return res.status(404).json({success:false,message:"محصول پیدا نشد"});
 const instruction=String(req.body.request||"").trim().slice(0,1200);if(!instruction)return res.status(400).json({success:false,message:"درخواست را بنویسید"});
 const prompt=`شما دستیار محتوای فروشگاه PixelLife هستید. فقط بر اساس اطلاعات داده‌شده و بدون ساختن مشخصات فنی نامطمئن پاسخ بده. درخواست مدیر: ${instruction}\nمحصول: ${JSON.stringify({name:product.name,brand:product.brand,category:product.category,price:product.price,description:product.description,specs:product.specs})}\nپاسخ فقط یک JSON معتبر باشد، با کلیدهای description,specs,seoTitle,seoDescription,instagramCaption. فقط کلیدهایی را که درخواست کرده‌ای پر کن.`;
 const response=await axios.post("https://api.openai.com/v1/responses",{model:process.env.OPENAI_ADMIN_MODEL||"gpt-5.6",input:prompt},{headers:{Authorization:`Bearer ${aiConfig.apiKey}`,"Content-Type":"application/json"},timeout:60000});
 const text=response.data.output_text||"";let suggestions;try{suggestions=JSON.parse(text.replace(/^\`\`\`json\s*|\s*\`\`\`$/g,"").trim())}catch(_){return res.status(502).json({success:false,message:"پاسخ هوش مصنوعی ساختار قابل‌اعمال ندارد",raw:text})}
 res.json({success:true,suggestions:Object.fromEntries(Object.entries(suggestions).filter(([k,v])=>allowed.includes(k)&&typeof v==="string"))});
}catch(e){res.status(e.response?.status||500).json({success:false,message:e.response?.data?.error?.message||e.message})}});
router.patch("/products/:id/apply",async(req,res)=>{try{const changes=Object.fromEntries(Object.entries(req.body?.changes||{}).filter(([k,v])=>allowed.includes(k)&&typeof v==="string"));if(!Object.keys(changes).length)return res.status(400).json({success:false,message:"تغییر قابل اعمالی انتخاب نشده است"});const product=await Product.findByIdAndUpdate(req.params.id,{$set:changes},{new:true});if(!product)return res.status(404).json({success:false,message:"محصول پیدا نشد"});res.json({success:true,product});}catch(e){res.status(500).json({success:false,message:e.message})}});
module.exports=router;