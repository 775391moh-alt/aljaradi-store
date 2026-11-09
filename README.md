# متجر الجرادي للخضار والفواكه

واجهة عربية RTL لمتجر الخضار والفواكه، مبنية باستخدام React وVite وSupabase.

## التشغيل
1. ثبّت Node.js.
2. انسخ `.env.example` إلى ملف باسم `.env`.
3. ضع رابط مشروع Supabase ومفتاح النشر في `.env`.
4. نفّذ:
   ```bash
   npm install
   npm run dev
   ```

## الجداول المتوقعة
- `products`: الأعمدة `id`, `name`, `description`, `price`, `image_url`, `category_id`, `stock`, `created_at`.
- `categories`: الأعمدة `id`, `name`.

هذه النسخة تقرأ المنتجات والتصنيفات وتدعم إضافة وتعديل وحذف المنتجات عبر Supabase Auth.
لإدارة الموقع، أنشئ حساباً للمدير من Supabase > Authentication > Users، واضبط سياسات RLS بحيث تسمح للمستخدمين المسجلين المصرح لهم فقط بالتعديل. لا تضع `service_role` أو `sb_secret` في الواجهة الأمامية.

## إعداد متغيرات البيئة
`VITE_SUPABASE_URL` رابط المشروع الأساسي بدون `/rest/v1/`.
`VITE_SUPABASE_ANON_KEY` مفتاح `sb_publishable_` أو مفتاح anon القديم.
