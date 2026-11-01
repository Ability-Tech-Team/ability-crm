import type { Metadata } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Toaster } from "sonner";
import MaintenanceProvider from "@/src/components/MaintenanceProvider";
import { getLocaleDirection, routing } from "@/src/i18n/routing";
import "../globals.css";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Metadata");

  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const direction = getLocaleDirection(locale);

  return (
    <html lang={locale} dir={direction}>
      <body>
        <NextIntlClientProvider>
          <MaintenanceProvider>{children}</MaintenanceProvider>
          <Toaster
            position={direction === "rtl" ? "top-left" : "top-right"}
            dir={direction}
            richColors
            closeButton
            duration={4000}
          />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
