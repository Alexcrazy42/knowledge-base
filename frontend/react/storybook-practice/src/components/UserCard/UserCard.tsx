import React from 'react';

interface UserCardProps {
  name: string;
  role: string;
  status: 'online' | 'offline' | 'busy';
  avatarUrl?: string;
}

export const UserCard: React.FC<UserCardProps> = ({ name, role, status, avatarUrl }) => {
  const statusColor = status === 'online' ? 'green' : status === 'busy' ? 'red' : 'gray';

  return (
    <div style={{ 
      border: '1px solid #ddd', 
      padding: '16px', 
      borderRadius: '8px', 
      width: '250px',
      fontFamily: 'sans-serif',
      display: 'flex',
      gap: '12px',
      alignItems: 'center'
    }}>
      {/* Имитация аватарки */}
      <div style={{ 
        width: '48px', 
        height: '48px', 
        borderRadius: '50%', 
        backgroundColor: '#ccc',
        backgroundImage: avatarUrl ? `url(${avatarUrl})` : 'none',
        backgroundSize: 'cover'
      }} />
      
      <div>
        <h3 style={{ margin: 0, fontSize: '16px' }}>{name}</h3>
        <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#666' }}>{role}</p>
        <span style={{ 
          fontSize: '12px', 
          color: statusColor, 
          textTransform: 'uppercase',
          fontWeight: 'bold'
        }}>
          ● {status}
        </span>
      </div>
    </div>
  );
};