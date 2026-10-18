import { useState } from 'react';
import { Pagination } from './Pagination';

function UsersList() {
  const [current, setCurrent] = useState(1);
  const [pageSize] = useState(10);
  const totalUsers = 150;

  const users = Array.from({ length: pageSize }, (_, i) => ({
    id: (current - 1) * pageSize + i + 1,
    name: `Пользователь ${(current - 1) * pageSize + i + 1}`,
  }));

  return (
    <div style={{ maxWidth: '800px', margin: '2rem auto', padding: '0 1rem' }}>
      <h2>Список пользователей</h2>
      
      <div style={{ marginBottom: '1rem' }}>
        {users.map(user => (
          <div key={user.id} style={{ padding: '12px', borderBottom: '1px solid #f0f0f0' }}>
            <strong>{user.name}</strong>
          </div>
        ))}
      </div>

      <Pagination
        current={current}
        total={totalUsers}
        pageSize={pageSize}
        onChange={(page) => setCurrent(page)}
      />
    </div>
  );
}

export default UsersList;