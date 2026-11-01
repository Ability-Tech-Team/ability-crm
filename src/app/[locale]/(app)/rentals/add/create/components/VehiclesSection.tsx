'use client';

import Button from '@/src/components/ui/Button';
import Input from '@/src/components/ui/Input';
import type { LocalVehicle } from '../types';
import FileDropZone from '@/src/components/ui/FileDropZone';
import RentalFormSection from './RentalFormSection';

type VehiclesSectionProps = {
  title: string;
  addLabel: string;
  emptyText: string;
  brandPlaceholder: string;
  modelPlaceholder: string;
  plateTextPlaceholder: string;
  plateNumberPlaceholder: string;
  attachmentsLabel: string;
  removeLabel: string;
  vehicles: LocalVehicle[];
  onAdd: () => void;
  onUpdate: (
    vehicleId: string,
    field: keyof LocalVehicle,
    value: string | File[],
  ) => void;
  onRemove: (vehicleId: string) => void;
};

export default function VehiclesSection({
  title,
  addLabel,
  emptyText,
  brandPlaceholder,
  modelPlaceholder,
  plateTextPlaceholder,
  plateNumberPlaceholder,
  attachmentsLabel,
  removeLabel,
  vehicles,
  onAdd,
  onUpdate,
  onRemove,
}: VehiclesSectionProps) {
  return (
    <RentalFormSection title={title} collapsible>
      <div className="flex justify-end">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          fullWidth={false}
          onClick={onAdd}
        >
          {addLabel}
        </Button>
      </div>

      {vehicles.length === 0 && (
        <p className="text-sm text-slate-500">{emptyText}</p>
      )}

      {vehicles.map((vehicle) => (
        <div
          key={vehicle.id}
          className="rounded-xl border border-slate-200 bg-white p-4"
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Input
              label={`${brandPlaceholder} *`}
              name={`vehicle-make-${vehicle.id}`}
              placeholder={brandPlaceholder}
              value={vehicle.make}
              onChange={(event) =>
                onUpdate(vehicle.id, 'make', event.target.value)
              }
            />
            <Input
              label={`${modelPlaceholder} *`}
              name={`vehicle-model-${vehicle.id}`}
              placeholder={modelPlaceholder}
              value={vehicle.model}
              onChange={(event) =>
                onUpdate(vehicle.id, 'model', event.target.value)
              }
            />
            <div className="md:col-span-2 xl:col-span-1">
              <p className="mb-1 block text-sm font-medium text-gray-700">
                {`${plateTextPlaceholder} - ${plateNumberPlaceholder} *`}
              </p>
              <div className="flex items-center gap-2">
                <Input
                  label=" "
                  name={`vehicle-plate-text-${vehicle.id}`}
                  placeholder={plateTextPlaceholder}
                  value={vehicle.plate_text}
                  containerClassName="flex-1"
                  onChange={(event) =>
                    onUpdate(vehicle.id, 'plate_text', event.target.value)
                  }
                />
                <span className="pb-2 text-lg font-semibold text-gray-500">
                  -
                </span>
                <Input
                  label=" "
                  name={`vehicle-plate-number-${vehicle.id}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder={plateNumberPlaceholder}
                  value={vehicle.plate_number}
                  containerClassName="flex-1"
                  onChange={(event) =>
                    onUpdate(
                      vehicle.id,
                      'plate_number',
                      event.target.value.replace(/\D/g, '').slice(0, 4),
                    )
                  }
                />
              </div>
            </div>
            <FileDropZone
              label={attachmentsLabel}
              name={`vehicle-attachments-${vehicle.id}`}
              files={vehicle.attachments ?? []}
              onChange={(merged) => onUpdate(vehicle.id, 'attachments', merged)}
              containerClassName="md:col-span-2"
            />
          </div>
          <div className="mt-3 flex justify-end">
            <Button
              type="button"
              size="sm"
              variant="danger"
              fullWidth={false}
              onClick={() => onRemove(vehicle.id)}
            >
              {removeLabel}
            </Button>
          </div>
        </div>
      ))}
    </RentalFormSection>
  );
}
