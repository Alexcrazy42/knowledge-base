import styles from './Progress.module.css';

export interface ProgressProps {
  progress: number;
  showLabel?: boolean;
  size?: 'small' | 'medium' | 'large';
  color?: 'blue' | 'green' | 'red' | 'orange';
}

export function Progress({
  progress,
  showLabel = false,
  size = 'medium',
  color = 'blue',
}: ProgressProps) {
  const normalizedProgress = Math.max(0, Math.min(100, progress));

  return (
    <div className={`${styles.container} ${styles[size]}`}>
      <div
        className={styles.track}
        role="progressbar"
        aria-valuenow={normalizedProgress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Прогресс: ${normalizedProgress}%`}
      >
        <div
          className={`${styles.fill} ${styles[color]}`}
          style={{ width: `${normalizedProgress}%` }}
        />
      </div>
      
      {showLabel && (
        <span className={styles.label}>
          {Math.round(normalizedProgress)}%
        </span>
      )}
    </div>
  );
}