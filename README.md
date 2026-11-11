# SALIRA-backup

ریپوی بکاپ و لاگ کاری پروژه — سیستم ضد رول‌بک.

## فایل‌های اصلی

- `PROTOCOL.md` — قرارداد کاری (بکاپ دائمی + لاگ + ادامه کار بعد از قطعی)
- `WORKLOG.md` — لاگ مراحل کار (وضعیت فعلی + تاریخچه)
- `scripts/backup.sh` — commit و push فوری روی GitHub
- `scripts/resume.sh` — دیدن آخرین وضعیت و ادامه کار بعد از قطعی
- `scripts/worklog.sh` — افزودن ورودی به لاگ

## نحوه استفاده

```bash
bash scripts/resume.sh                  # شروع نشست / ادامه بعد از قطعی
bash scripts/backup.sh "توضیح مرحله"    # بکاپ فوری روی GitHub
bash scripts/worklog.sh "عنوان" "جزئیات" # ثبت در لاگ
```

نکته امنیتی: توکن گیت‌هاب فقط به‌صورت محلی در `.credentials/` نگه داشته می‌شود (gitignore شده) و هرگز داخل ریپو نیست.
