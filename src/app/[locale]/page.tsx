import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/src/i18n/navigation";
import { routing } from "@/src/i18n/routing";

export default function HomePage() {
  const t = useTranslations("Home");
  const locale = useLocale();
  const otherLocales = routing.locales.filter((item) => item !== locale);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-3xl font-semibold">{t("title")}</h1>
      <p className="max-w-md text-gray-600">{t("description")}</p>
      <nav className="flex gap-4">
        {otherLocales.map((item) => (
          <Link
            key={item}
            href="/"
            locale={item}
            lang={item}
            className="text-sm underline underline-offset-4"
          >
            {t("switchLocale", { locale: item })}
          </Link>
        ))}
      </nav>
    </main>
  );
}
