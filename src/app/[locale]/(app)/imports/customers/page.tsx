'use client';

import ImportUploadPage from '../_shared/components/ImportUploadPage';
import CustomerEntryForm from './components/CustomerEntryForm';

export default function ImportCustomersPage() {
  return (
    <ImportUploadPage kind="customers" href="/imports/customers">
      <CustomerEntryForm />
    </ImportUploadPage>
  );
}
