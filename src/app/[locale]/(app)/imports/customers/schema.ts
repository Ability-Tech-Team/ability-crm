import { z } from 'zod';
import type { FieldConfig } from '@/src/components/Form';
import type { SelectOption } from '@/src/components/ui/Select';
import { isAcceptablePhoneInput, PHONE_INPUT_MAX_LENGTH } from '@/src/lib/phone';
import type { Translate } from '../_shared/types';
import { EMAIL, idNumberProblem, optionalId } from '../_shared/utils';

/**
 * The manual customer form: the customer (`POST /customers`) and their link
 * to a unit (`POST /customers/assign-unit-to-customer`), like one row of the
 * customers sheet.
 */
export function createCustomerEntrySchema(t: Translate) {
  const required = t('required');

  return z
    .object({
      customer_name: z.string().trim().min(1, required).max(255, t('tooLong')),
      id_type: z.string().min(1, required),
      id_number: z.string().trim().min(1, required),
      country_id: z.string().min(1, required),
      marital_status_id: z.string().min(1, required),
      religion_id: z.string().min(1, required),
      customer_type_id: z.string().min(1, required),
      mobile_number: z
        .string()
        .optional()
        .refine(
          (value) => !value?.trim() || isAcceptablePhoneInput(value),
          t('invalidPhone'),
        ),
      email: z
        .string()
        .optional()
        .refine(
          (value) => !value?.trim() || EMAIL.test(value.trim()),
          t('invalidEmail'),
        ),
      customer_code: z.string().max(20, t('tooLong')).optional(),
      unit_number: z.string().trim().min(1, required).max(255, t('tooLong')),
      sub_project_code: z.string().optional(),
      ownership_id: z.string().min(1, required),
      owner_type_id: z.string().optional(),
      contract_number: z.string().max(255, t('tooLong')).optional(),
      start_date: z.string().min(1, required),
      sign_date: z.string().optional(),
      end_date: z.string().optional(),
    })
    .superRefine((values, ctx) => {
      const problem = idNumberProblem(
        values.id_number,
        optionalId(values.id_type),
      );
      if (values.id_number.trim() && problem) {
        ctx.addIssue({ code: 'custom', path: ['id_number'], message: t(problem) });
      }
      if (values.end_date && values.start_date && values.end_date < values.start_date) {
        ctx.addIssue({ code: 'custom', path: ['end_date'], message: t('endBeforeStart') });
      }
    });
}

export type CustomerEntryValues = z.infer<
  ReturnType<typeof createCustomerEntrySchema>
>;

export type CustomerEntryOptions = {
  idTypes: SelectOption[];
  countries: SelectOption[];
  maritalStatuses: SelectOption[];
  religions: SelectOption[];
  customerTypes: SelectOption[];
  subProjects: SelectOption[];
  ownerships: SelectOption[];
  ownerTypes: SelectOption[];
  /** The owner type applies to an owner's link only. */
  showOwnerType: boolean;
};

export function getCustomerEntryFields(
  t: Translate,
  options: CustomerEntryOptions,
): FieldConfig[] {
  const fields: FieldConfig[] = [
    { name: 'customer_name', label: t('customers.customerName'), maxLength: 255 },
    {
      name: 'id_type',
      label: t('customers.idType'),
      fieldType: 'select',
      options: options.idTypes,
    },
    { name: 'id_number', label: t('customers.idNumber'), maxLength: 50 },
    {
      name: 'country_id',
      label: t('customers.country'),
      fieldType: 'select',
      options: options.countries,
    },
    {
      name: 'marital_status_id',
      label: t('customers.maritalStatus'),
      fieldType: 'select',
      options: options.maritalStatuses,
    },
    {
      name: 'religion_id',
      label: t('customers.religion'),
      fieldType: 'select',
      options: options.religions,
    },
    {
      name: 'customer_type_id',
      label: t('customers.customerType'),
      fieldType: 'select',
      options: options.customerTypes,
    },
    {
      name: 'mobile_number',
      label: t('customers.mobile'),
      type: 'tel',
      inputMode: 'tel',
      maxLength: PHONE_INPUT_MAX_LENGTH,
    },
    { name: 'email', label: t('customers.email'), type: 'email', maxLength: 255 },
    { name: 'customer_code', label: t('customers.customerCode'), maxLength: 20 },
    {
      name: 'unit_number',
      label: t('customers.unitNumber'),
      maxLength: 255,
      containerClassName: 'sm:col-start-1',
    },
    {
      name: 'sub_project_code',
      label: t('customers.subProject'),
      fieldType: 'select',
      options: options.subProjects,
      placeholder: t('customers.anySubProject'),
    },
    {
      name: 'ownership_id',
      label: t('customers.ownership'),
      fieldType: 'select',
      options: options.ownerships,
    },
  ];

  if (options.showOwnerType) {
    fields.push({
      name: 'owner_type_id',
      label: t('customers.ownerType'),
      fieldType: 'select',
      options: options.ownerTypes,
      placeholder: t('customers.ownerTypeDefault'),
    });
  }

  fields.push(
    { name: 'contract_number', label: t('customers.contractNumber'), maxLength: 255 },
    { name: 'start_date', label: t('customers.startDate'), type: 'date' },
    { name: 'sign_date', label: t('customers.signDate'), type: 'date' },
    { name: 'end_date', label: t('customers.endDate'), type: 'date' },
  );

  return fields;
}
