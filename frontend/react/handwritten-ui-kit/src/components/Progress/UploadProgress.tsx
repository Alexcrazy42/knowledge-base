import { useEffect, useState } from "react";
import { Progress } from "./Progress";

export function UploadProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 10;
      });
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ maxWidth: '400px', margin: '2rem auto' }}>
      <h3>Загрузка файла...</h3>
      <Progress progress={progress} showLabel={true} />
    </div>
  );
}