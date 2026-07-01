const FEATURES = [
  {
    icon: '⚡',
    accent: '#F3BA2F',
    title: 'Harga Realtime',
    desc: 'WebSocket langsung dari Binance untuk Crypto. Yahoo Finance & CoinGecko untuk IDX, US Stocks, dan Komoditas.',
  },
  {
    icon: '🐋',
    accent: '#a78bfa',
    title: 'Whale Alerts Feed',
    desc: 'Pantau transaksi besar on-chain secara realtime. Deteksi pergerakan "smart money" sebelum pasar bergerak.',
  },
  {
    icon: '📊',
    accent: '#f87171',
    title: 'Liquidation Heatmap',
    desc: 'Visualisasi zona likuidasi long/short di pasar futures. Identifikasi level harga yang menjadi magnet likuidasi.',
  },
  {
    icon: '🔓',
    accent: '#4ade80',
    title: 'Token Unlocks Calendar',
    desc: 'Jadwal cliff unlock token proyek crypto dalam 45 hari ke depan. Antisipasi tekanan jual dari team & investor.',
  },
  {
    icon: '🌊',
    accent: '#22d3ee',
    title: 'Stablecoin Flow',
    desc: 'Lacak net inflow/outflow USDT & USDC ke exchange. Indikator daya beli pasar yang tersembunyi dari retail.',
  },
  {
    icon: '🤖',
    accent: '#F3BA2F',
    title: 'AI Financial Consultant',
    desc: 'Chat dengan AI berbasis Llama 3 yang punya konteks penuh portofoliomu. Analisis, saran, dan strategi sesuai kondisimu.',
  },
  {
    icon: '📰',
    accent: '#60a5fa',
    title: 'Multi-Source Market News',
    desc: 'Agregasi berita dari CryptoCompare, Yahoo Finance, dan Google News — difilter berdasarkan aset di portofoliomu.',
  },
  {
    icon: '🌐',
    accent: '#f59e0b',
    title: 'Market Explorer',
    desc: 'Chart TradingView terintegrasi, screener aset lintas sektor, dan data fundamental dalam satu antarmuka.',
  },
];

export default function FeaturesSection() {
  return (
    <section style={{ padding: '100px 5%', position: 'relative' }}>
      {/* Section divider */}
      <div style={{ width: '1px', height: '80px', background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.08), transparent)', margin: '0 auto 60px' }} />

      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: '99px', padding: '5px 16px', marginBottom: '20px' }}>
            <span style={{ color: '#60a5fa', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em' }}>FITUR UNGGULAN</span>
          </div>
          <h2 style={{ color: '#e5e5e5', fontSize: 'clamp(26px, 3vw, 42px)', fontWeight: 900, letterSpacing: '-0.03em', margin: '0 0 16px', lineHeight: 1.15 }}>
            Kenapa TOTALFUND?
          </h2>
          <p style={{ color: '#737373', fontSize: '16px', lineHeight: 1.7, maxWidth: '520px', margin: '0 auto' }}>
            Bukan sekedar portfolio tracker. TOTALFUND adalah terminal finansial lengkap yang dirancang untuk trader dan investor serius.
          </p>
        </div>

        {/* Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '16px', overflow: 'hidden' }}>
          {FEATURES.map((f, i) => (
            <div key={f.title} style={{
              background: '#0a0a0a',
              padding: '28px 28px 32px',
              transition: 'background 0.2s',
              cursor: 'default',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = '#0f0f0f'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#0a0a0a'; }}
            >
              {/* Icon */}
              <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: `${f.accent}12`, border: `1px solid ${f.accent}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', marginBottom: '16px' }}>
                {f.icon}
              </div>
              {/* Content */}
              <div style={{ color: f.accent, fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '8px' }}>
                Premium
              </div>
              <h3 style={{ color: '#e5e5e5', fontSize: '16px', fontWeight: 800, margin: '0 0 10px', letterSpacing: '-0.02em' }}>
                {f.title}
              </h3>
              <p style={{ color: '#525252', fontSize: '13px', lineHeight: 1.65, margin: 0 }}>
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
