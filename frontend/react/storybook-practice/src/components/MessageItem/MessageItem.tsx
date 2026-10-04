import React, { useState } from 'react';

interface MessageItemProps {
    messageText: string;
    onClick: (text: string) => void;
}

export const MessageItem: React.FC<MessageItemProps> = ({ messageText, onClick }) => {
    const [isPressed, setIsPressed] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    // Декларативно вычисляем стили на основе состояния
    const borderColor = isFocused 
        ? '#818cf8' 
        : (isHovered && !isPressed ? '#c7d2fe' : '#e5e7eb');
        
    const boxShadow = isFocused
        ? '0 0 0 3px rgba(129,140,248,0.25)'
        : (isHovered && !isPressed 
            ? '0 4px 12px rgba(99,102,241,0.12)' 
            : (isPressed ? 'inset 0 1px 2px rgba(0,0,0,0.06)' : '0 1px 2px rgba(0,0,0,0.04)'));

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={() => onClick(messageText)}
            onMouseDown={() => setIsPressed(true)}
            onMouseUp={() => setIsPressed(false)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => {
                setIsHovered(false);
                setIsPressed(false);
            }}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onClick(messageText);
                }
            }}
            style={{
                padding: '12px 16px',
                borderRadius: '12px',
                background: isPressed ? '#eef2ff' : '#ffffff',
                // Используем вычисленную переменную. Важно: используем border, а не borderColor
                border: `1px solid ${borderColor}`,
                boxShadow: boxShadow,
                color: '#1f2937',
                fontSize: '14px',
                lineHeight: 1.5,
                fontWeight: 500,
                cursor: 'pointer',
                userSelect: 'none',
                transition: 'background 0.15s ease, box-shadow 0.15s ease, transform 0.1s ease, border 0.15s ease',
                transform: isPressed ? 'scale(0.98)' : 'scale(1)',
                outline: 'none',
            }}
        >
            {messageText}
        </div>
    );
};