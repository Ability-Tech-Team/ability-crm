'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import type { FieldConfig } from '@/src/components/Form';
import { useIsSuperAdmin } from '@/src/hooks/useIsSuperAdmin';
import { projectFilterField } from '@/src/lib/projectFilter';
import { useProjectScopeStore } from '@/src/store/useProjectScopeStore';

/**
 * The Project filter field for a list screen (`src/lib/projectFilter.ts`):
 * for the Super Admin only, starting at the header's project.
 */
export function useProjectFilter(): {
  show: boolean;
  /** The field's first value: the header's project. */
  initialValue: string;
  /** The field to add to the screen's filters; empty for everyone else. */
  fields: FieldConfig[];
} {
  const tForm = useTranslations('form');
  const isSuperAdmin = useIsSuperAdmin();
  const projects = useProjectScopeStore((s) => s.projects);
  const projectId = useProjectScopeStore((s) => s.projectId);

  return useMemo(() => {
    const show = isSuperAdmin && projects.length > 0;
    const options = projects.map((project) => ({
      value: String(project.id),
      label: project.name,
    }));
    return {
      show,
      initialValue: projectId === null ? '' : String(projectId),
      fields: show ? [projectFilterField(tForm('project'), options)] : [],
    };
  }, [isSuperAdmin, projectId, projects, tForm]);
}
