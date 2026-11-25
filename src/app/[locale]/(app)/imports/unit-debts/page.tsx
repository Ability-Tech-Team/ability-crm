'use client';

import ImportUploadPage from '../_shared/components/ImportUploadPage';
import UnitDebtEntryForm from './components/UnitDebtEntryForm';

export default function ImportUnitDebtsPage() {
  return (
    <ImportUploadPage kind="unit-debts" href="/imports/unit-debts">
      <UnitDebtEntryForm />
    </ImportUploadPage>
  );
}
