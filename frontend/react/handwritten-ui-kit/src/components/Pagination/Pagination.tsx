import styles from './Pagination.module.css';

export interface PaginationProps {
  current: number;
  total: number;
  pageSize: number;
  onChange: (page: number, pageSize: number) => void;
}

export function Pagination({
  current,
  total,
  pageSize,
  onChange
}: PaginationProps) {
  const totalPages = Math.ceil(total / pageSize);

  if (totalPages <= 1) {
    return null;
  }

  // Генерация массива страниц с "..."
  const generatePageNumbers = (): (number | string)[] => {
    const pages: (number | string)[] = [];
    const delta = 2; // Количество страниц до и после текущей

    const left = Math.max(2, current - delta);
    const right = Math.min(totalPages - 1, current + delta);

    pages.push(1);

    // Добавляем "..." если есть пропуск между 1 и left
    if (left > 2) {
      pages.push('...');
    }

    // Добавляем страницы вокруг текущей
    for (let i = left; i <= right; i++) {
      pages.push(i);
    }

    // Добавляем "..." если есть пропуск между right и последней страницей
    if (right < totalPages - 1) {
      pages.push('...');
    }

    // Всегда добавляем последнюю страницу (если она не первая)
    if (totalPages > 1) {
      pages.push(totalPages);
    }

    return pages;
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== current) {
      onChange(page, pageSize);
    }
  };

  const pageNumbers = generatePageNumbers();

  return (
    <div className={styles.pagination}>
      <button
        type="button"
        className={`${styles.button} ${styles.navButton}`}
        disabled={current === 1}
        onClick={() => handlePageChange(current - 1)}
        aria-label="Предыдущая страница"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M10 12L6 8L10 4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <div className={styles.pages}>
        {pageNumbers.map((page, index) => {
          if (page === '...') {
            return (
              <span key={`ellipsis-${index}`} className={styles.ellipsis}>
                ...
              </span>
            );
          }

          const isActive = page === current;

          return (
            <button
              key={page}
              type="button"
              className={`${styles.button} ${styles.pageButton} ${
                isActive ? styles.active : ''
              }`}
              onClick={() => handlePageChange(page as number)}
              aria-label={`Страница ${page}`}
              aria-current={isActive ? 'page' : undefined}
            >
              {page}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        className={`${styles.button} ${styles.navButton}`}
        disabled={current === totalPages}
        onClick={() => handlePageChange(current + 1)}
        aria-label="Следующая страница"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M6 4L10 8L6 12"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}