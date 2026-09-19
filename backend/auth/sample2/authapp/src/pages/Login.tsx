import { useState, CSSProperties } from 'react';
import { useNavigate, Link } from 'react-router-dom';

// =============== СТИЛИ (CSS ОБЪЕКТЫ) ===============
const styles: Record<string, CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, sans-serif',
  },
  card: {
    background: 'white',
    borderRadius: '24px',
    padding: '48px 40px',
    width: '100%',
    maxWidth: '420px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    animation: 'slideUp 0.5s ease-out',
  },
  header: {
    textAlign: 'center' as const,
    marginBottom: '32px',
  },
  logoIcon: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '64px',
    height: '64px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    borderRadius: '16px',
    color: 'white',
    marginBottom: '16px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#1a1a2e',
    margin: '0 0 8px 0',
  },
  subtitle: {
    color: '#6b7280',
    fontSize: '16px',
    margin: 0,
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  },
  label: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#374151',
  },
  passwordHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  forgotLink: {
    fontSize: '13px',
    color: '#667eea',
    textDecoration: 'none',
    fontWeight: 500,
  },
  inputWrapper: {
    position: 'relative' as const,
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute' as const,
    left: '12px',
    color: '#9ca3af',
    pointerEvents: 'none' as const,
  },
  input: {
    width: '100%',
    padding: '12px 12px 12px 44px',
    border: '2px solid #e5e7eb',
    borderRadius: '12px',
    fontSize: '15px',
    transition: 'all 0.2s',
    background: '#f9fafb',
    color: '#1a1a2e',
    boxSizing: 'border-box' as const,
    outline: 'none',
  },
  inputFocus: {
    borderColor: '#667eea',
    background: 'white',
    boxShadow: '0 0 0 4px rgba(102, 126, 234, 0.1)',
  },
  inputDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  loginButton: {
    width: '100%',
    padding: '14px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
    marginTop: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  loginButtonHover: {
    transform: 'translateY(-2px)',
    boxShadow: '0 8px 25px rgba(102, 126, 234, 0.4)',
  },
  loginButtonDisabled: {
    opacity: 0.7,
    cursor: 'not-allowed',
  },
  errorMessage: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#dc2626',
    padding: '12px',
    borderRadius: '12px',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    textAlign: 'center' as const,
    margin: '8px 0',
  },
  dividerLine: {
    flex: 1,
    borderBottom: '2px solid #e5e7eb',
  },
  dividerText: {
    padding: '0 16px',
    color: '#6b7280',
    fontSize: '13px',
    fontWeight: 500,
  },
  googleButton: {
    width: '100%',
    padding: '14px',
    background: 'white',
    color: '#1a1a2e',
    border: '2px solid #e5e7eb',
    borderRadius: '12px',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
  },
  googleButtonHover: {
    background: '#f8f9fa',
    borderColor: '#d1d5db',
    transform: 'translateY(-2px)',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
  },
  googleButtonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  signupText: {
    textAlign: 'center' as const,
    marginTop: '24px',
    marginBottom: 0,
    color: '#6b7280',
    fontSize: '14px',
  },
  signupLink: {
    color: '#667eea',
    textDecoration: 'none',
    fontWeight: 600,
  },
  spinner: {
    display: 'inline-block',
    width: '20px',
    height: '20px',
    border: '3px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '50%',
    borderTopColor: 'white',
    animation: 'spin 0.6s linear infinite',
  },
};

// =============== ДОБАВЛЯЕМ КЛЮЧЕВЫЕ КАДРЫ ===============
const keyframes = `
  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(30px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

// =============== ИНТЕРФЕЙСЫ ===============
interface LoginFormData {
  email: string;
  password: string;
}

// =============== КОМПОНЕНТ ===============
function Login() {
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
  });
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = new URLSearchParams();
      data.append('grant_type', 'password');
      data.append('username', formData.email);
      data.append('password', formData.password);
      data.append('client_id', 'spa-app');
      data.append('scope', 'openid');

      const response = await fetch('/auth-api/connect/token', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: data.toString() // или просто formData
      });

      const json = await response.json();
      console.log(json)
      const accessToken = json.access_token;
      console.log(accessToken);
      localStorage.setItem('accessToken', accessToken);
      

      // Успешный вход
      navigate('/info');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleGithubLogin = async () => {
    const res = await fetch('/auth-api/api/GitHub/start', {
      method: 'GET',
      credentials: 'include',
    });
    const { redirect_url } = await res.json();
    window.location.href = redirect_url;
  };

  // Функция для объединения стилей
  const getInputStyle = (fieldId: string): CSSProperties => {
    const baseStyle = { ...styles.input };
    if (focusedField === fieldId) {
      Object.assign(baseStyle, styles.inputFocus);
    }
    if (loading) {
      Object.assign(baseStyle, styles.inputDisabled);
    }
    return baseStyle;
  };

  return (
    <>
      {/* Добавляем ключевые кадры */}
      <style>{keyframes}</style>

      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.header}>
            <div style={styles.logoIcon}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <h1 style={styles.title}>Welcome Back</h1>
            <p style={styles.subtitle}>Sign in to your account to continue</p>
          </div>

          <form style={styles.form} onSubmit={handleSubmit}>
            {error && (
              <div style={styles.errorMessage}>
                <span style={{ fontSize: '18px' }}>⚠️</span>
                {error}
              </div>
            )}

            <div style={styles.formGroup}>
              <label htmlFor="string" style={styles.label}>
                Email Address
              </label>
              <div style={styles.inputWrapper}>
                <svg
                  style={styles.inputIcon}
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                <input
                  type="string"
                  id="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  disabled={loading}
                  style={getInputStyle('email')}
                  required
                />
              </div>
            </div>

            <div style={styles.formGroup}>
              <div style={styles.passwordHeader}>
                <label htmlFor="password" style={styles.label}>
                  Password
                </label>
                <Link to="/forgot-password" style={styles.forgotLink}>
                  Forgot password?
                </Link>
              </div>
              <div style={styles.inputWrapper}>
                <svg
                  style={styles.inputIcon}
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
                <input
                  type="password"
                  id="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  disabled={loading}
                  style={getInputStyle('password')}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                ...styles.loginButton,
                ...(loading && styles.loginButtonDisabled),
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.4)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {loading ? (
                <>
                  <span style={styles.spinner}></span>
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div style={styles.divider}>
            <div style={styles.dividerLine}></div>
            <span style={styles.dividerText}>or continue with</span>
            <div style={styles.dividerLine}></div>
          </div>

          <button
            onClick={handleGithubLogin}
            disabled={loading}
            style={{
              ...styles.googleButton,
              ...(loading && styles.googleButtonDisabled),
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.background = '#f8f9fa';
                e.currentTarget.style.borderColor = '#d1d5db';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.05)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'white';
              e.currentTarget.style.borderColor = '#e5e7eb';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
            </svg>
            Sign in with Github
          </button>

          <p style={styles.signupText}>
            Don't have an account?{' '}
            <Link to="/register" style={styles.signupLink}>
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}

export default Login;