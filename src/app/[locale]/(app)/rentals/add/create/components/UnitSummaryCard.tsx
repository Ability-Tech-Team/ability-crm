import MainBox from '@/src/components/ui/MainBox';

type UnitSummaryCardProps = {
  unitTypeLabel: string;
  locationLabel: string;
  areaLabel: string;
  statusAfterSaveLabel: string;
  pendingStatusLabel: string;
  unitType: string;
  location: string;
  totalArea: string;
};

type SummaryItemProps = {
  label: string;
  value: string;
  valueClassName?: string;
};

function SummaryItem({
  label,
  value,
  valueClassName = 'text-slate-800',
}: SummaryItemProps) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 font-medium ${valueClassName}`}>{value}</p>
    </div>
  );
}

export default function UnitSummaryCard({
  unitTypeLabel,
  locationLabel,
  areaLabel,
  statusAfterSaveLabel,
  pendingStatusLabel,
  unitType,
  location,
  totalArea,
}: UnitSummaryCardProps) {
  const items = [
    {
      label: unitTypeLabel,
      value: unitType,
    },
    {
      label: locationLabel,
      value: location,
    },
    {
      label: areaLabel,
      value: totalArea,
    },
    {
      label: statusAfterSaveLabel,
      value: pendingStatusLabel,
      valueClassName: 'text-sky-700',
    },
  ];

  return (
    <MainBox>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <SummaryItem
            key={item.label}
            label={item.label}
            value={item.value}
            valueClassName={item.valueClassName}
          />
        ))}
      </div>
    </MainBox>
  );
}
