'use client';

import ImportUploadPage from '../_shared/components/ImportUploadPage';
import RelativeEntryForm from './components/RelativeEntryForm';

export default function ImportRelativesPage() {
  return (
    <ImportUploadPage kind="relatives" href="/imports/relatives">
      <RelativeEntryForm />
    </ImportUploadPage>
  );
}
