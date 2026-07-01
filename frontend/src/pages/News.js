import { useState, useEffect, useMemo } from 'react';
import { API_BASE } from '../utils/api';

export default function News({ assets, t }) {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    const fetchNews = async () => {
      const validAssets = assets.filter(a => ['crypto', 'saham', 'saham_us', 'komoditas'].includes(a.type));
      if (validAssets.length === 0) return;

      setLoading(true);
      const tickersStr = validAssets.map(a => `${a.ticker}|${a.nama}`).join(',');

      try {
        const res = await fetch(`${API_BASE}/api/market-news?assets=${encodeURIComponent(tickersStr)}`);
        const data = await res.json();
        setNews(data.news || []);
      } catch (e) {
        console.error("Gagal menarik berita:", e);
      }
      setLoading(false);
    };
    fetchNews();
  }, [assets]);

  const filteredNews = useMemo(() => {
    if (activeTab === 'all') return news;
    const validTickers = assets.filter(a => {
      if (activeTab === 'crypto') return a.type === 'crypto';
      if (activeTab === 'saham_idx') return a.type === 'saham';
      if (activeTab === 'saham_us') return a.type === 'saham_us';
      if (activeTab === 'komoditas') return a.type === 'komoditas';
      return false;
    }).map(a => a.ticker);

    return news.filter(n => validTickers.includes(n.ticker));
  }, [news, activeTab, assets]);

  const tabs = [
    { id: 'all', label: t('all') },
    { id: 'crypto', label: t('cat_crypto') },
    { id: 'saham_idx', label: t('cat_saham_idx') },
    { id: 'saham_us', label: t('cat_saham_us') },
    { id: 'komoditas', label: t('cat_komoditas') }
  ];

  if (assets.filter(a => ['crypto', 'saham', 'saham_us', 'komoditas'].includes(a.type)).length === 0) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', backgroundColor: '#111C30', borderRadius: '16px', border: '1px solid rgba(79,124,255,0.06)', marginTop: '20px' }}>
        <div style={{ fontSize: '40px', marginBottom: '16px' }}>📰</div>
        <div style={{ color: '#fff', fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>{t('no_news_found')}</div>
        <div style={{ color: '#94A3B8', fontSize: '14px', fontWeight: 500 }}>{t('no_assets_news')}</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '40px' }}>
      <div>
        <h2 style={{ color: '#fff', fontSize: '22px', fontWeight: 800, letterSpacing: '-0.5px', margin: '0 0 16px' }}>{t('market_news')}</h2>
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', WebkitOverflowScrolling: 'touch' }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '8px 16px',
                borderRadius: '99px',
                border: '1px solid',
                borderColor: activeTab === tab.id ? '#16a34a' : 'rgba(255,255,255,0.1)',
                backgroundColor: activeTab === tab.id ? 'rgba(22, 163, 74, 0.1)' : 'transparent',
                color: activeTab === tab.id ? '#10B981' : '#CBD5E1',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s',
                flexShrink: 0
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="skeleton" style={{ height: '240px', borderRadius: '16px' }} />
          ))}
        </div>
      ) : filteredNews.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
          {filteredNews.map((item, idx) => (
            <a
              key={idx}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: '#111C30',
                border: '1px solid rgba(79,124,255,0.06)',
                borderRadius: '16px',
                overflow: 'hidden',
                textDecoration: 'none',
                transition: 'transform 0.2s, borderColor 0.2s'
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = 'rgba(79,124,255,0.2)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'rgba(79,124,255,0.06)'; }}
            >
              {item.thumbnail ? (
                <img src={item.thumbnail} alt="" style={{ width: '100%', height: '160px', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '160px', backgroundColor: 'rgba(79,124,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' }}>
                  📰
                </div>
              )}
              <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ backgroundColor: 'rgba(79,124,255,0.06)', color: '#F8FAFC', fontSize: '11px', fontWeight: 700, padding: '4px 8px', borderRadius: '6px' }}>{item.ticker}</span>
                  <span style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 500 }}>{new Date(item.published_at * 1000).toLocaleDateString()}</span>
                </div>
                <h3 style={{ color: '#fff', fontSize: '15px', fontWeight: 700, margin: '0 0 8px', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {item.title}
                </h3>
                <span style={{ color: '#94A3B8', fontSize: '12px', marginTop: 'auto', fontWeight: 500 }}>{item.publisher}</span>
              </div>
            </a>
          ))}
        </div>
      ) : (
        <div style={{ padding: '60px 20px', textAlign: 'center', backgroundColor: '#111C30', borderRadius: '16px', border: '1px solid rgba(79,124,255,0.06)' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>📰</div>
          <div style={{ color: '#94A3B8', fontSize: '14px', fontWeight: 500 }}>{t('no_news_found')}</div>
        </div>
      )}
    </div>
  );
}
