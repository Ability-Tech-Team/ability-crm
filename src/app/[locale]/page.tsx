import { redirect } from "@/src/i18n/navigation";

type Props = {
  params: Promise<{ locale: string }>;
};

/** The entry page opens the dashboard; the app layout checks the session. */
export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  redirect({ href: "/dashboard", locale });
}
