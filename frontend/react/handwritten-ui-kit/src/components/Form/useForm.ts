import { useCallback, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type {
  Control,
  FieldErrors,
  FieldValues,
  RegisterOptions,
  RegisterReturn,
  UseFormProps,
  UseFormReturn,
  Validator,
} from './types';

function isEmpty(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    value === '' ||
    (typeof value === 'string' && value.trim() === '')
  );
}

function runValidator(
  validator: Validator,
  value: unknown,
  formValues: FieldValues
): string | undefined {
  const result = validator(value, formValues);
  if (typeof result === 'string') return result;
  if (result === false) return 'Некорректное значение';
  return undefined;
}

function validateField(
  value: unknown,
  options: RegisterOptions | undefined,
  formValues: FieldValues
): string | undefined {
  if (!options) return undefined;

  if (options.required && isEmpty(value)) {
    return typeof options.required === 'string'
      ? options.required
      : 'Это поле обязательно';
  }

  if (isEmpty(value)) return undefined;

  if (
    options.minLength &&
    typeof value === 'string' &&
    value.length < options.minLength.value
  ) {
    return options.minLength.message;
  }

  if (
    options.maxLength &&
    typeof value === 'string' &&
    value.length > options.maxLength.value
  ) {
    return options.maxLength.message;
  }

  if (options.min && Number(value) < options.min.value) {
    return options.min.message;
  }

  if (options.max && Number(value) > options.max.value) {
    return options.max.message;
  }

  if (
    options.pattern &&
    typeof value === 'string' &&
    !options.pattern.value.test(value)
  ) {
    return options.pattern.message;
  }

  if (options.validate) {
    if (typeof options.validate === 'function') {
      return runValidator(options.validate, value, formValues);
    }

    for (const key of Object.keys(options.validate)) {
      const message = runValidator(options.validate[key], value, formValues);
      if (message) return message;
    }
  }

  return undefined;
}

export function getValueFromEvent(
  event: unknown,
  options?: RegisterOptions
): unknown {
  if (event && typeof event === 'object' && 'target' in event) {
    const target = (event as { target: unknown }).target;

    if (target && typeof target === 'object' && 'value' in target) {
      const element = target as {
        value: unknown;
        type?: string;
        valueAsNumber?: number;
        checked?: boolean;
      };

      if (element.type === 'checkbox') return element.checked;
      if (element.type === 'radio') return element.value;
      if (options?.valueAsNumber) return element.valueAsNumber;
      if (options?.setValueAs && typeof element.value === 'string') {
        return options.setValueAs(element.value);
      }

      return element.value;
    }
  }

  return event;
}

export function useForm<T extends FieldValues>(
  props: UseFormProps<T> = {}
): UseFormReturn<T> {
  const defaultValues = props.defaultValues ?? {};
  const defaultValuesRef = useRef<Partial<T>>(defaultValues);

  const valuesRef = useRef<T>({ ...defaultValues } as T);
  const optionsRef = useRef<Record<string, RegisterOptions>>({});
  const fieldsRef = useRef<Record<string, unknown>>({});
  const initializedRef = useRef<Set<string>>(new Set());
  const registerCacheRef = useRef<Record<string, RegisterReturn>>({});

  const [, forceRender] = useState(0);
  const render = useCallback(() => forceRender((tick) => tick + 1), []);

  const [errors, setErrors] = useState<FieldErrors<T>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const setFieldError = useCallback(
    (name: keyof T, error: string | undefined) => {
      setErrors((prev) => {
        if (error) {
          if (prev[name] === error) return prev;
          return { ...prev, [name]: error };
        }
        if (prev[name] === undefined) return prev;
        const next = { ...prev };
        delete next[name];
        return next;
      });
    },
    []
  );

  const updateValue = useCallback(
    (name: keyof T, value: unknown) => {
      valuesRef.current = { ...valuesRef.current, [name]: value } as T;
      render();
    },
    [render]
  );

  const validateAndStore = useCallback(
    (name: keyof T, value: unknown) => {
      const error = validateField(
        value,
        optionsRef.current[name as string],
        valuesRef.current
      );
      setFieldError(name, error);
    },
    [setFieldError]
  );

  const setValue = useCallback(
    (
      name: keyof T,
      value: unknown,
      options?: { shouldValidate?: boolean }
    ) => {
      const key = name as string;
      valuesRef.current = { ...valuesRef.current, [key]: value } as T;

      const domField = fieldsRef.current[key];
      if (domField && typeof domField === 'object' && 'value' in domField) {
        (domField as { value: unknown }).value = value;
      }

      render();

      if (options?.shouldValidate) {
        const error = validateField(
          value,
          optionsRef.current[key],
          valuesRef.current
        );
        setFieldError(name, error);
      }
    },
    [render, setFieldError]
  );

  const getValues = useCallback(() => ({ ...valuesRef.current }) as T, []);

  const register = useCallback(
    (name: keyof T, options?: RegisterOptions): RegisterReturn => {
      const key = name as string;
      if (options) optionsRef.current[key] = options;

      if (!registerCacheRef.current[key]) {
        registerCacheRef.current[key] = {
          name: key,
          ref: (instance: unknown) => {
            if (instance === null || instance === undefined) {
              delete fieldsRef.current[key];
              return;
            }

            fieldsRef.current[key] = instance;

            if (
              !initializedRef.current.has(key) &&
              typeof instance === 'object' &&
              'value' in instance
            ) {
              initializedRef.current.add(key);
              const initial = defaultValuesRef.current[name];
              if (initial !== undefined) {
                (instance as { value: unknown }).value = initial;
              }
            }
          },
          onChange: (event: unknown) => {
            const value = getValueFromEvent(event, optionsRef.current[key]);
            updateValue(name, value);
            validateAndStore(name, value);
          },
          onBlur: (event: unknown) => {
            const value = getValueFromEvent(event, optionsRef.current[key]);
            updateValue(name, value);
            validateAndStore(name, value);
          },
        };
      }

      return registerCacheRef.current[key];
    },
    [updateValue, validateAndStore]
  );

  const handleSubmit = useCallback(
    (onSubmit: (data: T) => void | Promise<void>) => {
      return (event?: FormEvent) => {
        event?.preventDefault();

        const formValues = { ...valuesRef.current } as T;
        const nextErrors: FieldErrors<T> = {};
        let valid = true;

        (Object.keys(optionsRef.current) as (keyof T)[]).forEach((name) => {
          const error = validateField(
            formValues[name],
            optionsRef.current[name as string],
            formValues
          );

          if (error) {
            nextErrors[name] = error;
            valid = false;
          }
        });

        setErrors(nextErrors);
        setIsSubmitted(true);

        if (!valid) return;

        const result = onSubmit(formValues);

        if (result && typeof (result as Promise<void>).then === 'function') {
          setIsSubmitting(true);
          (result as Promise<void>).finally(() => setIsSubmitting(false));
        }
      };
    },
    []
  );

  const reset = useCallback(
    (values?: Partial<T>) => {
      const next = { ...(values ?? defaultValuesRef.current) } as T;
      valuesRef.current = next;
      setErrors({});
      setIsSubmitted(false);
      setIsSubmitting(false);

      Object.keys(fieldsRef.current).forEach((key) => {
        const domField = fieldsRef.current[key];
        if (domField && typeof domField === 'object' && 'value' in domField) {
          const value = next[key as keyof T];
          (domField as { value: unknown }).value =
            value === undefined || value === null ? '' : value;
        }
      });

      render();
    },
    [render]
  );

  const watch = useCallback((name?: keyof T) => {
    return name ? valuesRef.current[name] : { ...valuesRef.current };
  }, []);

  const control = useMemo<Control<T>>(
    () => ({ register, setValue, getValues, errors }),
    [register, setValue, getValues, errors]
  );

  const formState = {
    errors,
    isSubmitting,
    isSubmitted,
    isValid: Object.keys(errors).length === 0,
  };

  return {
    register,
    handleSubmit,
    control,
    formState,
    errors,
    getValues,
    setValue,
    reset,
    watch,
  };
}
