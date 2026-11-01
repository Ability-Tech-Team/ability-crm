import { z } from 'zod';

export const optionalEmailSchema = z.preprocess(
  (value) =>
    typeof value === 'string' && value.trim() === '' ? undefined : value,
  z.string().email('A valid email address is required').optional(),
);

export const createRentalSchema = z
  .object({
    unitNumber: z.string().optional(),
    projectName: z.string().optional(),
    currentCustomerName: z.string().optional(),
    rentalCompanyId: z.string().min(1, 'Rental company is required'),
    tenantName: z.string().trim().min(1, 'Tenant name is required'),
    gender: z.string().optional(),
    idType: z.string().min(1, 'ID type is required'),
    idNumber: z
      .string()
      .trim()
      .min(8, 'ID number must be between 8 and 16 characters')
      .max(16, 'ID number must be between 8 and 16 characters'),
    email: optionalEmailSchema,
    phone: z.preprocess(
      (value) =>
        typeof value === 'string' && value.trim() === '' ? undefined : value,
      z
        .string()
        .trim()
        .regex(/^\d{11}$/, 'Phone must be exactly 11 digits'),
    ),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
    totalTenants: z
      .string()
      .min(1, 'Total tenants count is required')
      .refine((value) => Number(value) > 0, {
        message: 'Total tenants count must be greater than 0',
      }),
    accessCardNumber: z.string().optional(),
    notes: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.startDate || !data.endDate) {
      return;
    }

    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return;
    }

    if (endDate.getTime() < startDate.getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endDate'],
        message: 'End date cannot be before start date',
      });
    }
  });

export type CreateRentalFormData = z.infer<typeof createRentalSchema>;
