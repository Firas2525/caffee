# Caffee Backend

خادم Node.js وExpress لنظام مقهى أبو الزوز، مع PostgreSQL.

## المتطلبات

- Node.js 20 أو أحدث
- PostgreSQL 14 أو أحدث
- Docker وDocker Compose اختياريان للتشغيل السريع

## التشغيل المحلي

```bash
cd backend
cp .env.example .env
npm install
npm run setup
npm run dev
```

الخادم يعمل افتراضياً على `http://localhost:3000`.
فحص الصحة:

```bash
curl http://localhost:3000/health
```

## التشغيل عبر Docker

```bash
cd backend
docker compose up -d --build
docker compose exec api npm run setup
```

## API

جميع مسارات البيانات تبدأ بـ `/api/v1`.

| الطريقة | المسار | الوظيفة |
|---|---|---|
| GET | `/health` | فحص عمل الخادم |
| GET/POST | `/api/v1/categories` | عرض أو إنشاء تصنيف |
| PUT/DELETE | `/api/v1/categories/:id` | تعديل أو حذف تصنيف |
| GET/POST | `/api/v1/items` | عرض أو إنشاء منتج |
| PUT/DELETE | `/api/v1/items/:id` | تعديل أو حذف منتج |
| GET/POST | `/api/v1/tables` | عرض أو إنشاء طاولة |
| PUT/DELETE | `/api/v1/tables/:id` | تعديل أو حذف طاولة فارغة |
| POST | `/api/v1/tables/:id/open` | فتح طاولة |
| POST | `/api/v1/tables/:id/orders` | إضافة منتج للطلب |
| PUT/DELETE | `/api/v1/tables/:id/orders/:orderId` | تعديل أو حذف صنف من الطلب |
| POST | `/api/v1/tables/:id/close` | إغلاق الطاولة وإنشاء فاتورة |
| GET | `/api/v1/bills` | عرض سجل الفواتير |
| DELETE | `/api/v1/bills` | مسح سجل الفواتير |
| GET | `/api/v1/dashboard` | إحصائيات لوحة التحكم |

مثال إضافة صنف إلى طاولة:

```json
POST /api/v1/tables/table_1/orders
{
  "itemId": "item_hot_1",
  "quantity": 2,
  "notes": ""
}
```

مثال إغلاق طاولة:

```json
POST /api/v1/tables/table_1/close
{
  "discount": 0,
  "paymentMethod": "نقدًا"
}
```

## رفعه إلى السيرفر

1. ارفع مجلد `backend` إلى السيرفر.
2. أنشئ قاعدة PostgreSQL، أو استخدم Docker Compose.
3. أنشئ ملف `.env` بالقيم الفعلية ولا ترفعه إلى GitHub.
4. شغّل `npm install --omit=dev`.
5. شغّل `npm run setup`.
6. شغّل الخادم عبر PM2:

```bash
npm install -g pm2
pm2 start src/server.js --name caffee-api
pm2 save
pm2 startup
```

للنشر خلف Nginx استخدم المنفذ `3000` كـ reverse proxy وأضف شهادة HTTPS.

## إعداد Render

أنشئ Web Service من مستودع `Firas2525/caffee` على الفرع `main`، واجعل Root Directory فارغاً لأن المستودع مخصص للباك إند. اترك Render يستخدم Dockerfile، ثم أضف متغيرات البيئة التالية من صفحة الخدمة:

```text
NODE_ENV=production
DATABASE_URL=<رابط Neon الجديد بعد تدوير كلمة المرور>
CORS_ORIGINS=*
API_KEY=<قيمة عشوائية سرية بطول 32 محرفاً على الأقل>
```

اترك `PORT` دون إعداد؛ Render يمرره تلقائياً. بعد نجاح النشر اختبر `https://<service>.onrender.com/health`.

يتطلب كل طلب إلى `/api/v1` ترويسة `x-api-key`. عند بناء Flutter، استخدم نفس المفتاح وعنوان الخدمة:

```bash
flutter build apk --dart-define=CAFE_API_BASE_URL=https://<service>.onrender.com/api/v1 --dart-define=CAFE_API_KEY=<نفس-المفتاح>
```

قيمة المفتاح المضمّنة في تطبيق Flutter يمكن استخراجها من التطبيق؛ لذلك فهي حاجز أولي لتطبيق خاص وليست بديلاً عن حسابات مستخدمين وصلاحيات منفصلة في تطبيق عام.
