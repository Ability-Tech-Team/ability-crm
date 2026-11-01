'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Search, X, Phone, Building2, Loader2, User } from 'lucide-react';
import { useRouter } from '@/src/i18n/navigation';
import { getCustomers, type Customer } from '@/src/services/customers';
import { getUnits, type Unit } from '@/src/services/units';
import { useSelectedCustomerStore } from '@/src/store/useSelectedCustomerStore';
import { useSelectedUnitStore } from '@/src/store/useSelectedUnitStore';

type SearchMode = 'phone' | 'unit';

interface UnitResult {
  unit: Unit;
  customer: {
    customer_id: number;
    customer_name: string;
    mobile_number: string | null;
  } | null;
}

export default function HeaderSearch() {
  const t = useTranslations('common');
  const tCustomers = useTranslations('customers');
  const router = useRouter();
  const setSelectedCustomer = useSelectedCustomerStore((s) => s.setCustomer);
  const setSelectedUnit = useSelectedUnitStore((s) => s.setUnit);

  const [isOpen, setIsOpen] = useState(false);
  const [searchMode, setSearchMode] = useState<SearchMode>('phone');
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [unitResults, setUnitResults] = useState<UnitResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const resetSearch = useCallback(() => {
    setQuery('');
    setCustomerResults([]);
    setUnitResults([]);
    setHasSearched(false);
  }, []);

  const handleOpen = () => {
    setIsOpen(true);
    resetSearch();
  };

  const handleClose = () => {
    setIsOpen(false);
    resetSearch();
  };

  const handleModeSwitch = (mode: SearchMode) => {
    setSearchMode(mode);
    resetSearch();
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const performSearch = useCallback(
    async (value: string) => {
      if (!value.trim()) {
        setCustomerResults([]);
        setUnitResults([]);
        setHasSearched(false);
        return;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);
      setHasSearched(true);

      try {
        if (searchMode === 'phone') {
          const data = await getCustomers(
            { mobile_number: value.trim(), limit: 5 },
            controller.signal,
          );
          if (!controller.signal.aborted) {
            setCustomerResults(data.customers);
          }
        } else {
          const data = await getUnits(
            { unit_number: value.trim(), limit: 5 },
            controller.signal,
          );
          if (!controller.signal.aborted) {
            const results: UnitResult[] = data.units.map((unit) => {
              const firstCustomer =
                unit.customer_units.length > 0 ? unit.customer_units[0] : null;
              return {
                unit,
                customer: firstCustomer
                  ? {
                      customer_id: firstCustomer.customer_id,
                      customer_name: firstCustomer.customer_name,
                      mobile_number: firstCustomer.mobile_number,
                    }
                  : null,
              };
            });
            setUnitResults(results);
          }
        }
      } catch (err: unknown) {
        if ((err as { name?: string }).name !== 'CanceledError') {
          // silently handle
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    },
    [searchMode],
  );

  const handleInputChange = (value: string) => {
    setQuery(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      performSearch(value);
    }, 400);
  };

  const handleCustomerClick = (customer: Customer) => {
    setSelectedCustomer(customer);
    router.push(`/customers/${customer.id}`);
    handleClose();
  };

  const handleUnitClick = (unit: Unit) => {
    setSelectedUnit(unit);
    router.push(`/units/${unit.unit_id ?? unit.id}`);
    handleClose();
  };

  const noResults =
    hasSearched &&
    !isLoading &&
    customerResults.length === 0 &&
    unitResults.length === 0;

  return (
    <div className="relative" ref={containerRef}>
      {/* Search trigger */}
      <button
        onClick={handleOpen}
        className="hover:text-blue-500 text-[#8F9BB3] sm:w-6 sm:h-6 cursor-pointer transition-colors p-1"
        aria-label={t('search')}
      >
        <Search size={20} className="sm:w-6 sm:h-6" />
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/20 z-40" onClick={handleClose} />
      )}

      {/* Search panel */}
      {isOpen && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 w-[95vw] max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Mode tabs */}
          <div className="flex border-b border-gray-100">
            <button
              onClick={() => handleModeSwitch('phone')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                searchMode === 'phone'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Phone size={16} />
              {t('searchByPhone')}
            </button>
            <button
              onClick={() => handleModeSwitch('unit')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                searchMode === 'unit'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Building2 size={16} />
              {t('searchByUnit')}
            </button>
          </div>

          {/* Search input */}
          <div className="relative px-4 py-3">
            <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-2.5 border border-gray-200 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
              <Search size={18} className="text-gray-400 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => handleInputChange(e.target.value)}
                placeholder={
                  searchMode === 'phone'
                    ? t('enterPhoneNumber')
                    : t('enterUnitNumber')
                }
                className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none"
                autoComplete="off"
              />
              {query && (
                <button
                  onClick={resetSearch}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={16} />
                </button>
              )}
              {isLoading && (
                <Loader2
                  size={16}
                  className="text-blue-500 animate-spin shrink-0"
                />
              )}
            </div>
          </div>

          {/* Results */}
          <div className="max-h-80 overflow-y-auto">
            {/* Loading state */}
            {isLoading && !customerResults.length && !unitResults.length && (
              <div className="flex items-center justify-center gap-2 py-8 text-gray-400">
                <Loader2 size={20} className="animate-spin" />
                <span className="text-sm">{t('searching')}</span>
              </div>
            )}

            {/* No results */}
            {noResults && (
              <div className="flex flex-col items-center gap-2 py-8 text-gray-400">
                <Search size={32} className="text-gray-300" />
                <p className="text-sm">{t('noSearchResults')}</p>
              </div>
            )}

            {/* Phone search results */}
            {searchMode === 'phone' && customerResults.length > 0 && (
              <div className="px-2 pb-2">
                <p className="px-3 py-1.5 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  {tCustomers('title')} ({customerResults.length})
                </p>
                {customerResults.map((customer) => (
                  <button
                    key={customer.id}
                    onClick={() => handleCustomerClick(customer)}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-blue-50 transition-colors text-start group"
                  >
                    <div className="w-10 h-10 rounded-full bg-linear-to-br from-blue-100 to-blue-200 flex items-center justify-center shrink-0 group-hover:from-blue-200 group-hover:to-blue-300 transition-colors">
                      <User size={18} className="text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {customer.customer_name}
                      </p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Phone size={11} />
                          {customer.mobile_number ?? '—'}
                        </span>
                        {customer.customer_code && (
                          <span className="text-xs text-gray-400">
                            #{customer.customer_code}
                          </span>
                        )}
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        customer.is_active === 1
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {customer.is_active === 1
                        ? tCustomers('yes')
                        : tCustomers('no')}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Unit search results */}
            {searchMode === 'unit' && unitResults.length > 0 && (
              <div className="px-2 pb-2">
                <p className="px-3 py-1.5 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  {t('units')} ({unitResults.length})
                </p>
                {unitResults.map((result) => (
                  <button
                    key={result.unit.id}
                    onClick={() => handleUnitClick(result.unit)}
                    className="w-full px-3 py-3 rounded-xl hover:bg-emerald-50 transition-colors text-start group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-linear-to-br from-emerald-100 to-emerald-200 flex items-center justify-center shrink-0 group-hover:from-emerald-200 group-hover:to-emerald-300 transition-colors">
                        <Building2 size={18} className="text-emerald-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800">
                          {t('unitLabel')} {result.unit.unit_number}
                        </p>
                        <span className="text-xs text-gray-500">
                          {result.unit.project_name}
                        </span>
                      </div>
                    </div>

                    {/* Associated customers (display only) */}
                    {result.unit.customer_units.length > 0 && (
                      <div className="mt-2 ms-13 space-y-1">
                        {result.unit.customer_units.map((cu) => (
                          <div
                            key={cu.customer_id}
                            className="flex items-center gap-2 px-3 py-1.5 text-start"
                          >
                            <User
                              size={14}
                              className="text-gray-400 shrink-0"
                            />
                            <span className="text-xs text-gray-500 truncate flex-1">
                              {cu.customer_name}
                            </span>
                            {cu.mobile_number && (
                              <span className="text-xs text-gray-400 flex items-center gap-1">
                                <Phone size={10} />
                                {cu.mobile_number}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Empty state when nothing typed */}
            {!hasSearched && !query && (
              <div className="flex flex-col items-center gap-2 py-8 text-gray-400">
                <Search size={32} className="text-gray-200" />
                <p className="text-sm">
                  {searchMode === 'phone'
                    ? t('typePhoneToSearch')
                    : t('typeUnitToSearch')}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
