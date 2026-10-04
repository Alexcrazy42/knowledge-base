import type { Meta, StoryObj } from '@storybook/react';
import { UserCard } from './UserCard';

// Мета-данные
const meta = {
  title: 'Business/UserCard',
  component: UserCard,
  tags: ['autodocs'], // Это автоматически сгенерирует страницу с документацией по пропсам!
  parameters: {
    // Можно задать фон, чтобы компонент выглядел красивее
    layout: 'centered', 
  },
} satisfies Meta<typeof UserCard>;

export default meta;
type Story = StoryObj<typeof meta>;

// Стори 1: Базовый онлайн-пользователь
export const OnlineUser: Story = {
  args: {
    name: 'Иван Иванов',
    role: 'Frontend Developer',
    status: 'online',
  },
};

// Стори 2: Занятый пользователь
export const BusyUser: Story = {
  args: {
    name: 'Алексей Петров',
    role: 'Team Lead',
    status: 'busy',
  },
};

// Стори 3: Офлайн пользователь с аватаркой
export const OfflineWithAvatar: Story = {
  args: {
    name: 'Мария Сидорова',
    role: 'UI/UX Designer',
    status: 'offline',
    avatarUrl: 'https://i.pravatar.cc/150?img=32', // Рандомная аватарка
  },
};

// Стори 4: Граничный случай (очень длинное имя)
export const LongNameEdgeCase: Story = {
  args: {
    name: 'Константин Константинопольский Константинович',
    role: 'Senior Enterprise Architect',
    status: 'online',
  },
};