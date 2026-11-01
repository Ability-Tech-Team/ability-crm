'use client';

import { useEffect, useMemo, useRef } from 'react';
import { z } from 'zod';
import Border from './ui/Border';
import Input from './ui/Input';
import Select, { SelectOption } from './ui/Select';
import RadioButton from './ui/RadioButton';
import Button from './ui/Button';
import { useForm } from '@/src/hooks/useForm';

// Base field configuration
interface BaseFieldConfig {
  name: string;
  label: string;
  placeholder?: string;
  className?: string;
  containerClassName?: string;
  disabled?: boolean;
}

// Input field configuration type
export interface InputConfig extends BaseFieldConfig {
  fieldType?: 'input';
  type?: React.HTMLInputTypeAttribute;
  autoComplete?: string;
  maxLength?: number;
  min?: string | number;
  max?: string | number;
  step?: string | number;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  onlyNumbers?: boolean;
  positiveNumberOnly?: boolean;
}

// Select field configuration type
export interface SelectConfig extends BaseFieldConfig {
  fieldType: 'select';
  options: SelectOption[];
}

// Radio button option
export interface RadioOption {
  value: string;
  label: string;
}

// Checkbox field configuration type
export interface CheckboxConfig extends BaseFieldConfig {
  fieldType: 'checkbox';
}

// Radio field configuration type
export interface RadioConfig extends BaseFieldConfig {
  fieldType: 'radio';
  options: RadioOption[];
}

// Textarea field configuration type
export interface TextareaConfig extends BaseFieldConfig {
  fieldType: 'textarea';
  rows?: number;
  maxLength?: number;
}

// Union type for all field types
export type FieldConfig =
  | InputConfig
  | SelectConfig
  | RadioConfig
  | CheckboxConfig
  | TextareaConfig;

// Button configuration type
export interface ButtonConfig {
  label: string;
  loadingLabel?: string;
  type?: 'submit' | 'button' | 'reset';
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  fullWidth?: boolean;
  /** Renders the button dimmed and unclickable, rather than hiding it. */
  disabled?: boolean;
}

// Form props with generic type for form data
export interface FormProps<T extends z.ZodType> {
  title?: string;
  fields: FieldConfig[];
  buttons: ButtonConfig[];
  initialValues: z.infer<T>;
  validationSchema: T;
  onSubmit: (data: z.infer<T>) => Promise<void> | void;
  onReset?: () => void;
  onFieldChange?: (name: string, value: string) => void;
  onFieldBlur?: (name: string, value: string) => void;
  persistKey?: string;
  className?: string;
  fieldsClassName?: string;
  buttonsClassName?: string;
  showBorders?: boolean;
  autoSubmit?: boolean;
  /**
   * Rendered on the title row, aligned to the far end. For an action that acts
   * on the record as a whole rather than on the fields; a `type="submit"`
   * button here submits the form like any other.
   */
  titleAction?: React.ReactNode;
  /** Rendered under the title, above the fields. For controls that drive the
   *  whole form, such as a tab strip that swaps which fields are shown. */
  headerContent?: React.ReactNode;
  children?: React.ReactNode;
}

export default function Form<T extends z.ZodType>({
  title,
  fields,
  buttons,
  initialValues,
  validationSchema,
  onSubmit,
  onReset,
  onFieldChange,
  onFieldBlur,
  persistKey,
  className = '',
  fieldsClassName = 'grid grid-cols-1 sm:grid-cols-2 py-3 gap-4',
  buttonsClassName = 'flex gap-4',
  showBorders = true,
  autoSubmit = false,
  titleAction,
  headerContent,
  children,
}: FormProps<T>) {
  const formRef = useRef<HTMLFormElement>(null);
  const {
    formData,
    errors,
    formErrors,
    isSubmitting,
    submitCount,
    handleChange,
    handleSubmit,
    resetForm,
  } = useForm({
    initialValues,
    validationSchema,
    onSubmit,
    persistKey,
    onFieldChange,
  });

  useEffect(() => {
    if (autoSubmit) {
      formRef.current?.requestSubmit();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (submitCount === 0) return;
    const firstErrorField = fields.find(
      (f) => (errors as Record<string, string[] | undefined>)[f.name]?.length,
    );
    if (!firstErrorField) return;
    // Try label[for] first (works for Input, Select, Textarea); fall back to [name] for checkboxes
    const label = formRef.current?.querySelector<HTMLElement>(
      `label[for="${firstErrorField.name}"]`,
    );
    const el =
      label?.parentElement ??
      formRef.current?.querySelector<HTMLElement>(
        `[name="${firstErrorField.name}"]`,
      );
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [submitCount]); // eslint-disable-line react-hooks/exhaustive-deps

  const requiredFields = useMemo(() => {
    if (!(validationSchema instanceof z.ZodObject)) {
      return new Set<string>();
    }

    const shape = validationSchema.shape;
    const required = new Set<string>();

    Object.entries(shape).forEach(([fieldName, fieldSchema]) => {
      if (!fieldSchema.safeParse(undefined).success) {
        required.add(fieldName);
      }
    });

    return required;
  }, [validationSchema]);

  const getFieldLabel = (field: FieldConfig) => {
    if (requiredFields.has(field.name) && !field.label.trim().endsWith('*')) {
      return `${field.label} *`;
    }
    return field.label;
  };

  const renderField = (field: FieldConfig) => {
    const fieldLabel = getFieldLabel(field);
    const fieldErrors = (errors as Record<string, string[] | undefined>)[
      field.name
    ];
    const fieldValue = (formData as Record<string, string>)[field.name] || '';

    if (field.fieldType === 'select') {
      return (
        <Select
          key={field.name}
          label={fieldLabel}
          name={field.name}
          options={field.options}
          value={fieldValue}
          onChange={handleChange}
          errors={fieldErrors}
          placeholder={field.placeholder}
          className={field.className}
          containerClassName={field.containerClassName}
        />
      );
    }

    if (field.fieldType === 'checkbox') {
      return (
        <label
          key={field.name}
          className={`flex items-center gap-3 cursor-pointer select-none ${field.containerClassName ?? ''}`}
        >
          <input
            type="checkbox"
            name={field.name}
            checked={fieldValue === '1'}
            onChange={(e) =>
              handleChange({
                target: {
                  name: field.name,
                  value: e.target.checked ? '1' : '0',
                },
              } as React.ChangeEvent<HTMLInputElement>)
            }
            className="h-5 w-5 accent-sky-500 cursor-pointer"
            disabled={field.disabled}
          />
          <span className="text-sm font-medium text-gray-700">
            {fieldLabel}
          </span>
        </label>
      );
    }

    if (field.fieldType === 'radio') {
      return (
        <RadioButton
          key={field.name}
          label={fieldLabel}
          name={field.name}
          options={field.options}
          value={fieldValue}
          onChange={handleChange}
          errors={fieldErrors}
          className={field.className}
          containerClassName={field.containerClassName}
        />
      );
    }

    if (field.fieldType === 'textarea') {
      return (
        <div key={field.name} className={field.containerClassName ?? ''}>
          <label
            htmlFor={field.name}
            className={`block text-sm font-medium mb-1 ${
              field.disabled ? 'text-gray-400' : 'text-gray-700'
            }`}
          >
            {fieldLabel}
          </label>
          <textarea
            id={field.name}
            name={field.name}
            dir="auto"
            rows={field.rows ?? 4}
            maxLength={field.maxLength}
            value={fieldValue}
            onChange={(e) =>
              handleChange(e as unknown as React.ChangeEvent<HTMLInputElement>)
            }
            placeholder={field.placeholder}
            disabled={field.disabled}
            className={`
              appearance-none block w-full px-3 py-2 border rounded-md
              placeholder-gray-400 sm:text-sm transition-all duration-200
              focus:outline-none focus:ring-2 focus:ring-offset-0 resize-vertical [unicode-bidi:plaintext]
              ${
                fieldErrors && fieldErrors.length > 0
                  ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500 bg-red-50'
                  : field.disabled
                    ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'border-gray-300 bg-white hover:border-gray-400 focus:ring-sky-400/20 focus:border-sky-400'
              }
              ${field.className ?? ''}
            `}
          />
          {fieldErrors && fieldErrors.length > 0 && (
            <div className="mt-1.5">
              {fieldErrors.map((error, index) => (
                <p
                  key={index}
                  className="text-sm text-red-600 flex items-center gap-1"
                >
                  <svg
                    className="h-4 w-4 shrink-0"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {error}
                </p>
              ))}
            </div>
          )}
        </div>
      );
    }

    // Default to input
    return (
      <Input
        key={field.name}
        label={fieldLabel}
        name={field.name}
        type={field.type || 'text'}
        autoComplete={field.autoComplete}
        maxLength={field.maxLength}
        min={field.min}
        max={field.max}
        step={field.step}
        inputMode={field.inputMode}
        value={fieldValue}
        onChange={(e) => {
          if (field.onlyNumbers) {
            handleChange({
              target: {
                name: field.name,
                value: e.target.value.replace(/\D/g, ''),
              },
            } as React.ChangeEvent<HTMLInputElement>);
            return;
          }

          if (field.positiveNumberOnly) {
            const normalizedValue = e.target.value
              .replace(/[+\-]/g, '')
              .replace(/[^\d.]/g, '');

            const [integerPart, ...decimalParts] = normalizedValue.split('.');
            const sanitizedValue =
              decimalParts.length > 0
                ? `${integerPart}.${decimalParts.join('')}`
                : integerPart;

            handleChange({
              target: {
                name: field.name,
                value: sanitizedValue,
              },
            } as React.ChangeEvent<HTMLInputElement>);
            return;
          }

          handleChange(e);
        }}
        onKeyDown={(e) => {
          if (
            field.positiveNumberOnly &&
            ['-', '+', 'e', 'E'].includes(e.key)
          ) {
            e.preventDefault();
          }
        }}
        onBlur={(e) => onFieldBlur?.(field.name, e.target.value)}
        errors={fieldErrors}
        placeholder={field.placeholder}
        className={field.className}
        containerClassName={field.containerClassName}
        disabled={field.disabled}
      />
    );
  };

  return (
    <form
      ref={formRef}
      className={`flex flex-col gap-4 p-6 bg-white rounded-2xl shadow-2xl ${className}`}
      onSubmit={handleSubmit}
    >
      {(title || titleAction) && (
        <div className="flex flex-wrap items-center justify-between gap-4">
          {title && <h1 className="text-2xl font-semibold">{title}</h1>}
          {titleAction}
        </div>
      )}

      {showBorders && title && <Border />}

      {headerContent}

      {/* Display form-level errors */}
      {formErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {formErrors.map((error, index) => (
            <p key={index} className="text-sm">
              {error}
            </p>
          ))}
        </div>
      )}

      <div className={fieldsClassName}>{fields.map(renderField)}</div>

      {children}

      {showBorders && <Border />}

      <div className={buttonsClassName}>
        {buttons.map((button, index) => (
          <Button
            key={index}
            type={button.type || 'submit'}
            variant={button.variant || 'primary'}
            size={button.size || 'md'}
            isLoading={button.type === 'submit' ? isSubmitting : false}
            disabled={button.disabled}
            fullWidth={button.fullWidth !== false}
            onClick={
              button.type === 'reset'
                ? () => {
                    resetForm();
                    onReset?.();
                  }
                : button.type === 'button'
                  ? button.onClick
                  : button.onClick
            }
          >
            {button.type === 'submit' && isSubmitting
              ? button.loadingLabel || '...'
              : button.label}
          </Button>
        ))}
      </div>
    </form>
  );
}

// Re-export types for convenience
export type { SelectOption } from './ui/Select';
export type {
  InputConfig as FormInputConfig,
  SelectConfig as FormSelectConfig,
  RadioConfig as FormRadioConfig,
  RadioOption as FormRadioOption,
  CheckboxConfig as FormCheckboxConfig,
  FieldConfig as FormFieldConfig,
  ButtonConfig as FormButtonConfig,
};
