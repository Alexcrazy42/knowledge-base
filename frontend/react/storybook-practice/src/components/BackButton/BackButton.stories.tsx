import { BackButton } from './BackButton';

export default {
  title: 'UI/BackButton',
  component: BackButton,
// не нужен, тк мы поставили в .storybook/preview.tsx глобальный декоратор
//   decorators: [
//     (Story) => (
//       <MemoryRouter>
//         <Story />
//       </MemoryRouter>
//     ),
//   ],
};

export const Default = {
  args: { label: 'Назад' },
};