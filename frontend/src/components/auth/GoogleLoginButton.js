import { useGoogleLogin } from '@react-oauth/google';
import { useState } from 'react';

// Inner component — only mounted when client_id exists, so hook is safe to call
function GoogleButton({ onSuccess, label }) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const login = useGoogleLogin({
    flow: 'implicit',
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      setError('');
      try {
        const res  = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });
        const data = await res.json();
        onSuccess({
          email:   data.email   || '',
          name:    data.name    || data.email || 'User',
          picture: data.picture || '',
        });
      } catch {
        setError('Gagal mengambil profil Google. Coba lagi.');
      } finally {
        setLoading(false);
      }
    },
    onError: () => {
      setLoading(false);
      setError('Login Google dibatalkan atau gagal.');
    },
  });

  return (
    <div>
      {error && (
        <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '8px', padding: '9px 13px', color: '#f87171', fontSize: '12px', marginBottom: '10px' }}>
          {error}
        </div>
      )}
      <button
        type="button"
        disabled={loading}
        onClick={() => { setError(''); login(); }}
        style={{
          width: '100%',
          background: '#fff',
          color: '#111',
          border: '1px solid rgba(0,0,0,0.12)',
          borderRadius: '10px',
          padding: '12px 16px',
          fontSize: '14px',
          fontWeight: 700,
          cursor: loading ? 'default' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          transition: 'box-shadow 0.15s, opacity 0.15s',
          opacity: loading ? 0.7 : 1,
          boxSizing: 'border-box',
        }}
        onMouseEnter={e => { if (!loading) e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.18)'; }}
        onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; }}
      >
        <svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          <path fill="none" d="M0 0h48v48H0z"/>
        </svg>
        {loading ? 'Memproses...' : label}
      </button>
    </div>
  );
}

// Outer wrapper — conditionally renders GoogleButton so hooks are never called without a client_id
export default function GoogleLoginButton({ onSuccess, label = 'Lanjutkan dengan Google' }) {
  if (!process.env.REACT_APP_GOOGLE_CLIENT_ID) return null;
  return <GoogleButton onSuccess={onSuccess} label={label} />;
}
