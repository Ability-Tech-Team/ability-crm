import { useState, useEffect } from 'react';
import { z } from 'zod';

type FormErrors<T> = {
  [K in keyof T]?: string[];
};

interface UseFormOptions<T extends z.ZodType> {
  initialValues: z.infer<T>;
  validationSchema: T;
  onSubmit: (data: z.infer<T>) => Promise<void> | void;
  persistKey?: string;
  onFieldChange?: (name: string, value: string) => void;
}

function loadPersisted<D>(key: string, fallback: D): D {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as D) : fallback;
  } catch {
    return fallback;
  }
}

export function useForm<T extends z.ZodType>({
  initialValues,
  validationSchema,
  onSubmit,
  persistKey,
  onFieldChange,
}: UseFormOptions<T>) {
  type FormData = z.infer<T>;

  const [formData, setFormData] = useState<FormData>(() =>
    persistKey ? loadPersisted(persistKey, initialValues) : initialValues,
  );
  const [errors, setErrors] = useState<FormErrors<FormData>>({});
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitCount, setSubmitCount] = useState(0);

  // Sync formData to localStorage when persistKey is set
  useEffect(() => {
    if (persistKey) {
      localStorage.setItem(persistKey, JSON.stringify(formData));
    }
  }, [persistKey, formData]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;

    setFormData(
      (prev) =>
        ({ ...(prev as Record<string, unknown>), [name]: value }) as FormData,
    );

    onFieldChange?.(name, value);

    // Clear error for this field when user starts typing
    if (errors[name as keyof FormData]) {
      setErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({}); // Clear previous errors
    setFormErrors([]); // Clear previous form errors

    // Validate the form data
    const result = validationSchema.safeParse(formData);

    if (!result.success) {
      // Format errors from Zod
      const formattedErrors = result.error.format();
      const newErrors: FormErrors<FormData> = {};

      // Handle field-level errors
      Object.keys(formattedErrors).forEach((key) => {
        if (key !== '_errors') {
          newErrors[key as keyof FormData] = (
            formattedErrors as Record<string, { _errors?: string[] }>
          )[key]?._errors;
        }
      });

      // Handle form-level errors (from .refine())
      const rootErrors =
        (formattedErrors as { _errors?: string[] })._errors || [];

      setErrors(newErrors);
      setFormErrors(rootErrors);
      setIsSubmitting(false);
      setSubmitCount((c) => c + 1);
      return;
    }

    // If validation passes, call onSubmit
    try {
      await onSubmit(result.data);
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData(initialValues);
    setErrors({});
    setFormErrors([]);
    setIsSubmitting(false);
    setSubmitCount(0);
    if (persistKey) {
      localStorage.removeItem(persistKey);
    }
  };

  const setFieldError = (field: keyof FormData, error: string[]) => {
    setErrors((prev) => ({
      ...prev,
      [field]: error,
    }));
  };

  return {
    formData,
    errors,
    formErrors,
    isSubmitting,
    submitCount,
    handleChange,
    handleSubmit,
    resetForm,
    setFieldError,
    setFormData,
  };
}
