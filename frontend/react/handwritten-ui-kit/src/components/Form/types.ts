import type { FormEvent } from 'react';

export type FieldValues = Record<string, unknown>;

export type FieldErrors<T extends FieldValues> = Partial<Record<keyof T, string>>;

export type Validator = (
  value: unknown,
  formValues: FieldValues
) => string | boolean | undefined;

export interface RegisterOptions {
  required?: string | boolean;
  min?: { value: number; message: string };
  max?: { value: number; message: string };
  minLength?: { value: number; message: string };
  maxLength?: { value: number; message: string };
  pattern?: { value: RegExp; message: string };
  validate?: Validator | Record<string, Validator>;
  valueAsNumber?: boolean;
  setValueAs?: (value: string) => unknown;
}

export interface RegisterReturn {
  name: string;
  ref: (instance: unknown) => void;
  onChange: (event: unknown) => void;
  onBlur: (event: unknown) => void;
}

export interface FieldState {
  error?: string;
  invalid: boolean;
}

export interface Control<T extends FieldValues> {
  register: (name: keyof T, options?: RegisterOptions) => RegisterReturn;
  setValue: (
    name: keyof T,
    value: unknown,
    options?: { shouldValidate?: boolean }
  ) => void;
  getValues: () => T;
  errors: FieldErrors<T>;
}

export interface UseFormProps<T extends FieldValues> {
  defaultValues?: Partial<T>;
}

export interface FormState<T extends FieldValues> {
  errors: FieldErrors<T>;
  isSubmitting: boolean;
  isSubmitted: boolean;
  isValid: boolean;
}

export interface UseFormReturn<T extends FieldValues> {
  register: (name: keyof T, options?: RegisterOptions) => RegisterReturn;
  handleSubmit: (
    onSubmit: (data: T) => void | Promise<void>
  ) => (event?: FormEvent) => void;
  control: Control<T>;
  formState: FormState<T>;
  errors: FieldErrors<T>;
  getValues: () => T;
  setValue: (
    name: keyof T,
    value: unknown,
    options?: { shouldValidate?: boolean }
  ) => void;
  reset: (values?: Partial<T>) => void;
  watch: (name?: keyof T) => unknown;
}
