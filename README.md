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

قبل التشغيل، اضبط `DATABASE_URL` و`JWT_SECRET` في `.env`. عند أول تشغيل، ينشئ الخادم حساب المدير تلقائياً إذا لم يكن هناك أي مستخدمين في قاعدة البيانات؛ اضبط `ADMIN_USERNAME` و`ADMIN_PASSWORD` و`ADMIN_NAME` أولاً. يجب أن تتكون كلمة مرور المدير من 12 محرفاً على الأقل. لا تُرفع ملفات `.env` إلى GitHub.

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
| POST | `/api/v1/auth/login` | تسجيل الدخول وإصدار رمز جلسة |
| GET | `/api/v1/auth/me` | بيانات المستخدم الحالي |
| POST | `/api/v1/uploads/item-image` | رفع صورة صنف (للمدير، multipart/form-data) |
| GET/POST | `/api/v1/auth/users` | عرض حسابات الموظفين أو إنشاء حساب |
| PATCH | `/api/v1/auth/users/:id/status` | تفعيل أو إيقاف حساب موظف |
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
| GET | `/api/v1/bills?date=YYYY-MM-DD` | عرض فواتير يوم محدد |
| DELETE | `/api/v1/bills` | مسح سجل الفواتير |
| GET | `/api/v1/reports/daily?date=YYYY-MM-DD` | إحصائيات اليوم حسب توقيت دمشق |
| GET | `/api/v1/dashboard` | إحصائيات لوحة التحكم |

تتطلب جميع مسارات `/api/v1` رمز دخول في ترويسة `Authorization: Bearer <token>` باستثناء تسجيل الدخول. يستطيع المدير إدارة القائمة والطاولات وحسابات الموظفين، بينما يستطيع الموظف إدارة الطاولات والطلبات وإصدار الفواتير. تُسجل الفاتورة باسم المستخدم الذي أغلق الطاولة. ينتهي رمز الجلسة بعد 12 ساعة، ويُعطّل فور إيقاف الحساب.

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

للنشر خلف Nginx استخدم المنفذ المحدد في متغير `PORT` كـ reverse proxy وأضف شهادة HTTPS.

## إعداد Render

أنشئ Web Service من مستودع `Firas2525/caffee` على الفرع `main`، واجعل Root Directory فارغاً لأن المستودع مخصص للباك إند. اترك Render يستخدم Dockerfile، ثم أضف متغيرات البيئة التالية من صفحة الخدمة:

```text
NODE_ENV=production
DATABASE_URL=<رابط Neon الجديد بعد تدوير كلمة المرور>
CORS_ORIGINS=*
JWT_SECRET=<سر عشوائي لا يقل عن 32 محرفاً>
ADMIN_USERNAME=<اسم مستخدم المدير الأول>
ADMIN_PASSWORD=<كلمة مرور أولية من 12 محرفاً على الأقل>
ADMIN_NAME=مدير المقهى
APP_TIMEZONE=Asia/Damascus
CLOUDINARY_CLOUD_NAME=<اسم Cloudinary>
CLOUDINARY_API_KEY=<مفتاح Cloudinary>
CLOUDINARY_API_SECRET=<سر Cloudinary محفوظ في Render فقط>
```

اترك `PORT` دون إعداد؛ Render يمرره تلقائياً، والخادم يستمع على `0.0.0.0`. يطبّق الخادم ترحيل قاعدة البيانات ويُنشئ المدير الأول عند بدء التشغيل. بعد نجاح النشر اختبر `https://<service>.onrender.com/health`، وينبغي أن يعيد JSON بحالة 200.

بعد تدوير كلمة مرور قاعدة البيانات التي سبق مشاركتها، ضع الرابط الجديد في `DATABASE_URL` داخل إعدادات Render فقط. عند بناء Flutter، اضبط عنوان الخدمة:

```bash
flutter build apk --dart-define=CAFE_API_BASE_URL=https://<service>.onrender.com/api/v1
```

من الأفضل تغيير كلمة مرور المدير الأول بعد تسليم بيانات الدخول، وعدم تضمين كلمات المرور أو أسرار قاعدة البيانات في التطبيق أو المستودع.
