import styles from './Skeleton.module.css';

export interface SkeletonProps {
  shape?: 'text' | 'circle' | 'rect';
  width?: string | number;
  height?: string | number;
  count?: number;
  animation?: boolean;
  className?: string;
}

export function Skeleton({
  shape = 'text',
  width,
  height,
  count = 1,
  animation = true,
  className,
}: SkeletonProps) {
  if (shape === 'text' && count > 1) {
    return (
      <div
        className={`${styles.wrapper} ${className || ''}`}
        role="status"
        aria-busy="true"
        aria-label="Загрузка контента"
      >
        {Array.from({ length: count }, (_, index) => {
          const isLast = index === count - 1;
          
          const lineWidth = isLast ? '60%' : width || '100%';
          
          return (
            <div
              key={index}
              className={`${styles.skeleton} ${styles.text} ${
                animation ? styles.animated : ''
              }`}
              style={{
                width: lineWidth,
                height: height || 16,
              }}
            />
          );
        })}
      </div>
    );
  }

  const shapeClass = styles[shape] || styles.text;

  return (
    <div
      className={`${styles.skeleton} ${shapeClass} ${
        animation ? styles.animated : ''
      } ${className || ''}`}
      style={{
        width: width || (shape === 'circle' ? 40 : '100%'),
        height: height || (shape === 'circle' ? 40 : 16),
      }}
      role="status"
      aria-busy="true"
      aria-label="Загрузка контента"
    />
  );
}