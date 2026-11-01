'use client';

import React, { useState, useRef, useEffect, useEffectEvent } from 'react';
import { useTranslations } from 'next-intl';
export interface SelectOption {
  value: string;
  label: string;
  description?: string;
}

interface SelectProps extends Omit<
  React.SelectHTMLAttributes<HTMLSelectElement>,
  'onChange'
> {
  label: string;
  name: string;
  options: SelectOption[];
  errors?: string[];
  containerClassName?: string;
  placeholder?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  clearable?: boolean;
  showAllOption?: boolean;
  allOptionLabel?: string;
  loading?: boolean;
  loadingText?: string;
  emptyText?: string;
  onChange?: (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => void;
}

export default function Select({
  label,
  name,
  options,
  errors,
  containerClassName = '',
  className = '',
  placeholder,
  searchable = true,
  searchPlaceholder,
  searchValue,
  onSearchChange,
  clearable = true,
  showAllOption = false,
  allOptionLabel,
  loading = false,
  loadingText,
  emptyText,
  onChange,
  disabled,
  value,
  ...props
}: SelectProps) {
  const t = useTranslations('common');
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedValue, setSelectedValue] = useState(value || '');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [openUpward, setOpenUpward] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<(HTMLDivElement | null)[]>([]);

  const hasError = errors && errors.length > 0;
  const currentSearchTerm = searchValue ?? searchTerm;

  // Filter options based on search term
  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(currentSearchTerm.toLowerCase()),
  );

  const allOption: SelectOption = {
    value: '__all__',
    label: allOptionLabel || t('all'),
  };

  const displayOptions = showAllOption
    ? [allOption, ...filteredOptions]
    : filteredOptions;

  const selectedOption =
    selectedValue === '__all__'
      ? allOption
      : options.find((option) => option.value === selectedValue);

  // Follow the external value prop (adjusted during render). A controlled
  // `searchValue` is read directly through `currentSearchTerm`.
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setSelectedValue(value || '');
  }

  // Handle click outside to close dropdown
  const onClickOutside = useEffectEvent((event: MouseEvent) => {
    if (
      dropdownRef.current &&
      !dropdownRef.current.contains(event.target as Node)
    ) {
      setIsOpen(false);
      if (searchValue === undefined) {
        setSearchTerm('');
      }
      setFocusedIndex(-1);
    }
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => onClickOutside(event);
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen, searchable]);

  // Determine whether to open dropdown upward based on viewport space
  useEffect(() => {
    if (!isOpen) return;

    const computePosition = () => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const dropdownMaxHeight = 240; // matches max-h-60 (15rem)
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      setOpenUpward(spaceBelow < dropdownMaxHeight && spaceAbove > spaceBelow);
    };

    computePosition();
    window.addEventListener('resize', computePosition);
    window.addEventListener('scroll', computePosition, true);
    return () => {
      window.removeEventListener('resize', computePosition);
      window.removeEventListener('scroll', computePosition, true);
    };
  }, [isOpen]);

  const handleOptionSelect = (option: SelectOption) => {
    setSelectedValue(option.value);
    setIsOpen(false);
    if (searchValue === undefined) {
      setSearchTerm('');
    }
    onSearchChange?.('');
    setFocusedIndex(-1);

    // Create a synthetic event for compatibility with existing form handlers
    if (onChange) {
      const syntheticEvent = {
        target: {
          name,
          value: option.value,
          type: 'select-one',
        },
      } as React.ChangeEvent<HTMLSelectElement>;
      onChange(syntheticEvent);
    }
  };

  // Handle keyboard navigation
  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (!isOpen) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setFocusedIndex((prev) =>
          prev < filteredOptions.length - 1 ? prev + 1 : prev,
        );
        break;
      case 'ArrowUp':
        event.preventDefault();
        setFocusedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;
      case 'Enter':
        event.preventDefault();
        if (focusedIndex >= 0) {
          handleOptionSelect(displayOptions[focusedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        if (searchValue === undefined) {
          setSearchTerm('');
        }
        setFocusedIndex(-1);
        break;
    }
  });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => onKeyDown(event);
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Scroll focused option into view
  useEffect(() => {
    if (focusedIndex >= 0 && optionRefs.current[focusedIndex]) {
      optionRefs.current[focusedIndex]?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [focusedIndex]);

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedValue('');
    if (onChange) {
      const syntheticEvent = {
        target: {
          name,
          value: '',
          type: 'select-one',
        },
      } as React.ChangeEvent<HTMLSelectElement>;
      onChange(syntheticEvent);
    }
  };

  const toggleDropdown = () => {
    if (disabled) return;
    setIsOpen(!isOpen);
    if (searchValue === undefined) {
      setSearchTerm('');
    }
    setFocusedIndex(-1);
  };

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

      <div className="relative" ref={dropdownRef}>
        {/* Custom Select Trigger */}
        <div
          ref={triggerRef}
          onClick={toggleDropdown}
          className={`
            relative block w-full px-3 py-2 border rounded-md cursor-pointer
            sm:text-sm transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-offset-0
            ${
              hasError
                ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500 bg-red-50'
                : disabled
                  ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'border-gray-300 bg-white hover:border-gray-400 focus:ring-sky-400/20 focus:border-sky-400'
            }
            ${className}
          `}
        >
          <div className="flex items-center justify-between pr-6">
            <span
              className={selectedOption ? 'text-gray-900' : 'text-gray-400'}
            >
              {selectedOption
                ? selectedOption.label
                : placeholder || t('selectOption')}
            </span>
            {/* Clear button */}
            {clearable && selectedValue && !disabled && (
              <button
                type="button"
                onClick={handleClear}
                className="ml-2 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label={t('clear')}
              >
                <svg
                  className="h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            )}
          </div>

          {/* Custom dropdown arrow */}
          <div
            className={`pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 transform transition-transform duration-200 ${
              isOpen ? 'rotate-180' : 'rotate-0'
            } ${
              disabled
                ? 'text-gray-300'
                : hasError
                  ? 'text-red-500'
                  : 'text-gray-500'
            }`}
          >
            <svg
              className="h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>

        {/* Dropdown Menu */}
        {isOpen && (
          <div
            className={`absolute z-50 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-hidden ${
              openUpward ? 'bottom-full mb-1' : 'top-full mt-1'
            }`}
          >
            {/* Search Input */}
            {searchable && (
              <div className="p-2 border-b border-gray-100">
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder={searchPlaceholder || t('searchOptions')}
                  value={currentSearchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    onSearchChange?.(e.target.value);
                    setFocusedIndex(0);
                  }}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-400/20 focus:border-sky-400"
                />
              </div>
            )}

            {/* Options List */}
            <div className="max-h-48 overflow-y-auto">
              {loading ? (
                <div className="px-3 py-6 text-sm text-gray-500 text-center">
                  {loadingText || t('loading')}
                </div>
              ) : displayOptions.length > 0 ? (
                displayOptions.map((option, index) => (
                  <div
                    key={option.value}
                    ref={(el) => {
                      optionRefs.current[index] = el;
                    }}
                    onClick={() => handleOptionSelect(option)}
                    className={`
                      px-3 py-2 cursor-pointer transition-colors duration-150
                      text-sm hover:bg-sky-50 hover:text-sky-700
                      ${
                        selectedValue === option.value
                          ? 'bg-sky-100 text-sky-800 font-medium'
                          : 'text-gray-900'
                      }
                      ${focusedIndex === index ? 'bg-sky-50 text-sky-700' : ''}
                    `}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 flex-col">
                        <span>{option.label}</span>
                        {option.description ? (
                          <span className="text-xs text-gray-500">
                            {option.description}
                          </span>
                        ) : null}
                      </div>
                      {selectedValue === option.value && (
                        <svg
                          className="h-4 w-4 text-sky-600"
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-3 py-6 text-sm text-gray-500 text-center">
                  {emptyText ||
                    (currentSearchTerm
                      ? t('noOptionsFound')
                      : t('noOptionsAvailable'))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Hidden select for form compatibility */}
      <select
        name={name}
        value={selectedValue}
        onChange={() => {}} // Handled by custom dropdown
        className="sr-only"
        tabIndex={-1}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

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
