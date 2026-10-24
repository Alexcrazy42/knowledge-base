import { Skeleton } from './Skeleton';

export function BasicSkeleton() {
  return (
    <div style={{ maxWidth: '400px', padding: '20px' }}>
      <h3>Загрузка статьи...</h3>
      <Skeleton count={3} />
    </div>
  );
}