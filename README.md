# Marketing Plan

نظام بسيط واحترافي لإدارة الخطة التسويقية: الأهداف، الحملات، المحتوى، الميزانية، المهام، والنتائج — كلها من مكان واحد.

## التقنيات

- **Next.js 16** (App Router, Server Actions, TypeScript)
- **Prisma ORM** + **SQLite** (قاعدة بيانات حقيقية بملف واحد، لا تحتاج خادم منفصل — يمكن التبديل لاحقاً إلى PostgreSQL بتغيير `provider` في `prisma/schema.prisma` والـ `DATABASE_URL`)
- **Tailwind CSS v4** — تصميم RTL عربي بالكامل
- **Recharts** للرسوم البيانية
- **date-fns** لتقويم المحتوى

## التشغيل محلياً

```bash
npm install
npx prisma migrate deploy   # إنشاء قاعدة البيانات والجداول
npx prisma db seed          # تعبئة بيانات تجريبية (شركة، براندات، خطة، حملات...)
npm run dev
```

ثم افتح [http://localhost:3000](http://localhost:3000).

## البنية

```
prisma/schema.prisma   تعريف الجداول والعلاقات
prisma/seed.ts          بيانات تجريبية
src/app/                الصفحات (App Router) + Server Actions في app/actions
src/components/ui/      مكونات واجهة قابلة لإعادة الاستخدام (Card, Table, Badge...)
src/components/forms/   نماذج الإنشاء/التعديل لكل مورد
src/lib/                Prisma client، الحسابات، التنسيق، الثوابت
```

## الصفحات الرئيسية

لوحة التحكم، الخطة التسويقية (مع تبويبات: Overview / Objectives / Campaigns / Content / Budget / Tasks)، الأهداف و KPI، الحملات، تقويم المحتوى (شهري/أسبوعي/قائمة)، الميزانية، النتائج والتحليلات، الفريق والمهام (قائمة + Kanban)، والإعدادات.

جميع البيانات تُقرأ وتُكتب مباشرة من/إلى قاعدة البيانات عبر Server Actions — لا بيانات وهمية في الواجهة.
