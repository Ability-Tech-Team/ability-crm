import { create } from 'zustand';
import type { Customer } from '@/src/services/customers';

interface SelectedCustomerState {
  customer: Customer | null;
  setCustomer: (customer: Customer) => void;
  clear: () => void;
}

export const useSelectedCustomerStore = create<SelectedCustomerState>(
  (set) => ({
    customer: null,
    setCustomer: (customer) => set({ customer }),
    clear: () => set({ customer: null }),
  }),
);
