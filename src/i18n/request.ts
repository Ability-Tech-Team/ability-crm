import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { notFound } from "next/navigation";
import * as rootParams from "next/root-params";
import { routing } from "./routing";

export default getRequestConfig(async ({ locale: requestedLocale }) => {
  // An explicit locale (e.g. `getTranslations({ locale })`) takes precedence.
  // Otherwise use the `[locale]` root param; `next/root-params` is unavailable
  // in Route Handlers and Server Actions, so pass a locale explicitly there.
  const locale = requestedLocale ?? (await rootParams.locale());

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
