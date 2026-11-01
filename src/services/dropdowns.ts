import api from '@/src/lib/http';
import type { AllDropdownsResponse } from '@/src/types/dropdowns';

const DROPDOWNS_ENDPOINT = '/all-dropdowns';

type DropdownItem = Record<string, unknown>;

function isDropdownItem(value: unknown): value is DropdownItem {
  return typeof value === 'object' && value !== null;
}

function isActiveItem(item: DropdownItem): boolean {
  if (!('is_active' in item)) return true;

  const activeValue = item.is_active;
  return activeValue == null || Number(activeValue) === 1;
}

function filterActiveDropdownItems<T>(items: T[]): T[] {
  return items
    .filter((item) => !isDropdownItem(item) || isActiveItem(item))
    .map((item) => {
      if (
        isDropdownItem(item) &&
        'children' in item &&
        Array.isArray(item.children)
      ) {
        return {
          ...item,
          children: filterActiveDropdownItems(item.children),
        } as T;
      }

      return item;
    });
}

function filterActiveDropdownGroups(
  result: AllDropdownsResponse['result'],
): AllDropdownsResponse['result'] {
  const filteredEntries = Object.entries(result).map(([key, value]) => [
    key,
    Array.isArray(value) ? filterActiveDropdownItems(value) : value,
  ]);

  return Object.fromEntries(filteredEntries) as AllDropdownsResponse['result'];
}

export async function getAllDropdowns(signal?: AbortSignal) {
  const response = await api.get<AllDropdownsResponse>(DROPDOWNS_ENDPOINT, {
    signal,
  });

  return {
    ...response.data,
    result: filterActiveDropdownGroups(response.data.result ?? {}),
  };
}
