import type { ReactNode } from "react";

type AccessNoticeProps = {
  title: string;
  description: string;
  /** Links such as "Try again". */
  children?: ReactNode;
};

/** Shown instead of the product when access is denied or can't be checked. */
export default function AccessNotice({
  title,
  description,
  children,
}: AccessNoticeProps) {
  return (
    <section
      aria-labelledby="access-notice-title"
      className="flex max-w-md flex-col items-center gap-3"
    >
      <h1 id="access-notice-title" className="text-2xl font-semibold">
        {title}
      </h1>
      <p className="text-gray-600">{description}</p>
      {children}
    </section>
  );
}
