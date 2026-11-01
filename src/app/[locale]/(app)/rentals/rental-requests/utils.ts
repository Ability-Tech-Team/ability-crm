/** Where a walk-in rental request came from (`source_id`). */
export const WALK_IN_SOURCE = {
  BROKER: 1,
  TENANT: 2,
  COMMUNITY_APP: 3,
} as const;

/**
 * The `rentals.rentalRequests.source` key for a request without a
 * backend-supplied `source_name`, or null when the source is unknown.
 */
export function getSourceLabelKey(
  sourceId: number | undefined,
): 'broker' | 'tenant' | 'communityApp' | null {
  switch (sourceId) {
    case WALK_IN_SOURCE.BROKER:
      return 'broker';
    case WALK_IN_SOURCE.TENANT:
      return 'tenant';
    case WALK_IN_SOURCE.COMMUNITY_APP:
      return 'communityApp';
    default:
      return null;
  }
}
