import { useState } from 'react';
import { Link } from 'react-router-dom';
import GoogleLoginButton from '../components/auth/GoogleLoginButton';

const S = {
  page:    { minHeight: '100vh', background: '#080808', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' },
  card:    { background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '20px', padding: '40px', width: '100%', maxWidth: '400px', boxShadow: '0 32px 80px rgba(0,0,0,0.6)' },
  label:   { color: '#525252', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '8px' },
  input:   { width: '100%', background: '#0f0f0f', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '13px 16px', color: '#e5e5e5', fontSize: '14px', outline: 'none', boxSizing: 'border-box', fontWeight: 500, transition: 'border-color 0.15s' },
  btn:     { width: '100%', background: 'linear-gradient(135deg, #F3BA2F, #f59e0b)', color: '#000', border: 'none', borderRadius: '10px', padding: '14px', fontSize: '15px', fontWeight: 800, cursor: 'pointer', letterSpacing: '-0.01em', transition: 'all 0.2s', boxShadow: '0 6px 24px rgba(243,186,47,0.3)' },
  divider: { height: '1px', background: 'rgba(255,255,255,0.05)', margin: '24px 0' },
  err:     { background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '8px', padding: '10px 14px', color: '#f87171', fontSize: '13px', marginBottom: '16px' },
};

function OrDivider() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0' }}>
      <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
      <span style={{ color: '#2a2a2a', fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em' }}>ATAU</span>
      <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
    </div>
  );
}

export default function LoginPage({ onLogin }) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) { setError('Email dan password wajib diisi.'); return; }
    setLoading(true);
    setError('');

    // — Replace with real API call —
    // const res = await fetch(`${API_BASE}/api/auth/login`, { method:'POST', body: JSON.stringify({email, password}) })
    // if (!res.ok) { setError('Email atau password salah.'); setLoading(false); return; }
    await new Promise(r => setTimeout(r, 600));
    onLogin({ email });
    setLoading(false);
  };

  return (
    <div style={S.page}>
      <div style={S.card}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'linear-gradient(135deg, #F3BA2F, #f59e0b)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <span style={{ color: '#000', fontWeight: 900, fontSize: '20px' }}>T</span>
          </div>
          <h1 style={{ color: '#e5e5e5', fontSize: '22px', fontWeight: 900, letterSpacing: '-0.03em', margin: '0 0 6px' }}>
            Masuk ke TOTALFUND
          </h1>
          <p style={{ color: '#525252', fontSize: '13px', margin: 0 }}>Terminal Finansial Premium</p>
        </div>

        {/* Google login — only shown when REACT_APP_GOOGLE_CLIENT_ID is set */}
        <GoogleLoginButton onSuccess={onLogin} label="Masuk dengan Google" />

        {process.env.REACT_APP_GOOGLE_CLIENT_ID && <OrDivider />}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {error && <div style={S.err}>{error}</div>}

          <div>
            <label style={S.label}>Email</label>
            <input
              type="email" value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="nama@email.com"
              style={S.input}
              onFocus={e => { e.target.style.borderColor = 'rgba(243,186,47,0.35)'; }}
              onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.07)'; }}
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ ...S.label, marginBottom: 0 }}>Password</label>
              <span style={{ color: '#3a3a3a', fontSize: '11px', cursor: 'pointer' }}>Lupa password?</span>
            </div>
            <input
              type="password" value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              style={S.input}
              onFocus={e => { e.target.style.borderColor = 'rgba(243,186,47,0.35)'; }}
              onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.07)'; }}
            />
          </div>

          <button type="submit" disabled={loading} style={{ ...S.btn, opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Memproses...' : 'Masuk →'}
          </button>
        </form>

        <div style={S.divider} />

        <p style={{ textAlign: 'center', color: '#3a3a3a', fontSize: '13px', margin: 0 }}>
          Belum punya akun?{' '}
          <Link to="/register" style={{ color: '#F3BA2F', fontWeight: 700, textDecoration: 'none' }}>
            Daftar gratis
          </Link>
        </p>

        <div style={{ ...S.divider, marginTop: '20px' }} />
        <Link to="/" style={{ display: 'block', textAlign: 'center', color: '#2a2a2a', fontSize: '12px', textDecoration: 'none' }}>
          ← Kembali ke beranda
        </Link>
      </div>
    </div>
  );
}
