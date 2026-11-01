import type { ErpAccountCode } from '@/src/services/erpAccountCodes';

export type ErpCodeOption = ErpAccountCode;

export type ErpCodePayload = {
  code: string;
  name: string;
};
