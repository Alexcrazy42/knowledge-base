import { useRef, useState, type ReactNode } from 'react';
import Input from './components/Input/Input'
import Button from './components/Button/Button';
import Select from './components/Select/Select';
import MaskedInput from './components/MaskedInput/MaskedInput';
import Form from './components/Form/Form';
import { DatePicker } from './components/DatePicker/DatePicker';
import { Search } from './components/Search/Search';
import { Tab, Tabs } from './components/Tab/Tabs';
import { Accordion } from './components/Accordion/Accordion';
import UsersList from './components/Pagination/UsersList';
import { UploadProgress } from './components/Progress/UploadProgress';
import { BasicTooltip } from './components/Tooltip/BasicTooltip';
import { Popover } from './components/Popover/Popover';
import { Breadcrumbs } from './components/Breadcrumbs/Breadcrumbs';
import { BasicSkeleton } from './components/Skeleton/BasicSkeleton';
import { LeftSidebar } from './components/Sidebar/LeftSidebar';
import { FormSidebar } from './components/Sidebar/FormSidebar';
import { SimpleHeaderExample } from './components/StickyHeader/SimpleHeaderExample';
import { MyToastComponent } from './components/Toast/MyToast';

function App() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [delivery, setDelivery] = useState('');
  const [count, setCount] = useState<number>(100);
  const [country, setCountry] = useState([]);
  const [role, setRole] = useState('');
  const [card, setCard] = useState('');
  const [phone, setPhone] = useState('');
  const [activeTab, setActiveTab] = useState('tab1');

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
      multiple
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
      error={role=='' ? 'Роль обязательна' : null}
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
      error={role=='' ? 'Роль обязательна' : null}
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

    <DatePicker
      onDateSelected={(date) => console.log(date)}
    />

    <Search
      label="Поиск пользователей"
      searchFn={(query: string): Promise<User[]> => {
        console.log(`Вызыватся поиск с параметром ${query}`)
        const filtered = users.filter(user => 
          user.name.toLowerCase().includes(query.toLowerCase())
        );
        return Promise.resolve(filtered);
      }}
      onSelect={(item: User): void => {
        console.log('Выбран пользователь:', item);
      }}
      render={(item: User): ReactNode => {
        return (
          <div>
            <strong>{item.name}</strong>
            <span> ({item.email})</span>
          </div>
        );
      }}
    />

    <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
      <h2>Пример компонента Tabs</h2>
      
      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab}
      >
        <Tab id="tab1" label="Профиль">
          <div>
            <h3>Информация о профиле</h3>
            <p>Здесь находится контент первой вкладки.</p>
            <input placeholder="Это поле сохранит состояние при переключении вкладок!" />
          </div>
        </Tab>

        <Tab id="tab2" label="Настройки">
          <div>
            <h3>Настройки аккаунта</h3>
            <p>Контент второй вкладки.</p>
          </div>
        </Tab>

        <Tab id="tab3" label="Уведомления" disabled>
          <div>
            <h3>Уведомления</h3>
            <p>Этот текст не отобразится, так как вкладка disabled.</p>
          </div>
        </Tab>

        <Tab id="tab4" label={<span>🔥 <b>Премиум</b></span>}>
          <div>
            <h3>Премиум функции</h3>
            <p>В label можно передавать любые ReactNode, включая иконки и JSX.</p>
          </div>
        </Tab>
      </Tabs>

      <div style={{ marginTop: '2rem', padding: '1rem', background: '#f5f5f5', borderRadius: '8px' }}>
        <strong>Текущая активная вкладка (из стейта родителя):</strong> {activeTab}
      </div>
    </div>


    <div style={{ maxWidth: '600px', margin: '2rem auto', padding: '0 1rem' }}>
        <h2>Часто задаваемые вопросы</h2>
        
        <Accordion
            headerContent="Что такое React?"
            content={
                <p>
                    React — это JavaScript-библиотека для создания пользовательских интерфейсов.
                    Она была разработана Facebook и используется для создания одностраничных приложений.
                </p>
            }
        />
    </div>

    <UsersList />

    <UploadProgress />

    <BasicTooltip />

    <Popover
      content={
        <div>
          <p>Привет! Это простой popover.</p>
        </div>
      }
      placement="right"
    >
      <button>Открыть popover</button>
    </Popover>


    <Breadcrumbs
      items={[
        { label: 'Главная', href: '/' },
        { label: 'Каталог', href: '/catalog' },
        { label: 'Электроника', href: '/catalog/electronics' },
        { label: 'Смартфоны' }
      ]}
    />

    <BasicSkeleton />

    <LeftSidebar />

    <FormSidebar />

    <SimpleHeaderExample />

    <MyToastComponent />
    </>
  )
}   

interface User {
  id: number;
  name: string;
  email: string;
}

const users: User[] = [
  { id: 1, name: 'Иван Петров', email: 'ivan@example.com' },
  { id: 2, name: 'Мария Сидорова', email: 'maria@example.com' },
  { id: 3, name: 'Алексей Иванов', email: 'alexey@example.com' },
];

export default App
