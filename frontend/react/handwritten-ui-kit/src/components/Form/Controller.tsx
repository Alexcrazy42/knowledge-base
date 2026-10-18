import { getValueFromEvent } from './useForm';
import type {
  ControllerField,
  ControllerProps,
  FieldValues
} from './types';

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
