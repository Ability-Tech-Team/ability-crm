import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "ar"],
  defaultLocale: "en",
});

export type AppLocale = (typeof routing.locales)[number];

const rtlLocales: ReadonlySet<AppLocale> = new Set(["ar"]);

export function getLocaleDirection(locale: AppLocale): "ltr" | "rtl" {
  return rtlLocales.has(locale) ? "rtl" : "ltr";
}
