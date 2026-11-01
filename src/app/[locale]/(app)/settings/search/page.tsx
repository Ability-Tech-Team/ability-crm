'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useDropdowns } from '@/src/hooks/useDropdowns';
import { updateSystemConfigs } from '@/src/services/systemConfig';
import type { SystemConfigOption } from '@/src/types/dropdowns';
import Input from '@/src/components/ui/Input';
import Button from '@/src/components/ui/Button';
import Border from '@/src/components/ui/Border';

const POSITIVE_INTEGER_PATTERN = /^\d*$/;
const BLOCKED_NUMBER_KEYS = ['-', '+', 'e', 'E', '.'];
const ZERO_ALLOWED_VARIABLE_NAME = 'max_tenants_per_unit';
const TIME_VARIABLE_NAMES = new Set([
  'check-in_start_time',
  'checkout_end_time',
]);

function isTimeConfig(config: SystemConfigOption) {
  return (
    !!config.variable_name && TIME_VARIABLE_NAMES.has(config.variable_name)
  );
}

function canAcceptZero(config: SystemConfigOption) {
  return config.variable_name === ZERO_ALLOWED_VARIABLE_NAME;
}

function isValidIntegerValue(config: SystemConfigOption, value: string) {
  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue)) {
    return false;
  }

  return canAcceptZero(config) ? parsedValue >= 0 : parsedValue > 0;
}

function isValidValue(config: SystemConfigOption, value: string) {
  if (isTimeConfig(config)) {
    return value !== '';
  }
  return isValidIntegerValue(config, value);
}

export default function SystemConfigurationPage() {
  const t = useTranslations('settings');
  const tForm = useTranslations('form');
  const { data, refreshDropdowns } = useDropdowns();

  const systemConfigs = useMemo(() => {
    const configs =
      (data?.system_config as SystemConfigOption[] | undefined) ?? [];

    // Keep a deterministic render order so fields do not shift after refresh.
    return [...configs].sort(
      (a, b) => a.system_config_id - b.system_config_id || a.id - b.id,
    );
  }, [data]);

  const [values, setValues] = useState<Record<number, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState('');

  // Merge stored values with dropdown defaults
  const getValue = (config: SystemConfigOption) =>
    values[config.id] !== undefined ? values[config.id] : config.config_value;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const id = Number(e.target.name);
    const nextValue = e.target.value;

    const config = systemConfigs.find((c) => c.id === id);
    if (config && !isTimeConfig(config)) {
      if (nextValue !== '' && !POSITIVE_INTEGER_PATTERN.test(nextValue)) {
        return;
      }
    }

    setValues((prev) => ({ ...prev, [id]: nextValue }));
    setSuccessMessage('');
  };

  const handleNumberKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (BLOCKED_NUMBER_KEYS.includes(e.key)) {
      e.preventDefault();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors([]);
    setSuccessMessage('');
    setIsSubmitting(true);

    const hasInvalidValue = systemConfigs.some(
      (config) => !isValidValue(config, getValue(config)),
    );

    if (hasInvalidValue) {
      setFormErrors([tForm('positiveNumberValidation')]);
      setIsSubmitting(false);
      return;
    }

    try {
      const project_system_configs = systemConfigs.map((config) => ({
        project_system_config_id: config.id,
        config_value: getValue(config),
      }));

      await updateSystemConfigs({ project_system_configs });
      await refreshDropdowns();
      setValues({});
      setSuccessMessage(tForm('updateSuccess'));
    } catch {
      setFormErrors([tForm('updateError')]);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6">
      <form
        className="flex flex-col gap-4 p-6 bg-white rounded-2xl shadow-2xl"
        onSubmit={handleSubmit}
      >
        <h1 className="text-2xl font-semibold">{t('systemConfiguration')}</h1>

        <Border />

        {formErrors.length > 0 && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {formErrors.map((error, index) => (
              <p key={index} className="text-sm">
                {error}
              </p>
            ))}
          </div>
        )}

        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
            <p className="text-sm">{successMessage}</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 py-3 gap-4">
          {systemConfigs.map((config) =>
            isTimeConfig(config) ? (
              <Input
                key={config.id}
                label={config.name}
                name={String(config.id)}
                type="time"
                value={getValue(config)}
                onChange={handleChange}
              />
            ) : (
              <Input
                key={config.id}
                label={config.name}
                name={String(config.id)}
                type="number"
                min={canAcceptZero(config) ? 0 : 1}
                step={1}
                inputMode="numeric"
                value={getValue(config)}
                onChange={handleChange}
                onKeyDown={handleNumberKeyDown}
              />
            ),
          )}
        </div>

        <Border />

        <div className="flex gap-4">
          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={isSubmitting}
            fullWidth
          >
            {isSubmitting ? tForm('updating') : tForm('save')}
          </Button>
        </div>
      </form>
    </div>
  );
}
