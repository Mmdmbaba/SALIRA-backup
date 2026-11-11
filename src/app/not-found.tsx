import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center px-6">
      <div className="text-center">
        <p className="font-display text-[90px] leading-none text-gold/60" dir="ltr">
          404
        </p>
        <h1 className="font-display mt-4 text-[24px] text-ink">۴۰۴ — این صفحه در سایه گم شده</h1>
        <p className="mt-3 text-[13px] text-ink/50">
          آدرسی که دنبالش بودید وجود ندارد یا جابه‌جا شده.
        </p>
        <Link
          href="/"
          className="btn-gold mt-8 inline-flex rounded-full px-7 py-3 text-[14px]"
        >
          بازگشت به خانه
        </Link>
      </div>
    </div>
  );
}
