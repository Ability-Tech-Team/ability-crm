import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/src/i18n/navigation";
import { routing } from "@/src/i18n/routing";

/** Links to this page in the other languages. */
export default function LocaleLinks() {
  const t = useTranslations("Home");
  const locale = useLocale();
  const otherLocales = routing.locales.filter((item) => item !== locale);

  return (
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
  );
}
