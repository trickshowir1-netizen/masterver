import fetch from 'node-fetch';

export const config = {
  runtime: 'nodejs',
};

export default async function handler(req, res) {
  // ۱. گرفتن مقصد از متغیرها یا تنظیم دستی
  const target = (process.env.TARGET_DOMAIN || "").trim().replace(/\/+$/, "");
  
  if (!target) {
    return res.status(500).send("Target Domain not set!");
  }

  // ۲. ساخت آدرس نهایی (بدون لو رفتن ساختار پروکسی)
  const targetUrl = target + req.url;

  // ۳. فیلتر کردن هدرهای حساس برای مخفی‌کاری بیشتر
  const headers = {};
  const forbiddenHeaders = [
    'host', 'connection', 'x-forwarded-for', 'x-real-ip', 
    'cf-connecting-ip', 'forwarded', 'via'
  ];

  Object.entries(req.headers).forEach(([key, value]) => {
    if (!forbiddenHeaders.includes(key.toLowerCase())) {
      headers[key] = value;
    }
  });

  // ۴. شبیه‌سازی ترافیک مرورگر
  headers['user-agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: headers,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? req : undefined,
      redirect: 'manual',
      compress: false // برای جلوگیری از دستکاری دیتا توسط ورکل
    });

    // ۵. کپی کردن هدرهای بازگشتی به گوشی
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    res.status(response.status);
    
    // ارسال مستقیم دیتا برای کاهش پینگ
    response.body.pipe(res);

  } catch (e) {
    console.error("Relay Error:", e.message);
    res.status(502).json({ error: "Gateway Error", details: e.message });
  }
}
