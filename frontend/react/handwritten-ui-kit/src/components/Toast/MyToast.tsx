import { useToast } from './ToastContext';

export function MyToastComponent() {
  const { addToast } = useToast();



  const handleSave = async () => {
    try {
      addToast('success', 'Данные успешно сохранены!');
    } catch (error) {
      addToast('error', 'Ошибка при сохранении данных');
    }
  };

  const handleWarning = () => {
    addToast('warning', 'Это действие нельзя отменить', 5000);
  };

  const handleInfo = () => {
    addToast('info', 'Новая версия доступна');
  };

  return (
    <div>
      <button onClick={handleSave}>Сохранить</button>
      <button onClick={handleWarning}>Предупреждение</button>
      <button onClick={handleInfo}>Информация</button>
    </div>
  );
}