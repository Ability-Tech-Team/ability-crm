'use client';

import { useRef, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/src/i18n/navigation';
import AccessDenied from '@/src/components/AccessDenied';
import Form, { FieldConfig, ButtonConfig } from '@/src/components/Form';
import MainBox from '@/src/components/ui/MainBox';
import Button from '@/src/components/ui/Button';
import { useRoutePrivileges } from '@/src/hooks/useCurrentUserPrivileges';
import { useResponseMessage } from '@/src/hooks/useResponseMessage';
import { PRIVILEGE_IDS } from '@/src/lib/currentUserPrivileges';
import { createRentalTenant } from '@/src/services/rentals';
import { getCustomers, type Customer } from '@/src/services/customers';
import UnitSummaryCard from './components/UnitSummaryCard';
import TenantAttachmentsSection from './components/TenantAttachmentsSection';
import RelativesSection from './components/RelativesSection';
import VehiclesSection from './components/VehiclesSection';
import { useCreateRentalOptions } from './hooks/useCreateRentalOptions';
import { useRentalCreateContext } from './hooks/useRentalCreateContext';
import { useRentalDynamicEntries } from './hooks/useRentalDynamicEntries';
import { buildCreateRentalRequest } from './mappers';
import { createRentalSchema, type CreateRentalFormData } from './schema';
import {
  extractRentalCompany,
  flattenLocationNames,
  getFilledRelatives,
  getFilledVehicles,
} from './utils';
import { validateDynamicEntries } from './validation';

export default function CreateRentalPage() {
  const t = useTranslations('rentals');
  const tForm = useTranslations('form');
  const router = useRouter();
  const { error: showError } = useResponseMessage();
  const privileges = useRoutePrivileges('/rentals/add');
  const { rentalContext, isHydrated, clearContext } = useRentalCreateContext();
  const {
    tenantAttachments,
    setTenantAttachments,
    relatives,
    addRelative,
    updateRelative,
    removeRelative,
    vehicles,
    addVehicle,
    updateVehicle,
    removeVehicle,
    resetEntries,
  } = useRentalDynamicEntries();

  const [selectedStartDate, setSelectedStartDate] = useState('');
  const [duplicateCustomer, setDuplicateCustomer] = useState<Customer | null>(
    null,
  );
  const idLookupAbortRef = useRef<AbortController | null>(null);
  const duplicateOverlayRef = useRef<HTMLDivElement>(null);

  const canCreate =
    privileges.hasPrivilege(PRIVILEGE_IDS.ADD) || privileges.canAccess;

  const unit = rentalContext?.unit ?? null;
  const customer =
    unit && rentalContext && rentalContext.customerIndex >= 0
      ? unit.customer_units[rentalContext.customerIndex]
      : null;

  const defaultRentalCompany = unit
    ? extractRentalCompany(unit)
    : { id: null, name: '' };

  const { genderOptions, rentalCompanyOptions, idTypeOptions } =
    useCreateRentalOptions({
      defaultRentalCompany,
      t,
    });

  const unitType = unit?.unit_specifications?.unit_type_name ?? '—';
  const unitNumber = unit?.unit_number ?? '—';
  const projectName = unit?.project_name ?? '—';
  const currentCustomerName = customer?.customer_name ?? '—';
  const location = flattenLocationNames(unit?.unit_specifications?.locations);
  const totalArea = unit?.unit_specifications?.total_area ?? '—';
  const today = new Date().toISOString().split('T')[0];

  const fields: FieldConfig[] = [
    {
      name: 'unitNumber',
      label: t('create.unitNumber'),
      type: 'text',
      disabled: true,
    },
    {
      name: 'currentCustomerName',
      label: t('create.currentCustomerName'),
      type: 'text',
      disabled: true,
    },
    {
      name: 'rentalCompanyId',
      label: t('create.rentalCompany'),
      placeholder: t('create.rentalCompany'),
      fieldType: 'select',
      options: rentalCompanyOptions,
    },
    {
      name: 'tenantName',
      label: t('create.tenantName'),
      placeholder: t('create.tenantName'),
      type: 'text',
    },
    {
      name: 'gender',
      label: tForm('gender'),
      placeholder: tForm('gender'),
      fieldType: 'select',
      options: genderOptions,
    },
    {
      name: 'idType',
      label: t('create.idType'),
      placeholder: t('create.idType'),
      fieldType: 'select',
      options: idTypeOptions,
    },
    {
      name: 'idNumber',
      label: t('create.idNumber'),
      placeholder: t('create.idNumber'),
      type: 'text',
      maxLength: 14,
    },
    {
      name: 'email',
      label: tForm('email'),
      placeholder: tForm('email'),
      type: 'email',
    },
    {
      name: 'phone',
      label: t('create.phone'),
      placeholder: t('create.phone'),
      type: 'text',
      inputMode: 'numeric',
      onlyNumbers: true,
    },
    {
      name: 'startDate',
      label: t('create.startDate'),
      type: 'date',
      min: today,
    },
    {
      name: 'endDate',
      label: t('create.endDate'),
      type: 'date',
      min: selectedStartDate || today,
    },
    {
      name: 'totalTenants',
      label: t('create.totalTenants'),
      placeholder: t('create.totalTenants'),
      type: 'number',
      min: 1,
    },
    {
      name: 'accessCardNumber',
      label: t('create.accessCardNumber'),
      placeholder: t('create.accessCardNumber'),
      type: 'text',
    },
    {
      name: 'notes',
      label: t('create.notes'),
      placeholder: t('create.notes'),
      fieldType: 'textarea',
    },
  ];

  const buttons: ButtonConfig[] = [
    {
      label: tForm('save'),
      loadingLabel: t('saving'),
      type: 'submit',
      variant: 'primary',
    },
    {
      label: tForm('cancel'),
      type: 'button',
      variant: 'secondary',
      onClick: () => router.push('/rentals/add'),
    },
  ];

  const handleFieldChange = (name: string, value: string) => {
    if (name === 'startDate') {
      setSelectedStartDate(value);
    }
    if (name === 'idNumber' && duplicateCustomer) {
      setDuplicateCustomer(null);
    }
  };

  const handleFieldBlur = async (name: string, value: string) => {
    if (name !== 'idNumber') return;

    const idNumber = value.trim();
    idLookupAbortRef.current?.abort();

    if (!idNumber) {
      setDuplicateCustomer(null);
      return;
    }

    const controller = new AbortController();
    idLookupAbortRef.current = controller;

    try {
      const { customers } = await getCustomers(
        { id_number: idNumber, page: 1, limit: 1 },
        controller.signal,
      );
      const match = customers[0] ?? null;
      if (!controller.signal.aborted) {
        setDuplicateCustomer(match);
      }
    } catch {
      // Ignore lookup failures – this is a non-blocking convenience check.
    }
  };

  const handleReset = () => {
    setSelectedStartDate('');
    resetEntries();
  };

  const handleSubmit = async (data: CreateRentalFormData) => {
    if (!unit) {
      toast.error(t('create.noUnitSelected'));
      return;
    }

    if (!tenantAttachments.length) {
      toast.error(t('create.tenantAttachmentsRequired'));
      return;
    }

    const filledRelatives = getFilledRelatives(relatives);
    const filledVehicles = getFilledVehicles(vehicles);
    const validationError = validateDynamicEntries(
      filledRelatives,
      filledVehicles,
    );

    if (validationError) {
      toast.error(validationError);
      return;
    }

    const { payload, files } = buildCreateRentalRequest({
      data,
      unit,
      filledRelatives,
      filledVehicles,
      tenantAttachments,
    });

    try {
      await createRentalTenant(payload, files);
      clearContext();
      toast.success(t('createSuccess'));
      router.push('/rentals/search');
    } catch (error) {
      showError(error);
    }
  };

  if (!canCreate) {
    return <AccessDenied fallbackHref={privileges.firstAccessibleHref} />;
  }

  if (!isHydrated) {
    return (
      <div className="p-6">
        <MainBox>
          <p className="text-sm text-slate-600">{t('loading')}</p>
        </MainBox>
      </div>
    );
  }

  if (!unit) {
    return (
      <div className="p-6">
        <MainBox>
          <div className="flex flex-col gap-4">
            <h1 className="text-xl font-semibold">{t('create.title')}</h1>
            <p className="text-sm text-red-700">{t('create.noUnitSelected')}</p>
            <div>
              <Button
                type="button"
                variant="secondary"
                fullWidth={false}
                onClick={() => router.push('/rentals/add')}
              >
                {t('backToAdd')}
              </Button>
            </div>
          </div>
        </MainBox>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <UnitSummaryCard
        unitTypeLabel={t('create.unitType')}
        locationLabel={t('create.location')}
        areaLabel={t('create.area')}
        statusAfterSaveLabel={t('create.statusAfterSave')}
        pendingStatusLabel={t('create.feesCollectionPending')}
        unitType={unitType}
        location={location}
        totalArea={totalArea}
      />

      <Form
        title={t('create.title')}
        fields={fields}
        buttons={buttons}
        initialValues={{
          unitNumber,
          projectName,
          currentCustomerName,
          rentalCompanyId: '',
          tenantName: '',
          gender: '',
          idType: '',
          idNumber: '',
          email: '',
          phone: '',
          startDate: '',
          endDate: '',
          totalTenants: '1',
          accessCardNumber: '',
          notes: '',
        }}
        validationSchema={createRentalSchema}
        onSubmit={handleSubmit}
        onReset={handleReset}
        onFieldChange={handleFieldChange}
        onFieldBlur={handleFieldBlur}
      >
        <TenantAttachmentsSection
          title={`${t('create.tenantAttachmentsSection')} *`}
          helperText={t('create.tenantAttachmentsHelper')}
          attachmentsLabel={t('create.attachments')}
          emptyText={t('create.noTenantAttachments')}
          attachments={tenantAttachments}
          onChange={setTenantAttachments}
        />

        <RelativesSection
          title={t('create.relativesSection')}
          addLabel={t('create.addRelative')}
          emptyText={t('create.noRelativesAdded')}
          namePlaceholder={t('create.relativeName')}
          idTypePlaceholder={t('create.idType')}
          idNumberPlaceholder={t('create.idNumber')}
          genderPlaceholder={t('create.relativeGender')}
          emailPlaceholder={tForm('email')}
          phonePlaceholder={t('create.phone')}
          relationshipPlaceholder={t('create.relationship')}
          attachmentsLabel={t('create.attachments')}
          removeLabel={t('create.removeEntry')}
          relatives={relatives}
          idTypeOptions={idTypeOptions}
          genderOptions={genderOptions}
          onAdd={addRelative}
          onUpdate={updateRelative}
          onRemove={removeRelative}
        />

        <VehiclesSection
          title={t('create.vehiclesSection')}
          addLabel={t('create.addVehicle')}
          emptyText={t('create.noVehiclesAdded')}
          brandPlaceholder={t('create.vehicleBrand')}
          modelPlaceholder={t('create.vehicleModel')}
          plateTextPlaceholder={t('create.plateText')}
          plateNumberPlaceholder={t('create.plateNumber')}
          attachmentsLabel={t('create.attachments')}
          removeLabel={t('create.removeEntry')}
          vehicles={vehicles}
          onAdd={addVehicle}
          onUpdate={updateVehicle}
          onRemove={removeVehicle}
        />
      </Form>

      {duplicateCustomer && (
        <div
          ref={duplicateOverlayRef}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={(e) => {
            if (e.target === duplicateOverlayRef.current) {
              setDuplicateCustomer(null);
            }
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200"
          >
            <button
              type="button"
              onClick={() => setDuplicateCustomer(null)}
              className="absolute top-4 right-4 rtl:right-auto rtl:left-4 p-1 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label={t('create.idDuplicateClose')}
            >
              <X size={18} />
            </button>

            <div className="flex flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                <AlertTriangle className="h-6 w-6 text-amber-500" />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-gray-900">
                {t('create.idDuplicateTitle')}
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                {t('create.idDuplicateMessage', {
                  name: duplicateCustomer.customer_name,
                  code: duplicateCustomer.customer_code ?? '—',
                  mobile: duplicateCustomer.mobile_number ?? '—',
                })}
              </p>
            </div>

            <div className="mt-6 flex justify-center">
              <Button
                type="button"
                variant="primary"
                size="md"
                fullWidth={false}
                onClick={() => setDuplicateCustomer(null)}
              >
                {t('create.idDuplicateClose')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
