import { Ban, History, Paperclip, Users } from 'lucide-react';
import type { DetailsSection } from './types';

/**
 * The sections the header buttons show and hide. Each toggles on its own, so
 * any number can be open at once; they always render in this order.
 */
export const SECTIONS: DetailsSection[] = [
  { id: 'summary', labelKey: 'details.blockInfo', icon: Ban },
  { id: 'customers', labelKey: 'details.customers', icon: Users },
  { id: 'attachments', labelKey: 'create.attachments', icon: Paperclip },
  { id: 'timeline', labelKey: 'details.timeline', icon: History },
];
