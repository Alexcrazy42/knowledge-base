import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

function OidcCallback() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    useEffect(() => {
        const code = searchParams.get('code');
        const verifier = sessionStorage.getItem('pkce_verifier');
        if (!code || !verifier) return;

        (async () => {
            const res = await fetch('/auth-api/connect/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code,
                redirect_uri: 'http://localhost:5173/oidc/callback',
                client_id: 'spa-app',
                code_verifier: verifier,
            }),
            });
            const tokens = await res.json();
            sessionStorage.removeItem('pkce_verifier');
            
            localStorage.setItem('accessToken', tokens.access_token);
            if (tokens.refresh_token) localStorage.setItem('refreshToken', tokens.refresh_token);
            if (tokens.id_token) localStorage.setItem('idToken', tokens.id_token);

            setTimeout(() => navigate('/info'), 500);
        })();
    }, []);

    return(
        <>
        Processing...
        </>
    )
}

export default OidcCallback;