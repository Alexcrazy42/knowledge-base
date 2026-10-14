import { useRef, useState } from 'react';
import Input from './components/Input/Input'
import Button from './components/Button/Button';
import Select from './components/Select/Select';
import MaskedInput from './components/MaskedInput/MaskedInput';
import Form from './components/Form/Form';

function App() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [delivery, setDelivery] = useState('');
  const [count, setCount] = useState<number>(100);
  const [country, setCountry] = useState('');
  const [role, setRole] = useState('');
  const [card, setCard] = useState('');
  const [phone, setPhone] = useState('');

  const handleReset = () => {
    inputRef.current?.focus();
    if (inputRef.current) {
      inputRef.current.checked = !inputRef.current.checked;
    }
  };

  return (
    <>
    <Input
      type='radio'
      ref={inputRef}
      prefixNode={<span>prefix: </span>}
      inputMode='email'
    />

    <Input
      prefixNode={<span>prefix: </span>}
      suffixNode={<span>suffix</span>}
      inputMode='email'
    />


    <button onClick={handleReset}>Сбросить</button>


    <div>
      <h3>Способ доставки:</h3>
      
      <Input
        value='courier'
        type='radio'
        name='delivery'
        prefixNode={<span>Курьер</span>}
        checked={delivery === 'courier'}
        onChange={(e) => setDelivery(e.target.value)}
      />

      <Input
        value='pickup'
        type='radio'
        name='delivery'
        prefixNode={<span>Самовывоз</span>}
        checked={delivery === 'pickup'}
        onChange={(e) => setDelivery(e.target.value)}
      />

      <Input
        value='post'
        type='radio'
        name='delivery'
        prefixNode={<span>Почта</span>}
        checked={delivery === 'post'}
        onChange={(e) => setDelivery(e.target.value)}
      />

      <p>Выбрано: {delivery}</p>
    </div>

    <Input
      value={count}
      type='range'
      min={50}
      max={100}
      suffixNode={<span>{count}</span>}
      onChange={(e) => setCount(Number.parseInt(e.target.value))}
    />

    <Button
      // Кастомные пропсы
      variant="primary"
      size='medium'
      loading={false}
      
      // Стандартные HTML атрибуты (из ButtonHTMLAttributes)
      type="submit"
      onClick={() => console.log('clicked')}
      disabled={false}
      form="my-form"
      name="submit-btn"
      value="submit"
      autoFocus
    >
      Сохранить
    </Button>

    <Select
      label="Страна"
      placeholder="Выберите страну"
      value={country}
      onChange={setCountry}
      options={[
        { value: 'ru', label: 'Россия' },
        { value: 'us', label: 'США' },
        { value: 'de', label: 'Германия' },
        { value: 'fr', label: 'Франция' },
        { value: 'jp', label: 'Япония' },
      ]}
    />

    <Select
      label="Роль"
      value={role}
      onChange={setRole}
      error="Роль обязательна"
      options={[
        { value: 'admin', label: 'Администратор' },
        { value: 'editor', label: 'Редактор' },
        { value: 'viewer', label: 'Наблюдатель' },
        { value: 'banned', label: 'Забанен', disabled: true },
      ]}
    />

    <Select
      label="Роль"
      value={role}
      onChange={setRole}
      error="Роль обязательна"
      options={[
      ]}
    />

    <MaskedInput
      label="Номер карты"
      mask="0000 0000 0000 0000"
      showCounter
      value={card}
      onChange={(e) => setCard(e.target.value)}
    />

    <MaskedInput
      label="Номер телефона"
      mask="+7   (000)-000 00 00"
      showCounter
      value={phone}
      onChange={(e) => setPhone(e.target.value)}
    />

    <Form />
    </>
  )
}   

export default App
