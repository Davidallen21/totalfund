import { Link } from 'react-router-dom';

function CheckIcon({ color }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function CrossIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#2a2a2a" strokeWidth="2" strokeLinecap="round">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

function PricingCard({ pkg, isHighlighted }) {
  const { name, subtitle, price, priceNote, accent, popular, cta, ctaVariant, features } = pkg;

  const ctaStyle = {
    primary: {
      background: `linear-gradient(135deg, #F3BA2F, #f59e0b)`,
      color: '#000',
      border: 'none',
      boxShadow: '0 8px 28px rgba(243,186,47,0.3)',
    },
    outline: {
      background: 'transparent',
      color: '#737373',
      border: '1px solid rgba(255,255,255,0.1)',
    },
    purple: {
      background: 'rgba(167,139,250,0.12)',
      color: '#a78bfa',
      border: '1px solid rgba(167,139,250,0.25)',
    },
  };

  const btnStyle = ctaStyle[ctaVariant] || ctaStyle.outline;

  return (
    <div style={{
      background: popular ? 'linear-gradient(180deg, #0f0f0f 0%, #0a0a0a 100%)' : '#0a0a0a',
      border: popular ? `1px solid ${accent}35` : '1px solid rgba(255,255,255,0.06)',
      borderRadius: '18px',
      padding: '32px 28px 28px',
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: popular ? `0 0 60px ${accent}10, 0 24px 60px rgba(0,0,0,0.4)` : '0 8px 32px rgba(0,0,0,0.2)',
      transform: popular ? 'scale(1.02)' : 'scale(1)',
    }}>
      {/* Popular badge */}
      {popular && (
        <div style={{
          position: 'absolute', top: '-13px', left: '50%', transform: 'translateX(-50%)',
          background: `linear-gradient(135deg, ${accent}, #f59e0b)`,
          color: '#000', fontSize: '10px', fontWeight: 800,
          padding: '4px 16px', borderRadius: '99px', letterSpacing: '0.08em',
          whiteSpace: 'nowrap',
        }}>
          ⭐ PALING POPULER
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: accent }} />
          <span style={{ color: accent, fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{name}</span>
        </div>
        <div style={{ color: '#2a2a2a', fontSize: '12px', marginBottom: '16px' }}>{subtitle}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
          <span style={{ color: '#e5e5e5', fontSize: '28px', fontWeight: 900, fontFamily: 'monospace', letterSpacing: '-1px' }}>{price}</span>
        </div>
        <div style={{ color: '#2a2a2a', fontSize: '11px', marginTop: '3px' }}>{priceNote}</div>
      </div>

      {/* Divider */}
      <div style={{ height: '1px', background: `linear-gradient(90deg, transparent, ${accent}25, transparent)`, marginBottom: '22px' }} />

      {/* Features list */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '28px' }}>
        {features.map((f) => (
          <div key={f.text} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <div style={{ flexShrink: 0, marginTop: '1px' }}>
              {f.included ? <CheckIcon color={accent} /> : <CrossIcon />}
            </div>
            <span style={{ color: f.included ? '#a3a3a3' : '#2a2a2a', fontSize: '13px', lineHeight: 1.5 }}>
              {f.text}
            </span>
          </div>
        ))}
      </div>

      {/* CTA */}
      <Link to="/register" style={{ textDecoration: 'none' }}>
        <button style={{
          width: '100%',
          ...btnStyle,
          borderRadius: '10px',
          padding: '13px',
          fontSize: '14px',
          fontWeight: 800,
          cursor: 'pointer',
          transition: 'all 0.2s',
          letterSpacing: '-0.01em',
        }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'none'; }}
        >
          {cta}
        </button>
      </Link>
    </div>
  );
}

// packages prop — load from config or API, never hardcoded here
export default function PricingSection({ packages }) {
  return (
    <section style={{ padding: '100px 5% 120px', position: 'relative' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(243,186,47,0.08)', border: '1px solid rgba(243,186,47,0.18)', borderRadius: '99px', padding: '5px 16px', marginBottom: '20px' }}>
            <span style={{ color: '#F3BA2F', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em' }}>PAKET HARGA</span>
          </div>
          <h2 style={{ color: '#e5e5e5', fontSize: 'clamp(26px, 3vw, 42px)', fontWeight: 900, letterSpacing: '-0.03em', margin: '0 0 14px', lineHeight: 1.15 }}>
            Mulai Gratis, Upgrade Kapanpun
          </h2>
          <p style={{ color: '#737373', fontSize: '16px', lineHeight: 1.7, maxWidth: '480px', margin: '0 auto' }}>
            Tanpa komitmen jangka panjang. Bayar bulanan, batalkan kapan saja.
          </p>
        </div>

        {/* Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', alignItems: 'center' }}>
          {packages.map(pkg => (
            <PricingCard key={pkg.id} pkg={pkg} isHighlighted={pkg.popular} />
          ))}
        </div>

        {/* Fine print */}
        <p style={{ textAlign: 'center', color: '#2a2a2a', fontSize: '12px', marginTop: '36px' }}>
          Semua harga dalam IDR. Harga dapat berubah sewaktu-waktu. Fitur tersedia sesuai paket yang dipilih.
        </p>
      </div>
    </section>
  );
}
