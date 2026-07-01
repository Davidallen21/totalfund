import { Link } from 'react-router-dom';
import HeroSection from './HeroSection';
import FeaturesSection from './FeaturesSection';
import PricingSection from './PricingSection';
import { PACKAGES } from '../../config/pricingData';

function Navbar() {
  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 5%', height: '64px',
      background: 'rgba(8,8,8,0.85)',
      backdropFilter: 'blur(20px) saturate(180%)',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'linear-gradient(135deg, #F3BA2F, #f59e0b)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: '#000', fontSize: '14px', fontWeight: 900 }}>T</span>
        </div>
        <span style={{ color: '#e5e5e5', fontWeight: 900, fontSize: '17px', letterSpacing: '-0.03em' }}>
          TOTAL<span style={{ color: '#F3BA2F' }}>FUND</span>
        </span>
      </div>

      {/* Nav links — hide on mobile */}
      <div style={{ display: 'flex', gap: '2px' }} className="lp-nav-links">
        {[
          { label: 'Fitur',    href: '#features' },
          { label: 'Harga',    href: '#pricing'  },
        ].map(item => (
          <a key={item.label} href={item.href} style={{
            color: '#525252', fontSize: '13px', fontWeight: 600,
            padding: '8px 16px', borderRadius: '8px',
            textDecoration: 'none', transition: 'color 0.15s, background 0.15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.color = '#e5e5e5'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#525252'; e.currentTarget.style.background = 'transparent'; }}
          >
            {item.label}
          </a>
        ))}
      </div>

      {/* Auth buttons */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <Link to="/login" style={{ textDecoration: 'none' }}>
          <button style={{
            background: 'transparent', color: '#a3a3a3',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px', padding: '8px 18px',
            fontSize: '13px', fontWeight: 700, cursor: 'pointer',
            transition: 'all 0.15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.color = '#e5e5e5'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#a3a3a3'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
          >
            Masuk
          </button>
        </Link>
        <Link to="/register" style={{ textDecoration: 'none' }}>
          <button style={{
            background: 'linear-gradient(135deg, #F3BA2F, #f59e0b)',
            color: '#000', border: 'none', borderRadius: '8px',
            padding: '8px 18px', fontSize: '13px', fontWeight: 800,
            cursor: 'pointer', transition: 'all 0.15s',
            boxShadow: '0 4px 14px rgba(243,186,47,0.25)',
          }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'none'; }}
          >
            Mulai Gratis
          </button>
        </Link>
      </div>
    </nav>
  );
}

function StatsBanner() {
  const stats = [
    { value: '4 Sektor',    label: 'Crypto · IDX · US Stocks · Komoditas' },
    { value: 'Realtime',    label: 'Binance WebSocket + Yahoo Finance' },
    { value: 'AI Llama 3',  label: 'Konsultan AI dengan konteks portofolio' },
    { value: '100% Lokal',  label: 'Data tersimpan di browser kamu' },
  ];
  return (
    <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.3)' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', padding: '0 5%' }}>
        {stats.map((s, i) => (
          <div key={i} style={{ padding: '24px 20px', borderRight: i < stats.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', textAlign: 'center' }}>
            <div style={{ color: '#F3BA2F', fontSize: '18px', fontWeight: 900, fontFamily: 'monospace', letterSpacing: '-0.02em', marginBottom: '4px' }}>{s.value}</div>
            <div style={{ color: '#2a2a2a', fontSize: '11px', lineHeight: 1.5 }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Footer() {
  return (
    <footer style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '40px 5%' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '26px', height: '26px', borderRadius: '7px', background: 'linear-gradient(135deg, #F3BA2F, #f59e0b)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#000', fontSize: '12px', fontWeight: 900 }}>T</span>
          </div>
          <span style={{ color: '#2a2a2a', fontWeight: 700, fontSize: '14px', letterSpacing: '-0.02em' }}>
            TOTAL<span style={{ color: '#3a3a3a' }}>FUND</span>
          </span>
        </div>
        <p style={{ color: '#1a1a1a', fontSize: '12px', margin: 0 }}>
          © 2025 TotalFund. Financial Terminal untuk Investor Indonesia.
        </p>
        <div style={{ display: 'flex', gap: '20px' }}>
          {['Kebijakan Privasi', 'Syarat & Ketentuan'].map(link => (
            <span key={link} style={{ color: '#1a1a1a', fontSize: '12px', cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.color = '#3a3a3a'}
              onMouseLeave={e => e.currentTarget.style.color = '#1a1a1a'}
            >{link}</span>
          ))}
        </div>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  return (
    <div style={{ background: '#080808', minHeight: '100vh', color: '#e5e5e5' }}>
      <style>{`
        @keyframes lp-ticker {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @media (max-width: 768px) {
          .hero-terminal-wrapper { display: none !important; }
          .lp-nav-links { display: none !important; }
        }
      `}</style>

      <Navbar />

      <div id="hero">
        <HeroSection />
      </div>

      <StatsBanner />

      <div id="features">
        <FeaturesSection />
      </div>

      <div id="pricing">
        <PricingSection packages={PACKAGES} />
      </div>

      <Footer />
    </div>
  );
}
