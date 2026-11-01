import React from 'react';

export interface RadioOption {
  value: string;
  label: string;
}

interface RadioButtonProps {
  label: string;
  name: string;
  options: RadioOption[];
  value?: string;
  errors?: string[];
  className?: string;
  containerClassName?: string;
  disabled?: boolean;
  onChange?: (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => void;
}

export default function RadioButton({
  label,
  name,
  options,
  value,
  errors,
  className = '',
  containerClassName = '',
  disabled,
  onChange,
}: RadioButtonProps) {
  const hasError = errors && errors.length > 0;

  const handleChange = (optionValue: string) => {
    if (onChange) {
      const syntheticEvent = {
        target: { name, value: optionValue },
      } as React.ChangeEvent<HTMLInputElement>;
      onChange(syntheticEvent);
    }
  };

  return (
    <div className={containerClassName}>
      <span
        className={`block text-sm font-medium mb-2 ${
          disabled ? 'text-gray-400' : 'text-gray-700'
        }`}
      >
        {label}
      </span>
      <div className={`flex items-center gap-6 ${className}`}>
        {options.map((option) => (
          <label
            key={option.value}
            className={`flex items-center gap-2 cursor-pointer select-none ${
              disabled ? 'cursor-not-allowed opacity-50' : ''
            }`}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              disabled={disabled}
              onChange={() => handleChange(option.value)}
              className="h-4 w-4 accent-sky-500 cursor-pointer disabled:cursor-not-allowed"
            />
            <span
              className={`text-sm ${
                disabled ? 'text-gray-400' : 'text-gray-700'
              }`}
            >
              {option.label}
            </span>
          </label>
        ))}
      </div>

      {hasError && (
        <div className="mt-1.5">
          {errors.map((error, index) => (
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
