import { useCallback, useEffect, useState, useRef, type ReactNode, useMemo } from 'react';
import styles from './Search.module.css';
import { debounce } from 'lodash';

export interface SearchProps<T> {
    label?: string;
    placeholder?: string;
    error?: string;
    searchFn: (query: string) => Promise<T[]>;
    onSelect: (item: T) => void;
    render: (item: T) => ReactNode;
    minQueryLength?: number;
    debounceMs?: number;
}

export function Search<T>({
    label,
    placeholder,
    error,
    onSelect,
    searchFn,
    render,
    minQueryLength = 1,
    debounceMs = 300,
}: SearchProps<T>) {
    const [items, setItems] = useState<T[]>([]);
    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [isLoading, setIsLoading] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);
    const resultsRef = useRef<HTMLDivElement>(null);

    const debouncedSearch = useMemo(
        () => debounce(async (query: string) => {   
            setIsLoading(true);
            setIsOpen(true);
            
            try {
                const els = await searchFn(query);
                setItems(els);
                setSelectedIndex(-1);
            } catch (error) {
                console.error('Ошибка поиска:', error);
                setItems([]);
            } finally {
                setIsLoading(false);
            }
        }, debounceMs),
        [searchFn, debounceMs]
    );

    useEffect(() => {
        if (query.length < minQueryLength) {
            setItems([]);
            setIsOpen(false);
            return;
        }
        
        debouncedSearch(query);
    }, [query, debouncedSearch, minQueryLength]);

    useEffect(() => {
        return () => {
            debouncedSearch.cancel();
        };
    }, [debouncedSearch]);


    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(e.target as Node)
            ) {
                setIsOpen(false);
                setSelectedIndex(-1);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && selectedIndex >= 0 && resultsRef.current) {
            const activeElement = resultsRef.current.querySelector(
                `[data-index="${selectedIndex}"]`
            );
            activeElement?.scrollIntoView({ block: 'nearest' });
        }
    }, [selectedIndex, isOpen]);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (!isOpen) return;

            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    setSelectedIndex((prev) => {
                        const next = prev + 1;
                        return next < items.length ? next : 0;
                    });
                    break;

                case 'ArrowUp':
                    e.preventDefault();
                    setSelectedIndex((prev) => {
                        const next = prev - 1;
                        return next >= 0 ? next : items.length - 1;
                    });
                    break;

                case 'Enter':
                    e.preventDefault();
                    if (selectedIndex >= 0 && selectedIndex < items.length) {
                        onSelect(items[selectedIndex]);
                        setIsOpen(false);
                        setQuery('');
                    }
                    break;

                case 'Escape':
                    e.preventDefault();
                    setIsOpen(false);
                    setSelectedIndex(-1);
                    break;
            }
        },
        [isOpen, items, selectedIndex, onSelect]
    );

    const handleSelect = useCallback(
        (item: T) => {
            onSelect(item);
            setIsOpen(false);
            setQuery('');
            setSelectedIndex(-1);
        },
        [onSelect]
    );

    return (
        <div className={styles.search} ref={containerRef} onKeyDown={handleKeyDown}>
            {label && <label className={styles.label}>{label}</label>}

            <div className={styles.inputWrapper}>
                <input
                    className={styles.input}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={placeholder ?? 'Начните ввод..'}
                    aria-autocomplete="list"
                    aria-expanded={isOpen}
                />
                {isLoading && <span className={styles.spinner}>⟳</span>}
            </div>

            {error && (
                <div className={styles.error}>
                    <span className={styles.errorText}>{error}</span>
                </div>
            )}

            {isOpen && (
                <div className={styles.results} ref={resultsRef} role="listbox">
                    {items.length > 0 ? (
                        items.map((item, index) => {
                            const isSelected = index === selectedIndex;

                            const itemClasses = [
                                styles.option,
                                isSelected && styles['option-selected'],
                            ]
                                .filter(Boolean)
                                .join(' ');

                            return (
                                <div
                                    key={index}
                                    data-index={index}
                                    className={itemClasses}
                                    role="option"
                                    aria-selected={isSelected}
                                    onClick={() => handleSelect(item)}
                                    onMouseEnter={() => setSelectedIndex(index)}
                                >
                                    {render(item)}
                                </div>
                            );
                        })
                    ) : (
                        !isLoading && (
                            <div className={styles.empty}>Ничего не найдено</div>
                        )
                    )}
                </div>
            )}
        </div>
    );
}