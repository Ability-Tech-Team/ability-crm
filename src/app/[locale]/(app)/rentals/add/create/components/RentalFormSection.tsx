type RentalFormSectionProps = {
  title: string;
  children: React.ReactNode;
  helperText?: string;
  defaultOpen?: boolean;
  collapsible?: boolean;
  contentClassName?: string;
};

function SectionHeader({
  title,
  helperText,
}: Pick<RentalFormSectionProps, 'title' | 'helperText'>) {
  return (
    <div className="mb-3">
      <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      {helperText ? (
        <p className="mt-1 text-sm text-slate-500">{helperText}</p>
      ) : null}
    </div>
  );
}

export default function RentalFormSection({
  title,
  children,
  helperText,
  defaultOpen = false,
  collapsible = false,
  contentClassName = 'mt-4 flex flex-col gap-4',
}: RentalFormSectionProps) {
  const sectionClassName =
    'rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4';

  if (!collapsible) {
    return (
      <div className={sectionClassName}>
        <SectionHeader title={title} helperText={helperText} />
        <div className={contentClassName}>{children}</div>
      </div>
    );
  }

  return (
    <details className={sectionClassName} open={defaultOpen}>
      <summary className="cursor-pointer text-sm font-semibold text-slate-800">
        {title}
      </summary>
      <div className={contentClassName}>{children}</div>
    </details>
  );
}
