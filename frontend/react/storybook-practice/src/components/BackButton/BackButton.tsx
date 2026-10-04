import { useNavigate } from 'react-router-dom';

export const BackButton = ({ label }: { label: string }) => {
  const navigate = useNavigate();
  
  return (
    <button onClick={() => navigate(-1)}>
      ← {label}
    </button>
  );
};