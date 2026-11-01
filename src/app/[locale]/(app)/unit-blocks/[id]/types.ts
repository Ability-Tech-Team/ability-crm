import type { ElementType } from 'react';

export type SectionId = 'summary' | 'customers' | 'attachments' | 'timeline';

export type DetailsSection = {
  id: SectionId;
  labelKey: string;
  icon: ElementType;
};
