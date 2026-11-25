'use client';

import { UNIT_DEBTS_IMPORT_ACCESS_HREFS } from '@/src/lib/currentUserPrivileges';
import ImportUploadPage from '../_shared/components/ImportUploadPage';
import UnitDebtEntryForm from './components/UnitDebtEntryForm';

/** Opens without a grant of its own, for whoever has another import sheet screen. */
export default function ImportUnitDebtsPage() {
  return (
    <ImportUploadPage kind="unit-debts" href={UNIT_DEBTS_IMPORT_ACCESS_HREFS}>
      <UnitDebtEntryForm />
    </ImportUploadPage>
  );
}
