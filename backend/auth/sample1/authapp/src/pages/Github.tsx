import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

function Github() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [errorMessage, setErrorMessage] = useState<string>('');
    const exchanged = useRef(false);

    const githubCallback = async (code: string) => {
        const response = await fetch('/auth-api/connect/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'github_code',
                code,
                client_id: 'spa-app',
                scope: 'openid profile email offline_access',
            }).toString(),
        });

        if(!response.ok) throw new Error(await response.text());

        const tokens = await response.json();

        localStorage.setItem('accessToken', tokens.access_token);
        if (tokens.refresh_token) localStorage.setItem('refreshToken', tokens.refresh_token);
        if (tokens.id_token) localStorage.setItem('idToken', tokens.id_token);

        sessionStorage.removeItem('oauth_state');

        setStatus('success');
        setTimeout(() => navigate('/info'), 500);
    }

    useEffect(() => {
        if (exchanged.current) return;
        exchanged.current = true;

        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        console.log('🔍 Callback params:', { code, state, error, errorDescription });

        if (error) {
            setStatus('error');
            setErrorMessage(errorDescription || error);
            return;
        }

        if (!code) {
            setStatus('error');
            setErrorMessage('No authorization code received');
            return;
        }

        githubCallback(code);
        
    }, [searchParams]);

    if (status === 'error') {
        return (
            <div style={styles.container}>
                <div style={styles.card}>
                    <div style={styles.errorIcon}>❌</div>
                    <h2 style={styles.errorTitle}>Authentication Error</h2>
                    <p style={styles.errorMessage}>{errorMessage}</p>
                    <button onClick={() => navigate('/login')} style={styles.button}>
                        Back to Login
                    </button>
                </div>
            </div>
        );
    }

    if (status === 'success') {
        return (
            <div style={styles.container}>
                <div style={styles.card}>
                    <div style={styles.successIcon}>✅</div>
                    <h2 style={styles.successTitle}>Successfully Authenticated!</h2>
                    <p style={styles.successMessage}>Redirecting...</p>
                    <div style={styles.spinner} />
                </div>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <div style={styles.loadingIcon}>🔐</div>
                <h2 style={styles.loadingTitle}>Processing GitHub Login</h2>
                <p style={styles.loadingMessage}>Please wait...</p>
                <div style={styles.spinner} />
            </div>
        </div>
    );
}

const styles: Record<string, React.CSSProperties> = {
    container: {
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        padding: '20px',
    },
    card: {
        background: 'white',
        borderRadius: '24px',
        padding: '48px 40px',
        maxWidth: '420px',
        width: '100%',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        textAlign: 'center',
        animation: 'fadeIn 0.5s ease-out',
    },
    loadingIcon: {
        fontSize: '48px',
        marginBottom: '16px',
    },
    loadingTitle: {
        fontSize: '24px',
        fontWeight: 700,
        color: '#1a1a2e',
        margin: '0 0 8px 0',
    },
    loadingMessage: {
        color: '#6b7280',
        fontSize: '16px',
        margin: '0 0 24px 0',
    },
    loadingSubMessage: {
        color: '#9ca3af',
        fontSize: '14px',
        margin: '16px 0 0 0',
    },
    successIcon: {
        fontSize: '48px',
        marginBottom: '16px',
    },
    successTitle: {
        fontSize: '24px',
        fontWeight: 700,
        color: '#059669',
        margin: '0 0 8px 0',
    },
    successMessage: {
        color: '/info',
        fontSize: '16px',
        margin: '0 0 24px 0',
    },
    errorIcon: {
        fontSize: '48px',
        marginBottom: '16px',
    },
    errorTitle: {
        fontSize: '24px',
        fontWeight: 700,
        color: '#dc2626',
        margin: '0 0 8px 0',
    },
    errorMessage: {
        color: '#6b7280',
        fontSize: '16px',
        margin: '0 0 24px 0',
    },
    spinner: {
        width: '40px',
        height: '40px',
        border: '4px solid #f3f3f3',
        borderTop: '4px solid #667eea',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        margin: '16px auto 0',
    },
    button: {
        padding: '12px 24px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        border: 'none',
        borderRadius: '12px',
        fontSize: '16px',
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
};

const stylesKeyframes = `
    @keyframes fadeIn {
        from {
            opacity: 0;
            transform: translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    @keyframes spin {
        to {
            transform: rotate(360deg);
        }
    }
`;

if (typeof document !== 'undefined') {
    const styleTag = document.createElement('style');
    styleTag.textContent = stylesKeyframes;
    document.head.appendChild(styleTag);
}

export default Github;