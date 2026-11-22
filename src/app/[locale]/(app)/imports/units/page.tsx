'use client';

import ImportUploadPage from '../_shared/components/ImportUploadPage';
import UnitEntryForm from './components/UnitEntryForm';

export default function ImportUnitsPage() {
  return (
    <ImportUploadPage kind="units" href="/imports/units">
      <UnitEntryForm />
    </ImportUploadPage>
  );
}
