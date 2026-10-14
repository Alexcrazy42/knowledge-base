import { useForm } from './useForm';
import Input from '../Input/Input';
import { Controller } from './Controller';
import Select from '../Select/Select';
import MaskedInput from '../MaskedInput/MaskedInput';

type FormData = {
  type: 'user' | 'admin';
  username: string;
  role: string;
  phone: string;
  age: number;
};

export default function Form() {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
  } = useForm<FormData>({
    defaultValues: {
      type: 'admin',
      username: '',
      role: '',
      phone: '',
      age: 18,
    },
  });

  const onSubmit = (data: FormData) => {
    console.log('✅ Форма успешно отправлена!', data);
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      style={{
        maxWidth: 400,
        margin: '2rem auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
      }}
    >
      <h2>Регистрация</h2>

      <Input
        placeholder="Введите имя"
        error={errors.username}
        {...register('username', {
          required: 'Имя обязательно',
          minLength: { value: 3, message: 'Минимум 3 символа' },
        })}
      />

      <Controller
        name="type"
        control={control}
        rules={{ required: 'Выберите тип' }}
        render={({ field, fieldState }) => (
          <Select
            label="Роль"
            placeholder="Выберите роль"
            options={[
              { value: 'admin', label: 'Администратор1' },
              { value: 'user', label: 'Пользователь1' },
            ]}
            value={field.value}
            onChange={field.onChange}
            error={fieldState.error}
          />
        )}
      />

      <Controller
        name="role"
        control={control}
        rules={{ required: 'Выберите роль' }}
        render={({ field, fieldState }) => (
          <Select
            label="Роль"
            placeholder="Выберите роль"
            options={[
              { value: 'admin', label: 'Администратор' },
              { value: 'user', label: 'Пользователь' },
            ]}
            value={field.value}
            onChange={field.onChange}
            error={fieldState.error}
          />
        )}
      />

      <Controller
        name="phone"
        control={control}
        rules={{
          required: 'Телефон обязателен',
          validate: (value) =>
            (typeof value === 'string' && value.length === 18) ||
            'Введите полный номер',
        }}
        render={({ field, fieldState }) => (
          <MaskedInput
            label="Телефон"
            mask="+7 (000) 000-00-00"
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error}
          />
        )}
      />

      <div>
        <label>Возраст</label>
        <input
          type="number"
          {...register('age', {
            required: 'Укажите возраст',
            valueAsNumber: true,
            min: { value: 18, message: 'Доступно с 18 лет' },
          })}
          style={{ width: '100%', padding: '8px', marginTop: '4px' }}
        />
        {errors.age && (
          <span style={{ color: 'red', fontSize: 12 }}>{errors.age}</span>
        )}
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
        <button
          type="submit"
          style={{
            flex: 1,
            padding: '10px',
            background: '#1890ff',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          Отправить
        </button>
        <button
          type="button"
          onClick={() => reset()}
          style={{
            padding: '10px 20px',
            background: '#f5f5f5',
            border: '1px solid #d9d9d9',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          Сбросить
        </button>
      </div>
    </form>
  );
}
