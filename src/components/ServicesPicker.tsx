'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { X, ChevronDown, Plus, Trash2, Minus } from 'lucide-react';

export interface SelectedService {
  serviceId: string;
  serviceName: string;
  price: string;
  quantity: number;
}

export interface ServiceOption {
  value: string;
  label: string;
  price: string;
}

interface ServicesPickerProps {
  /** Available services for the currently selected department */
  services: ServiceOption[];
  value: SelectedService[];
  onChange: (value: SelectedService[]) => void;
  label?: string;
  error?: string;
  disabled?: boolean;
}

export default function ServicesPicker({
  services,
  value,
  onChange,
  label,
  error,
  disabled,
}: ServicesPickerProps) {
  const t = useTranslations('tickets');
  const tCommon = useTranslations('common');

  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [openUpward, setOpenUpward] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Already-added service IDs
  const addedIds = value.map((s) => s.serviceId);

  // Available = not yet added
  const availableServices = services.filter((s) => !addedIds.includes(s.value));

  const filteredServices = availableServices.filter((s) =>
    s.label.toLowerCase().includes(search.toLowerCase()),
  );

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchRef.current) {
      searchRef.current.focus();
    }
  }, [isOpen]);

  // Flip dropdown upward when there's not enough room below
  useEffect(() => {
    if (!isOpen) return;

    const computePosition = () => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const dropdownMaxHeight = 240; // matches max-h-60
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

  const handleServiceToggle = (serviceId: string) => {
    setSelectedServiceIds((prev) =>
      prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId],
    );
  };

  const handleAdd = () => {
    if (selectedServiceIds.length === 0) return;

    const newEntries: SelectedService[] = selectedServiceIds
      .map((id) => {
        const svc = services.find((s) => s.value === id);
        if (!svc) return null;
        return {
          serviceId: id,
          serviceName: svc.label,
          price: svc.price,
          quantity: 1,
        };
      })
      .filter(Boolean) as SelectedService[];

    onChange([...value, ...newEntries]);
    setSelectedServiceIds([]);
    setIsOpen(false);
    setSearch('');
  };

  const handleRemove = (serviceId: string) => {
    onChange(value.filter((s) => s.serviceId !== serviceId));
  };

  const handleQuantityChange = (serviceId: string, delta: number) => {
    onChange(
      value.map((s) => {
        if (s.serviceId !== serviceId) return s;
        const newQty = Math.max(1, s.quantity + delta);
        return { ...s, quantity: newQty };
      }),
    );
  };

  const handleQuantityInput = (serviceId: string, raw: string) => {
    const parsed = parseInt(raw, 10);
    const qty = isNaN(parsed) || parsed < 1 ? 1 : parsed;
    onChange(
      value.map((s) =>
        s.serviceId === serviceId ? { ...s, quantity: qty } : s,
      ),
    );
  };

  return (
    <div className="col-span-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}

      {/* Picker row */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
        {/* Services multi-select dropdown */}
        <div className="flex-1 w-full" ref={dropdownRef}>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('create.selectServices')}
          </label>
          <div className="relative">
            <div
              ref={triggerRef}
              onClick={() => {
                if (disabled) return;
                setIsOpen(!isOpen);
                setSearch('');
              }}
              className={`
                relative block w-full px-3 py-2 border rounded-md
                sm:text-sm transition-all duration-200 min-h-9.5
                ${
                  disabled
                    ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'border-gray-300 bg-white hover:border-gray-400 cursor-pointer'
                }
              `}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex flex-wrap gap-1 flex-1">
                  {selectedServiceIds.length > 0 ? (
                    selectedServiceIds.map((id) => {
                      const svc = services.find((s) => s.value === id);
                      return (
                        <span
                          key={id}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-sky-100 text-sky-800 text-xs rounded-full"
                        >
                          {svc?.label}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleServiceToggle(id);
                            }}
                            className="hover:text-red-600 transition-colors"
                          >
                            <X size={12} />
                          </button>
                        </span>
                      );
                    })
                  ) : (
                    <span className="text-gray-400">
                      {t('create.selectServices')}
                    </span>
                  )}
                </div>
                <ChevronDown
                  size={16}
                  className={`text-gray-500 shrink-0 transition-transform duration-200 ${
                    isOpen ? 'rotate-180' : ''
                  }`}
                />
              </div>
            </div>

            {isOpen && !disabled && (
              <div
                className={`absolute z-50 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-hidden ${
                  openUpward ? 'bottom-full mb-1' : 'top-full mt-1'
                }`}
              >
                <div className="p-2 border-b border-gray-100">
                  <input
                    ref={searchRef}
                    type="text"
                    placeholder={tCommon('searchOptions')}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-400/20 focus:border-sky-400"
                  />
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {filteredServices.length > 0 ? (
                    filteredServices.map((svc) => {
                      const isSelected = selectedServiceIds.includes(svc.value);
                      return (
                        <div
                          key={svc.value}
                          onClick={() => handleServiceToggle(svc.value)}
                          className={`
                            px-3 py-2 cursor-pointer text-sm transition-colors duration-150
                            hover:bg-sky-50 hover:text-sky-700
                            ${isSelected ? 'bg-sky-100 text-sky-800 font-medium' : 'text-gray-900'}
                          `}
                        >
                          <div className="flex items-center justify-between">
                            <span>{svc.label}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">
                                {svc.price}
                              </span>
                              {isSelected && (
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
                        </div>
                      );
                    })
                  ) : (
                    <div className="px-3 py-6 text-sm text-gray-500 text-center">
                      {search
                        ? tCommon('noOptionsFound')
                        : tCommon('noOptionsAvailable')}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Add button */}
        <button
          type="button"
          onClick={handleAdd}
          disabled={disabled || selectedServiceIds.length === 0}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium
            transition-colors duration-200 shrink-0 h-9.5
            ${
              !disabled && selectedServiceIds.length > 0
                ? 'bg-sky-400 text-white hover:bg-sky-600'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }
          `}
        >
          <Plus size={16} />
          {t('create.addService')}
        </button>
      </div>

      {/* Selected services table */}
      {value.length > 0 && (
        <div className="mt-4 space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            {t('create.selectedServices')}
          </label>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-start px-4 py-2 font-medium text-gray-700">
                    {t('detail.serviceName')}
                  </th>
                  <th className="text-start px-4 py-2 font-medium text-gray-700">
                    {t('detail.price')}
                  </th>
                  <th className="text-center px-4 py-2 font-medium text-gray-700">
                    {t('detail.quantity')}
                  </th>
                  <th className="text-start px-4 py-2 font-medium text-gray-700">
                    {t('detail.totalPrice')}
                  </th>
                  <th className="px-4 py-2 w-12"></th>
                </tr>
              </thead>
              <tbody>
                {value.map((svc) => {
                  const total = (parseFloat(svc.price) * svc.quantity).toFixed(
                    2,
                  );
                  return (
                    <tr
                      key={svc.serviceId}
                      className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-2.5 font-medium text-gray-900">
                        {svc.serviceName}
                      </td>
                      <td className="px-4 py-2.5 text-gray-700">{svc.price}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              handleQuantityChange(svc.serviceId, -1)
                            }
                            disabled={disabled || svc.quantity <= 1}
                            className="p-1 rounded hover:bg-gray-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <Minus size={14} />
                          </button>
                          <input
                            type="number"
                            min={1}
                            value={svc.quantity}
                            onChange={(e) =>
                              handleQuantityInput(svc.serviceId, e.target.value)
                            }
                            disabled={disabled}
                            className="w-12 text-center border border-gray-200 rounded px-1 py-0.5 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              handleQuantityChange(svc.serviceId, 1)
                            }
                            disabled={disabled}
                            className="p-1 rounded hover:bg-gray-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-gray-700 font-medium">
                        {total}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemove(svc.serviceId)}
                          disabled={disabled}
                          className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t border-gray-200">
                  <td
                    colSpan={3}
                    className="px-4 py-2 text-end font-semibold text-gray-700"
                  >
                    {t('detail.ticketTotal')}
                  </td>
                  <td className="px-4 py-2 font-semibold text-gray-900">
                    {value
                      .reduce(
                        (sum, s) => sum + parseFloat(s.price) * s.quantity,
                        0,
                      )
                      .toFixed(2)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {error && (
        <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
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
      )}
    </div>
  );
}
