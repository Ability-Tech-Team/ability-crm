import type { z } from 'zod';
import type { UnitBlock, UnitBlockAttachment } from '@/src/services/unitBlocks';
import type { buildBlockSchema } from './schema';

export type TabId = 'finance' | 'legal';

export type BlockTypeTab = {
  id: TabId;
  isLegal: number;
  labelKey: string;
  privilege: number;
};

export type BlockFormData = z.infer<ReturnType<typeof buildBlockSchema>>;

/** An attachment with the block it belongs to, for the Show Attachments table. */
export type UnitAttachmentRow = UnitBlockAttachment & {
  block_id: UnitBlock['id'];
  blocked_date: UnitBlock['blocked_date'];
};
