import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

function Github() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [errorMessage, setErrorMessage] = useState<string>('');
    const exchanged = useRef(false);

    const githubCallback = async (code: string, state: string) => {
        const response = await fetch('/auth-api/api/github/callback', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, state }),
            });

        if(!response.ok) throw new Error(await response.text());

        const verifier  = generatePkceVerifier();
        const challenge = await sha256Base64Url(verifier);
        sessionStorage.setItem('pkce_verifier', verifier);

        const params = new URLSearchParams({
            response_type: 'code',
            client_id: 'spa-app',
            redirect_uri: 'http://localhost:5173/oidc/callback',
            scope: 'openid profile email offline_access',
            state: crypto.randomUUID(),
            code_challenge: challenge,
            code_challenge_method: 'S256',
        });
        // eslint-disable-next-line react-hooks/immutability
        window.location.href = `/auth-api/connect/authorize?${params}`;
    }

    // ============ Base64URL (RFC 4648 §5) ============
    function base64UrlEncode(bytes: Uint8Array): string {
        // Превращаем байты в обычный base64
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        const base64 = btoa(binary);

        // Base64 → Base64URL: +→-, /→_, убираем =
        return base64
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
    }

    // ============ PKCE code_verifier ============
    function generatePkceVerifier(length: number = 64): string {
        // По RFC 7636 длина verifier: 43..128 символов
        // Берём криптостойкий рандом
        const bytes = new Uint8Array(length);
        crypto.getRandomValues(bytes);
        // Кодируем base64url → получаем строку из допустимых символов [A-Za-z0-9-._~]
        return base64UrlEncode(bytes).slice(0, length);
    }

    // ============ PKCE code_challenge ============
    async function sha256Base64Url(input: string): Promise<string> {
        const encoder = new TextEncoder();
        const data = encoder.encode(input);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        return base64UrlEncode(new Uint8Array(hashBuffer));
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

        githubCallback(code, state);
        
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