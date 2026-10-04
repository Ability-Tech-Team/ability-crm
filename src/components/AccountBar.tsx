import { useTranslations } from "next-intl";
import type { AccountSummary } from "@/src/types/account";

type AccountBarProps = {
  account: AccountSummary | null;
  /** The Portal home in this locale, where clients sign out and switch apps. */
  portalHomeUrl: string | null;
};

export default function AccountBar({ account, portalHomeUrl }: AccountBarProps) {
  const t = useTranslations("Access");

  if (!account && !portalHomeUrl) {
    return null;
  }

  return (
    <div className="flex flex-col items-center gap-1 text-sm text-gray-600">
      {account ? (
        <p>
          {t.rich("signedInAs", {
            name: account.name.trim() || account.email,
            strong: (chunks) => (
              <strong className="font-semibold text-gray-900">
                {/* Isolated, so a Latin name's punctuation stays with it
                    in RTL. */}
                <bdi>{chunks}</bdi>
              </strong>
            ),
          })}
        </p>
      ) : null}
      {portalHomeUrl ? (
        <a href={portalHomeUrl} className="underline underline-offset-4">
          {t("backToPortal")}
        </a>
      ) : null}
    </div>
  );
}
