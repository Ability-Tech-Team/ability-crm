import type { z } from 'zod';
import type { GetModuleLogsParams } from '@/src/services/moduleLogs';
import type { logsSearchSchema } from './schema';

export type { ModuleLog } from '@/src/services/moduleLogs';

export type LogsSearchFormData = z.infer<typeof logsSearchSchema>;

/** What reaches `getModuleLogs`, once the form's strings are converted. */
export type LogsSearchParams = Omit<GetModuleLogsParams, 'page' | 'limit'>;
