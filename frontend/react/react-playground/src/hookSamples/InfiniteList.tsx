import { useState } from "react";
import { useIntersectionObserver } from "../hooks/useIntersectionObserver";

export function InfiniteList() {
  const [items, setItems] = useState(Array.from({ length: 20 }));
  const loadMore = () => {
    setTimeout(() => {
      setItems((p) => [...p, ...Array.from({ length: 10 })])
    }, 2000);
  }

  const sentinelRef = useIntersectionObserver(loadMore, {
    threshold: 0.1,
  });

  return (
    <div>
      {items.map((_, i) => (
        <div key={i}>Item {i}</div>
      ))}
      <div ref={sentinelRef}>Loading more...</div>
    </div>
  );
}
