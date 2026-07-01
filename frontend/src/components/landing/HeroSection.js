import { Link } from 'react-router-dom';

const MOCK_TICKER = [
  { s:'BTC',  p:'$107,432', c:'+2.34%', up:true  },
  { s:'ETH',  p:'$3,842',   c:'+1.87%', up:true  },
  { s:'SOL',  p:'$172.40',  c:'+4.12%', up:true  },
  { s:'BNB',  p:'$624.30',  c:'+0.95%', up:true  },
  { s:'XRP',  p:'$2.341',   c:'-0.56%', up:false },
  { s:'DOGE', p:'$0.3812',  c:'+5.67%', up:true  },
  { s:'AVAX', p:'$34.21',   c:'-1.23%', up:false },
  { s:'AAPL', p:'$234.87',  c:'+1.23%', up:true  },
  { s:'NVDA', p:'$138.42',  c:'+3.87%', up:true  },
  { s:'GOLD', p:'$3,324',   c:'+0.45%', up:true  },
  { s:'IHSG', p:'7,234',    c:'+0.87%', up:true  },
  { s:'TSLA', p:'$342.10',  c:'+2.14%', up:true  },
];

function MockTerminal() {
  return (
    <div style={{
      background: '#0a0a0a',
      border: '1px solid rgba(243,186,47,0.12)',
      borderRadius: '18px',
      overflow: 'hidden',
      boxShadow: '0 0 80px rgba(243,186,47,0.06), 0 40px 100px rgba(0,0,0,0.7)',
      width: '100%',
      maxWidth: '420px',
    }}>
      {/* Title bar */}
      <div style={{ background: '#111', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ display: 'flex', gap: '5px' }}>
          {['#ef4444','#f59e0b','#22c55e'].map(c => (
            <div key={c} style={{ width: '9px', height: '9px', borderRadius: '50%', background: c, opacity: 0.7 }} />
          ))}
        </div>
        <span style={{ color: '#2a2a2a', fontSize: '10px', fontWeight: 700, fontFamily: 'monospace', marginLeft: '8px', letterSpacing: '0.08em' }}>TOTALFUND TERMINAL v2</span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 5px #22c55e' }} />
          <span style={{ color: '#22c55e', fontSize: '9px', fontWeight: 700 }}>LIVE</span>
        </div>
      </div>

      {/* Net Worth */}
      <div style={{ padding: '16px 18px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div style={{ color: '#2a2a2a', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Total Portfolio</div>
        <div style={{ color: '#e5e5e5', fontSize: '28px', fontWeight: 900, fontFamily: 'monospace', letterSpacing: '-1px', lineHeight: 1 }}>$84,231.50</div>
        <div style={{ color: '#4ade80', fontSize: '12px', fontWeight: 700, marginTop: '5px' }}>↑ +$1,247.32 <span style={{ opacity: 0.7 }}>(+1.50% hari ini)</span></div>
      </div>

      {/* Price grid 2x2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        {[
          { s:'BTC',  p:'$107,432', c:'+2.34%', up:true  },
          { s:'ETH',  p:'$3,842',   c:'+1.87%', up:true  },
          { s:'SOL',  p:'$172.40',  c:'+4.12%', up:true  },
          { s:'AAPL', p:'$234.87',  c:'+1.23%', up:true  },
        ].map((item, i) => (
          <div key={item.s} style={{ padding: '12px 16px', borderRight: i % 2 === 0 ? '1px solid rgba(255,255,255,0.04)' : 'none', borderBottom: i < 2 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
            <div style={{ color: '#2a2a2a', fontSize: '9px', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '3px' }}>{item.s}/USDT</div>
            <div style={{ color: '#e5e5e5', fontSize: '14px', fontWeight: 800, fontFamily: 'monospace', lineHeight: 1.2 }}>{item.p}</div>
            <div style={{ color: item.up ? '#4ade80' : '#f87171', fontSize: '10px', fontWeight: 700, marginTop: '2px' }}>{item.c}</div>
          </div>
        ))}
      </div>

      {/* Fear & Greed + Whale Alert */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ color: '#2a2a2a', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>Fear & Greed</span>
          <div style={{ flex: 1, height: '4px', borderRadius: '2px', background: 'linear-gradient(90deg, #ef4444, #f59e0b, #eab308, #84cc16, #22c55e)', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '-4px', left: '72%', width: '12px', height: '12px', background: '#e5e5e5', borderRadius: '50%', border: '2px solid #0a0a0a', transform: 'translateX(-50%)' }} />
          </div>
          <span style={{ color: '#84cc16', fontSize: '11px', fontWeight: 800, fontFamily: 'monospace' }}>74</span>
          <span style={{ color: '#84cc16', fontSize: '9px', fontWeight: 700 }}>GREED</span>
        </div>
      </div>

      {/* Whale alert */}
      <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '12px' }}>🐋</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ color: '#F3BA2F', fontSize: '10px', fontWeight: 700, fontFamily: 'monospace' }}>1,500 BTC</span>
          <span style={{ color: '#3a3a3a', fontSize: '10px' }}> ($91.5M) Unknown → </span>
          <span style={{ color: '#f87171', fontSize: '10px', fontWeight: 700 }}>Binance</span>
        </div>
        <span style={{ color: '#1a1a1a', fontSize: '9px', fontFamily: 'monospace' }}>2m ago</span>
      </div>
    </div>
  );
}

export default function HeroSection() {
  const doubled = [...MOCK_TICKER, ...MOCK_TICKER];

  return (
    <section style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Ambient glow */}
      <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)', width: '700px', height: '400px', background: 'radial-gradient(ellipse, rgba(243,186,47,0.04) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'absolute', top: '10%', left: '5%', width: '300px', height: '300px', background: 'radial-gradient(ellipse, rgba(59,130,246,0.04) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '100px 5% 60px', maxWidth: '1280px', margin: '0 auto', width: '100%', gap: '60px', position: 'relative', zIndex: 1 }}>

        {/* Left: Copy */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: 'rgba(243,186,47,0.08)', border: '1px solid rgba(243,186,47,0.2)', borderRadius: '99px', padding: '5px 14px', marginBottom: '28px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#F3BA2F', boxShadow: '0 0 6px #F3BA2F' }} />
            <span style={{ color: '#F3BA2F', fontSize: '11px', fontWeight: 700, letterSpacing: '0.04em' }}>Financial Terminal Premium</span>
          </div>

          {/* Headline */}
          <h1 style={{ fontSize: 'clamp(32px, 4.5vw, 58px)', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.03em', margin: '0 0 22px', color: '#e5e5e5' }}>
            Kuasai Portofolio &{' '}
            <span style={{
              background: 'linear-gradient(135deg, #F3BA2F 0%, #f59e0b 50%, #fb923c 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              Makro Pasar
            </span>
            {' '}dalam Satu Terminal Finansial
          </h1>

          {/* Subheadline */}
          <p style={{ color: '#737373', fontSize: 'clamp(14px, 1.5vw, 18px)', lineHeight: 1.7, margin: '0 0 36px', maxWidth: '540px' }}>
            Pantau <strong style={{ color: '#a3a3a3' }}>Crypto, IDX, US Stocks, & Komoditas</strong> secara realtime.
            Dilengkapi Whale Alerts, Derivatives, AI Consultant, dan analisis multidimensi — semua dalam satu dashboard.
          </p>

          {/* CTAs */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '44px' }}>
            <Link to="/register" style={{ textDecoration: 'none' }}>
              <button style={{
                background: 'linear-gradient(135deg, #F3BA2F, #f59e0b)',
                color: '#000',
                border: 'none',
                borderRadius: '10px',
                padding: '14px 28px',
                fontSize: '15px',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 8px 32px rgba(243,186,47,0.3)',
                transition: 'all 0.2s',
                letterSpacing: '-0.01em',
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(243,186,47,0.4)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(243,186,47,0.3)'; }}
              >
                Mulai Sekarang →
              </button>
            </Link>
            <Link to="/login" style={{ textDecoration: 'none' }}>
              <button style={{
                background: 'transparent',
                color: '#a3a3a3',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px',
                padding: '14px 28px',
                fontSize: '15px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s',
                letterSpacing: '-0.01em',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; e.currentTarget.style.color = '#e5e5e5'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#a3a3a3'; }}
              >
                Masuk
              </button>
            </Link>
          </div>

          {/* Trust indicators */}
          <div style={{ display: 'flex', gap: '28px', flexWrap: 'wrap' }}>
            {[
              { icon: '🔒', text: 'Data Tersimpan Lokal' },
              { icon: '⚡', text: 'WebSocket Realtime' },
              { icon: '🤖', text: 'AI Consultant (Llama 3)' },
            ].map(item => (
              <div key={item.text} style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                <span style={{ fontSize: '13px' }}>{item.icon}</span>
                <span style={{ color: '#3a3a3a', fontSize: '12px', fontWeight: 600 }}>{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Mock Terminal */}
        <div style={{ flexShrink: 0, width: '420px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
          className="hero-terminal-wrapper">
          <MockTerminal />
        </div>
      </div>

      {/* Running ticker strip */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden', padding: '9px 0', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }}>
        <div style={{ display: 'flex', animation: 'lp-ticker 40s linear infinite', width: 'max-content' }}>
          {doubled.map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 22px', borderRight: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
              <span style={{ color: '#2a2a2a', fontSize: '10px', fontWeight: 700, letterSpacing: '0.04em' }}>{item.s}</span>
              <span style={{ color: '#737373', fontSize: '11px', fontFamily: 'monospace', fontWeight: 600 }}>{item.p}</span>
              <span style={{ color: item.up ? '#4ade80' : '#f87171', fontSize: '10px', fontWeight: 700 }}>{item.c}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
