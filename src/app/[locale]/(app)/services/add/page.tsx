'use client';

import { ArrowLeft } from 'lucide-react';
import { z } from 'zod';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/src/i18n/navigation';
import AccessDenied from '@/src/components/AccessDenied';
import { useDropdowns } from '@/src/hooks/useDropdowns';
import { useRoutePrivileges } from '@/src/hooks/useCurrentUserPrivileges';
import { useForm } from '@/src/hooks/useForm';
import { PRIVILEGE_IDS } from '@/src/lib/currentUserPrivileges';
import {
  createService,
  getServices,
  updateService,
} from '@/src/services/services';
import {
  formatErpAccountCode,
  getAllErpAccountCodes,
  type ErpAccountCode,
} from '@/src/services/erpAccountCodes';
import Border from '@/src/components/ui/Border';
import Input from '@/src/components/ui/Input';
import RadioButton from '@/src/components/ui/RadioButton';
import Select from '@/src/components/ui/Select';
import Button from '@/src/components/ui/Button';
import MainBox from '@/src/components/ui/MainBox';
import { useResponseMessage } from '@/src/hooks/useResponseMessage';

type AddServiceFormData = {
  en_name: string;
  ar_name: string;
  department_id: string;
  description?: string;
  price: string;
  start_date?: string;
  is_active: '0' | '1';
  show_in_mobile: '0' | '1';
  en_mobile_service_name?: string;
  ar_mobile_service_name?: string;
  slot_from_time?: string;
  slot_to_time?: string;
  erp_account_code_id: string;
};

const createAddServiceSchema = (t: ReturnType<typeof useTranslations>) =>
  z
    .object({
      en_name: z.string().trim().min(1, t('validation.enServiceNameRequired')),
      ar_name: z.string().trim().min(1, t('validation.arServiceNameRequired')),
      department_id: z
        .string()
        .trim()
        .min(1, t('validation.departmentRequired'))
        .refine(
          (value) => Number.isInteger(Number(value)) && Number(value) > 0,
          t('validation.departmentRequired'),
        ),
      erp_account_code_id: z.string().trim(),
      description: z.string().optional(),
      price: z
        .string()
        .trim()
        .min(1, t('validation.priceRequired'))
        .refine(
          (value) => !Number.isNaN(Number(value)),
          t('validation.priceInvalid'),
        )
        .refine((value) => Number(value) >= 0, t('validation.priceMin')),
      start_date: z
        .string()
        .optional()
        .refine(
          (value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value),
          t('validation.startDateFormat'),
        ),
      is_active: z.enum(['0', '1']).default('1'),
      show_in_mobile: z.enum(['0', '1']).default('0'),
      en_mobile_service_name: z.string().optional(),
      ar_mobile_service_name: z.string().optional(),
      slot_from_time: z.string().optional(),
      slot_to_time: z.string().optional(),
    })
    .superRefine((data, ctx) => {
      if (data.show_in_mobile !== '1') return;

      if (!data.en_mobile_service_name?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['en_mobile_service_name'],
          message: t('validation.enMobileServiceNameRequired'),
        });
      }

      if (!data.ar_mobile_service_name?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['ar_mobile_service_name'],
          message: t('validation.arMobileServiceNameRequired'),
        });
      }
    });

export default function AddService() {
  const t = useTranslations('services');
  const tForm = useTranslations('form');
  const router = useRouter();
  const addServiceSchema = useMemo(() => createAddServiceSchema(t), [t]);
  const { data: dropdowns } = useDropdowns();
  const { success: showSuccess, error: showError } = useResponseMessage();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');
  const isEditMode = !!editId;
  const addServicePrivileges = useRoutePrivileges('/services/add');
  const serviceSearchPrivileges = useRoutePrivileges('/services/search');
  const canCreateService = addServicePrivileges.canAccess;
  const canEditService = serviceSearchPrivileges.hasPrivilege(
    PRIVILEGE_IDS.EDIT,
  );
  const [loadError, setLoadError] = useState('');
  const [isLoadingService, setIsLoadingService] = useState(false);
  const [erpAccountCodes, setErpAccountCodes] = useState<ErpAccountCode[]>(
    [],
  );
  // The code the edited service had, so that clearing the field removes it.
  const [loadedErpAccountCodeId, setLoadedErpAccountCodeId] = useState<
    number | null
  >(null);

  useEffect(() => {
    const controller = new AbortController();
    getAllErpAccountCodes(controller.signal)
      .then((data) => setErpAccountCodes(data))
      .catch(() => {
        // silently ignore
      });
    return () => controller.abort();
  }, []);

  const erpAccountCodeOptions = useMemo(
    () =>
      erpAccountCodes.map((code) => ({
        value: String(code.id),
        label: formatErpAccountCode(code),
      })),
    [erpAccountCodes],
  );

  const departmentOptions = useMemo(
    () =>
      (dropdowns?.departments ?? []).map((d) => ({
        value: String(d.id),
        label: d.name,
      })),
    [dropdowns],
  );

  const showInMobileOptions = [
    { value: '1', label: t('yes') },
    { value: '0', label: t('no') },
  ];

  const activeOptions = useMemo(
    () => [
      { value: '1', label: tForm('isActive') },
      { value: '0', label: tForm('inactive') },
    ],
    [tForm],
  );

  const initialValues: AddServiceFormData = {
    en_name: '',
    ar_name: '',
    department_id: '',
    description: '',
    price: '',
    start_date: '',
    is_active: '1',
    show_in_mobile: '0',
    en_mobile_service_name: '',
    ar_mobile_service_name: '',
    slot_from_time: '',
    slot_to_time: '',
    erp_account_code_id: '',
  };

  const {
    formData,
    errors,
    formErrors,
    isSubmitting,
    handleChange,
    handleSubmit,
    resetForm,
    setFormData,
  } = useForm({
    initialValues,
    validationSchema: addServiceSchema,
    onSubmit: async (data) => {
      try {
        const erpAccountCodeId = data.erp_account_code_id
          ? Number(data.erp_account_code_id)
          : isEditMode && loadedErpAccountCodeId
            ? null
            : undefined;
        const payload = {
          en_name: data.en_name.trim(),
          ar_name: data.ar_name.trim(),
          department_id: Number(data.department_id),
          description: data.description?.trim() || undefined,
          price: Number(data.price),
          start_date: data.start_date || undefined,
          is_active: data.is_active === '1' ? 1 : 0,
          show_in_mobile: data.show_in_mobile === '1' ? 1 : 0,
          en_mobile_service_name:
            data.show_in_mobile === '1'
              ? data.en_mobile_service_name?.trim() || undefined
              : undefined,
          ar_mobile_service_name:
            data.show_in_mobile === '1'
              ? data.ar_mobile_service_name?.trim() || undefined
              : undefined,
          ...(erpAccountCodeId !== undefined
            ? { erp_account_code_id: erpAccountCodeId }
            : {}),
        };

        if (isEditMode && editId) {
          await updateService(Number(editId), payload);
          showSuccess('updateSuccess');
          router.push('/services/search');
          return;
        }

        await createService(payload);
        showSuccess('createSuccess');
        router.push('/services/search');
      } catch (err) {
        showError(err);
      }
    },
  });

  useEffect(() => {
    if (!editId) return;

    const loadService = async () => {
      setIsLoadingService(true);
      setLoadError('');

      try {
        const numericId = Number(editId);
        const response = await getServices({
          service_id: numericId,
          page: 1,
          limit: 1,
        });

        const service =
          response.services.find((item) => item.id === numericId) ||
          response.services[0];

        if (!service) {
          setLoadError(t('loadError'));
          return;
        }

        const fallbackName = service.service_name ?? '';

        setFormData((prev) => ({
          ...prev,
          en_name: service.en_name || fallbackName,
          ar_name: service.ar_name || fallbackName,
          department_id: String(service.department_id ?? ''),
          description: service.description ?? '',
          price: String(service.price ?? ''),
          start_date: service.start_date ? service.start_date.slice(0, 10) : '',
          is_active: service.is_active === 0 ? '0' : '1',
          show_in_mobile: service.show_in_mobile === 1 ? '1' : '0',
          en_mobile_service_name:
            service.en_mobile_service_name || service.service_mobile_name || '',
          ar_mobile_service_name:
            service.ar_mobile_service_name || service.service_mobile_name || '',
          slot_from_time: service.service_config?.slot_from_time ?? '',
          slot_to_time: service.service_config?.slot_to_time ?? '',
          erp_account_code_id: service.erp_account_code_id
            ? String(service.erp_account_code_id)
            : '',
        }));
        setLoadedErpAccountCodeId(service.erp_account_code_id ?? null);
      } catch {
        setLoadError(t('loadError'));
      } finally {
        setIsLoadingService(false);
      }
    };

    loadService();
  }, [editId, setFormData, t]);

  const fieldErrors = errors as Record<string, string[] | undefined>;
  const showMobileFields = formData.show_in_mobile === '1';
  const requiredLabel = (label: string) => `${label} *`;

  if ((isEditMode && !canEditService) || (!isEditMode && !canCreateService)) {
    return (
      <AccessDenied
        fallbackHref={
          serviceSearchPrivileges.firstAccessibleHref ?? '/services/search'
        }
      />
    );
  }

  return (
    <div className="p-6 flex flex-col gap-4">
      <button
        type="button"
        onClick={() => router.push('/services/search')}
        className="w-fit p-2 rounded-lg hover:bg-slate-100 transition-colors"
        aria-label={t('back')}
      >
        <ArrowLeft size={20} className="text-slate-600" />
      </button>

      <MainBox>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <h1 className="text-2xl font-semibold">
            {t('title')} - {isEditMode ? tForm('save') : tForm('add')}
          </h1>

          <Border />

          {loadError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              <p className="text-sm">{loadError}</p>
            </div>
          )}

          {isLoadingService && (
            <div className="bg-slate-50 border border-slate-200 text-slate-700 px-4 py-3 rounded">
              <p className="text-sm">{tForm('loading')}</p>
            </div>
          )}

          {formErrors.length > 0 && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {formErrors.map((error, index) => (
                <p key={index} className="text-sm">
                  {error}
                </p>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 py-3 gap-4">
            <Input
              label={requiredLabel(t('enServiceName'))}
              name="en_name"
              type="text"
              placeholder={t('enServiceName')}
              value={formData.en_name}
              onChange={handleChange}
              errors={fieldErrors.en_name}
              required
            />
            <Input
              label={requiredLabel(t('arServiceName'))}
              name="ar_name"
              type="text"
              placeholder={t('arServiceName')}
              value={formData.ar_name}
              onChange={handleChange}
              errors={fieldErrors.ar_name}
              required
            />
            <Select
              label={requiredLabel(tForm('department'))}
              name="department_id"
              options={departmentOptions}
              placeholder={tForm('department')}
              value={formData.department_id}
              onChange={handleChange}
              errors={fieldErrors.department_id}
              required
            />
            <Select
              label={tForm('erpAccountCode')}
              name="erp_account_code_id"
              options={erpAccountCodeOptions}
              placeholder={tForm('erpAccountCode')}
              value={formData.erp_account_code_id}
              onChange={handleChange}
              errors={fieldErrors.erp_account_code_id}
            />
            <Input
              label={tForm('description')}
              name="description"
              type="text"
              placeholder={tForm('description')}
              value={formData.description || ''}
              onChange={handleChange}
              errors={fieldErrors.description}
            />
            <Input
              label={requiredLabel(t('price'))}
              name="price"
              type="number"
              placeholder={t('price')}
              value={formData.price}
              onChange={handleChange}
              errors={fieldErrors.price}
              min={0}
              step="0.01"
              inputMode="decimal"
              required
            />
            <Input
              label={t('startDate')}
              name="start_date"
              type="date"
              placeholder={t('startDate')}
              value={formData.start_date || ''}
              onChange={handleChange}
              errors={fieldErrors.start_date}
            />
            {isEditMode && (
              <>
                <Input
                  label={t('slotFromTime')}
                  name="slot_from_time"
                  type="time"
                  value={formData.slot_from_time || ''}
                  disabled
                />
                <Input
                  label={t('slotToTime')}
                  name="slot_to_time"
                  type="time"
                  value={formData.slot_to_time || ''}
                  disabled
                />
              </>
            )}
            <Select
              label={requiredLabel(tForm('status'))}
              name="is_active"
              options={activeOptions}
              placeholder={tForm('status')}
              value={formData.is_active}
              onChange={handleChange}
              errors={fieldErrors.is_active}
              required
            />
            <RadioButton
              label={t('showInMobile')}
              name="show_in_mobile"
              options={showInMobileOptions}
              value={formData.show_in_mobile}
              onChange={handleChange}
              errors={fieldErrors.show_in_mobile}
            />
          </div>

          {showMobileFields && (
            <div className="grid grid-cols-1 sm:grid-cols-2 py-3 gap-4">
              <Input
                label={requiredLabel(t('enMobileServiceName'))}
                name="en_mobile_service_name"
                type="text"
                placeholder={t('enMobileServiceName')}
                value={formData.en_mobile_service_name || ''}
                onChange={handleChange}
                errors={fieldErrors.en_mobile_service_name}
                required={showMobileFields}
              />
              <Input
                label={requiredLabel(t('arMobileServiceName'))}
                name="ar_mobile_service_name"
                type="text"
                placeholder={t('arMobileServiceName')}
                value={formData.ar_mobile_service_name || ''}
                onChange={handleChange}
                errors={fieldErrors.ar_mobile_service_name}
                required={showMobileFields}
              />
            </div>
          )}

          <Border />

          <div className="flex gap-4">
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSubmitting}
              fullWidth
            >
              {isSubmitting
                ? isEditMode
                  ? tForm('updating')
                  : tForm('adding')
                : isEditMode
                  ? tForm('save')
                  : tForm('add')}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="md"
              fullWidth
              onClick={resetForm}
            >
              {tForm('clear')}
            </Button>
          </div>
        </form>
      </MainBox>
    </div>
  );
}
