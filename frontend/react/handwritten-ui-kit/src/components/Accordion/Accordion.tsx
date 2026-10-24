import { useState, type ReactNode } from 'react';
import styles from './Accordion.module.css';

export interface AccordionProps {
    headerContent: ReactNode;
    content: ReactNode;
    defaultOpen?: boolean; // Можно сразу открыть
}

export function Accordion({ headerContent, content, defaultOpen = false }: AccordionProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    const handleToggle = () => {
        setIsOpen(!isOpen);
    };

    return (
        <div className={`${styles.accordion} ${isOpen ? styles.open : ''}`}>
            <button
                type="button"
                className={styles.header}
                onClick={handleToggle}
                aria-expanded={isOpen}
            >
                <span className={styles.headerContent}>{headerContent}</span>
                <span className={styles.icon}>
                    <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path
                            d="M4 6L8 10L12 6"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </span>
            </button>

            <div
                className={[
                    styles.content,
                    !isOpen && styles.hidden
                ].filter(Boolean).join(' ')}
            >
                <div className={styles.contentInner}>
                    {content}
                </div>
            </div>
        </div>
    );
}