import type { Meta, StoryObj } from '@storybook/react';
import { MessageItem } from './MessageItem';
import { userEvent, within, expect } from '@storybook/test';

const meta = {
    title: 'Business/MessageItem',
    component: MessageItem,
    tags: ['autodocs'],
    parameters: {
        layout: 'centered'
    },
    argTypes: {
        // Указываем Storybook, что onClick - это действие (action).
        // Это позволит видеть аргументы клика в панели Actions внизу экрана.
        onClick: { action: 'clicked' }, 
    },
} satisfies Meta<typeof MessageItem>;

export default meta;
type Story = StoryObj<typeof meta>;


export const DefaultMessageItem: Story = {
    args: {
        messageText: 'Кликни по мне!',
    },
    play: async ({ canvasElement, step }) => {
        // within(canvasElement) ограничивает поиск DOM только внутри нашей стори
        const canvas = within(canvasElement);

        await step('Проверка: текст сообщения отображается', async () => {
            const messageElement = canvas.getByText('Кликни по мне!');
            expect(messageElement).toBeInTheDocument();
        });

        await step('Действие: hover на сообщение', async () => {
            const messageElement = canvas.getByText('Кликни по мне!');

            // Проверяем, что hover-эффект работает (навели и убрали)
            await userEvent.hover(messageElement);

            expect(messageElement).toHaveStyle({
                backgroundColor: 'rgb(255, 255, 255)'
            });

            await userEvent.unhover(messageElement);
        });
    },
};