import type { ReactNode } from 'react';
import { getValueFromEvent } from './useForm';
import type {
  Control,
  FieldState,
  FieldValues,
  RegisterOptions,
} from './types';

interface ControllerField<T extends FieldValues, K extends keyof T> {
  name: string;
  value: T[K];
  onChange: (value: unknown) => void;
  onBlur: () => void;
  ref: (instance: unknown) => void;
}

interface ControllerRenderProps<T extends FieldValues, K extends keyof T> {
  field: ControllerField<T, K>;
  fieldState: FieldState;
}

interface ControllerProps<T extends FieldValues, K extends keyof T> {
  name: K;
  control: Control<T>;
  rules?: RegisterOptions;
  render: (props: ControllerRenderProps<T, K>) => ReactNode;
}

export function Controller<T extends FieldValues, K extends keyof T>({
  name,
  control,
  rules,
  render,
}: ControllerProps<T, K>) {
  const { ref } = control.register(name, rules);
  const value = control.getValues()[name];
  const error = control.errors[name];

  const field: ControllerField<T, K> = {
    name: name as string,
    value,
    ref,
    onChange: (next: unknown) => {
      control.setValue(name, getValueFromEvent(next), { shouldValidate: true });
    },
    onBlur: () => {
      control.setValue(name, control.getValues()[name], {
        shouldValidate: true,
      });
    },
  };

  return (
    <>{render({ field, fieldState: { error, invalid: Boolean(error) } })}</>
  );
}
