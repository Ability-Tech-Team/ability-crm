import type { z } from 'zod';
import type { searchSchema } from './schema';

export type TabId = 'all' | 'finance' | 'legal';

/**
 * One entry per tab. Only the *difference* from the full column/filter set is
 * listed, so anything added later shows up on every tab unless hidden here.
 */
export type SearchTab = {
  id: TabId;
  labelKey: string;
  /** Heading shown above the table. */
  titleKey: string;
  /** Sent as `is_legal`; undefined means both kinds. */
  isLegal?: number;
  /**
   * The All tab lists UNITS (`/projects/units?blocked_units=1`) - one row per
   * blocked unit, with its own row type, columns and filter set.
   */
  showsUnits?: boolean;
  /**
   * Starting value of the Status filter, so it reaches the request as
   * `is_active`. '' sends nothing and returns standing and lifted blocks
   * alike; '1' returns only blocks that still stand.
   */
  defaultIsActive: string;
  /**
   * Privileges the tab needs, all of them. Finance Block (63) and Legal Block
   * (64) hang off the /unit-blocks/add menu item, not /unit-blocks/search.
   */
  privileges: number[];
  hiddenColumnIds: string[];
  hiddenFieldNames: string[];
  persistKey: string;
};

export type SearchFormData = z.infer<typeof searchSchema>;

/** What reaches the service, once the form's strings are converted. */
export type SearchParams = {
  unit_id?: number;
  unit_number?: string;
  is_exact?: number;
  category_id?: number;
  project_id?: number;
  customer_name?: string;
  customer_mobile?: string;
  assign_to_id?: string;
  is_active?: number;
  is_legal?: number;
  /** All tab only: narrow the listed units to one kind of block. */
  block_kind?: number;
  from_date?: string;
  to_date?: string;
};
