'use client';

import React from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  name: string;
  errors?: string[];
  containerClassName?: string;
}

export default function Input({
  label,
  name,
  type,
  errors,
  containerClassName = '',
  className = '',
  disabled,
  ...props
}: InputProps) {
  const errorList = errors ?? [];
  const hasError = errorList.length > 0;
  const isPasswordField = type === 'password';
  const [showPassword, setShowPassword] = React.useState(false);

  return (
    <div className={containerClassName}>
      <label
        htmlFor={name}
        className={`block text-sm font-medium mb-1 ${
          disabled ? 'text-gray-400' : 'text-gray-700'
        }`}
      >
        {label}
      </label>

      <div className="relative">
        <input
          id={name}
          name={name}
          dir="auto"
          type={isPasswordField ? (showPassword ? 'text' : 'password') : type}
          disabled={disabled}
          className={`
            appearance-none block w-full px-3 py-2 border rounded-md
            placeholder-gray-400 sm:text-sm transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-offset-0
            [unicode-bidi:plaintext] [&::-ms-reveal]:hidden [&::-ms-clear]:hidden
            ${isPasswordField ? 'pr-10 rtl:pr-3 rtl:pl-10' : ''}
            ${
              hasError
                ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500 bg-red-50'
                : disabled
                  ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'border-gray-300 bg-white hover:border-gray-400 focus:ring-sky-400/20 focus:border-sky-400'
            }
            ${className}
          `}
          {...props}
        />

        {isPasswordField && (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            disabled={disabled}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            title={showPassword ? 'Hide password' : 'Show password'}
            className={`absolute inset-y-0 right-0 rtl:right-auto rtl:left-0 flex items-center px-3 transition-colors focus:outline-none ${
              disabled
                ? 'cursor-not-allowed text-gray-300'
                : 'text-gray-400 hover:text-sky-600'
            }`}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        )}
      </div>

      {hasError && (
        <div className="mt-1.5">
          {errorList.map((error, index) => (
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
