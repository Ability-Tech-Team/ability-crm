'use client';

import { useEffect, useState } from 'react';
import { useDropdowns } from '@/src/hooks/useDropdowns';
import { useIsSuperAdmin } from '@/src/hooks/useIsSuperAdmin';
import { runAfterCommit } from '@/src/lib/runAfterCommit';
import { getSubProjects } from '@/src/services/projects';
import { useProjectScopeStore } from '@/src/store/useProjectScopeStore';
import type { SubProjectOption } from '@/src/types/dropdowns';

/**
 * The sub-projects the entry forms offer, in the project the import goes to.
 * `all-dropdowns` lists only the sign-in project's, so for the Super Admin,
 * who imports into the project chosen in the header, they come from
 * `GET /sub-projects` (active ones).
 */
export function useSubProjectOptions(): SubProjectOption[] | undefined {
  const { data: dropdowns } = useDropdowns();
  const isSuperAdmin = useIsSuperAdmin();
  const projectId = useProjectScopeStore((s) => s.projectId);
  const scoped = isSuperAdmin && projectId !== null;
  const [loaded, setLoaded] = useState<{
    projectId: number;
    rows: SubProjectOption[];
  } | null>(null);

  useEffect(() => {
    if (!scoped || projectId === null) return;
    const controller = new AbortController();
    const cancel = runAfterCommit(() => {
      getSubProjects({ project_id: projectId, is_active: 1 }, controller.signal)
        .then((rows) =>
          setLoaded({
            projectId,
            rows: rows.map((row) => ({
              id: row.id,
              project_id: row.project_id,
              project_code: row.project_code,
              name: row.name,
            })),
          }),
        )
        .catch(() => {
          if (!controller.signal.aborted) setLoaded({ projectId, rows: [] });
        });
    });
    return () => {
      cancel();
      controller.abort();
    };
  }, [projectId, scoped]);

  if (!scoped) return dropdowns?.sub_projects;
  return loaded?.projectId === projectId ? loaded.rows : [];
}
