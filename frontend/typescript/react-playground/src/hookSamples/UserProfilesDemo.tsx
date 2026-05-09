import { use, Suspense, useState } from 'react';

interface User {
  id: number;
  name: string;
  email: string;
  avatar: string;
  posts: number;
  followers: number;
}

const fetchUser = (userId: number): Promise<User> => {
  
  return new Promise((resolve) => {
    const delay = 1000 + Math.random() * 2000; // 1-3s
    setTimeout(() => {
      const users: User[] = [
        {
          id: 1,
          name: 'Alice Johnson',
          email: 'alice@example.com',
          avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face',
          posts: 42,
          followers: 1289
        },
        {
          id: 2,
          name: 'Bob Smith',
          email: 'bob@example.com',
          avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
          posts: 156,
          followers: 5423
        },
        {
          id: 3,
          name: 'Diana Wilson',
          email: 'diana@example.com',
          avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face',
          posts: 89,
          followers: 2341
        }
      ];
      
      resolve(users[userId - 1]);
    }, delay);
  });
};

function UserProfile({ userPromise }: { userPromise: Promise<User> }) {
  const user = use(userPromise);  // 🚀 Авто-Suspense!

  return (
    <div style={{
      border: '2px solid #3b82f6',
      borderRadius: '16px',
      padding: '32px',
      background: 'white',
      boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
      maxWidth: '400px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <img 
          src={user.avatar} 
          alt={user.name}
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            objectFit: 'cover',
            border: '4px solid #3b82f6'
          }}
        />
        <div>
          <h2 style={{ margin: 0, fontSize: '28px', color: '#1f2937' }}>
            {user.name}
          </h2>
          <p style={{ margin: '4px 0 0 0', color: '#6b7280', fontSize: '14px' }}>
            {user.email}
          </p>
        </div>
      </div>
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '16px',
        fontSize: '18px'
      }}>
        <div style={{ textAlign: 'center', padding: '16px', background: '#eff6ff', borderRadius: '12px' }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#3b82f6' }}>
            {user.posts}
          </div>
          Posts
        </div>
        <div style={{ textAlign: 'center', padding: '16px', background: '#f0fdf4', borderRadius: '12px' }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#10b981' }}>
            {user.followers.toLocaleString()}
          </div>
          Followers
        </div>
      </div>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div style={{
      border: '2px solid #e5e7eb',
      borderRadius: '16px',
      padding: '32px',
      background: '#f9fafb',
      maxWidth: '400px',
      height: '300px',
      display: 'flex',
      flexDirection: 'column',
      gap: '24px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: 'linear-gradient(90deg, #f3f4f6, #e5e7eb)',
          animation: 'pulse 1.5s ease-in-out infinite'
        }} />
        <div>
          <div style={{
            width: '200px',
            height: '24px',
            background: 'linear-gradient(90deg, #f3f4f6, #e5e7eb)',
            borderRadius: '8px',
            animation: 'pulse 1.5s ease-in-out infinite'
          }} />
          <div style={{
            width: '120px',
            height: '16px',
            background: 'linear-gradient(90deg, #f3f4f6, #e5e7eb)',
            borderRadius: '6px',
            marginTop: '8px',
            animation: 'pulse 1.5s ease-in-out infinite 0.2s'
          }} />
        </div>
      </div>
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '16px'
      }}>
        <div style={{
          padding: '16px',
          background: '#f3f4f6',
          borderRadius: '12px',
          textAlign: 'center',
          animation: 'pulse 1.5s ease-in-out infinite 0.4s'
        }}>
          <div style={{
            width: '60px',
            height: '36px',
            background: 'linear-gradient(90deg, #f3f4f6, #e5e7eb)',
            borderRadius: '8px',
            margin: '0 auto'
          }} />
        </div>
        <div style={{
          padding: '16px',
          background: '#f3f4f6',
          borderRadius: '12px',
          textAlign: 'center',
          animation: 'pulse 1.5s ease-in-out infinite 0.6s'
        }}>
          <div style={{
            width: '80px',
            height: '36px',
            background: 'linear-gradient(90deg, #f3f4f6, #e5e7eb)',
            borderRadius: '8px',
            margin: '0 auto'
          }} />
        </div>
      </div>
    </div>
  );
}

export function UserProfilesDemo() {
  const [selectedUser, setSelectedUser] = useState(1);

  return (
    <div style={{
      padding: '40px',
      maxWidth: '1000px',
      margin: '0 auto',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <h1 style={{ 
        fontSize: '36px', 
        color: '#111827', 
        marginBottom: '40px',
        textAlign: 'center'
      }}>
        🚀 React `use(promise)` Demo
      </h1>
      
      {/* 🎛️ Controls */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '12px',
        marginBottom: '40px',
        flexWrap: 'wrap'
      }}>
        {[1, 2, 3].map((userId) => (
          <button
            key={userId}
            onClick={() => setSelectedUser(userId)}
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              border: 'none',
              borderRadius: '12px',
              background: selectedUser === userId ? '#3b82f6' : '#f3f4f6',
              color: selectedUser === userId ? 'white' : '#374151',
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontWeight: 500
            }}
          >
            Load User {userId}
          </button>
        ))}
      </div>

      {/* 🎭 Suspense + use() */}
      <Suspense fallback={<ProfileSkeleton />}>
        <UserProfile userPromise={fetchUser(selectedUser)} />
      </Suspense>
    </div>
  );
}
