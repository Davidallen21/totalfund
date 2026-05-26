import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import './App.css';

import { useLocalStorage } from './hooks/useLocalstorage';
import { formatUSD, formatIDR, COLORS, renderAIText } from './utils/helpers';
import { NetWorthTrendCard, NetWorthDetailPage } from './networthtrend';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

async function fetchWithRetry(url, opts = {}, retries = 2, timeout = 6000) {
  for (let i = 0; i <= retries; i++) {
    const ctrl = new AbortController();
    const tid  = setTimeout(() => ctrl.abort(), timeout);
    try {
      const res = await fetch(url, { ...opts, signal: ctrl.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res;
    } catch (err) {
      if (i === retries) throw err;
      await new Promise(r => setTimeout(r, 400 * (i + 1)));
    } finally {
      clearTimeout(tid);
    }
  }
}

function useWindowSize() {
  const [size, setSize] = useState({ width: window.innerWidth });
  useEffect(() => {
    const handler = () => setSize({ width: window.innerWidth });
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return size;
}

const PERIODS = [
  { label: '1D', days: 1 }, { label: '7D', days: 7 }, { label: '1M', days: 30 },
  { label: '6M', days: 180 }, { label: '1Y', days: 365 }, { label: '5Y', days: 1825 },
  { label: 'All', days: null },
];

const NAV_ITEMS = [
  { key: 'portfolio', label: 'My Portfolio', icon: '◈' },
  { key: 'ai',        label: 'AI Consultant', icon: '✦' },
];

const SUGGESTIONS = [
  'Analisa portfolio saya secara keseluruhan',
  'Aset mana yang paling menguntungkan?',
  'Bagaimana kondisi pasar hari ini?',
  'Rekomendasi rebalancing portfolio saya',
];

function Sidebar({ activePage, setActivePage, onClose, isOpen, username, setUsername, profilePic, setProfilePic }) {
  const fileInputRef = useRef(null);

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePic(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className={`app-sidebar${isOpen ? ' sidebar-open' : ''}`}>
      {/* SEKSI PROFIL PENGGUNA BARU */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '24px 20px', borderBottom: '1px solid #1f1f1f' }}>
        <div 
          onClick={handleImageClick}
          style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: '#262626', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', border: '2px solid #333', flexShrink: 0, position: 'relative' }}
          title="Klik untuk ubah foto profil"
        >
          {profilePic ? (
            <img src={profilePic} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ color: '#737373', fontSize: '16px', fontWeight: 'bold' }}>{username ? username[0].toUpperCase() : 'U'}</span>
          )}
        </div>
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleImageChange} 
          accept="image/*" 
          style={{ display: 'none' }} 
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <input 
            type="text"
            value={username} 
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Set Username"
            style={{ background: 'none', border: 'none', color: '#ffffff', fontSize: '14px', fontWeight: 600, outline: 'none', width: '100%', padding: 0 }}
            title="Klik untuk mengedit nama"
          />
          <div style={{ color: '#555', fontSize: '11px', marginTop: '2px', fontWeight: 500 }}>Investor Account</div>
        </div>
        {onClose && (
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#555', fontSize: '18px', cursor: 'pointer', lineHeight: 1, padding: '4px' }}>✕</button>
        )}
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map(({ key, label, icon }) => (
          <div key={key} className={`nav-item${activePage === key ? ' active' : ''}`} onClick={() => { setActivePage(key); onClose?.(); }}>
            <span className="nav-icon">{icon}</span>{label}
          </div>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="status-dot" />
        <span style={{ color: '#6b7280', fontSize: 12, fontWeight: 500 }}>System Online</span>
      </div>
    </div>
  );
}

function DonutChart({ data }) {
  let cum = 0;
  const coords = (p) => [Math.cos(2 * Math.PI * p), Math.sin(2 * Math.PI * p)];
  return (
    <svg viewBox="-1 -1 2 2" style={{ width: '130px', height: '130px', transform: 'rotate(-90deg)' }}>
      {data.map(slice => {
        if (slice.pct <= 0) return null;
        if (slice.pct >= 99.9) return <circle key={slice.ticker} r="0.8" fill="transparent" stroke={slice.color} strokeWidth="0.4" />;
        const [sx, sy] = coords(cum);
        cum += slice.pct / 100;
        const [ex, ey] = coords(cum);
        const large = slice.pct > 50 ? 1 : 0;
        return <path key={slice.ticker} d={`M ${sx} ${sy} A 1 1 0 ${large} 1 ${ex} ${ey} L 0 0`} fill={slice.color} />;
      })}
      <circle r="0.6" cx="0" cy="0" fill="#141414" />
    </svg>
  );
}

function DataRow({ asset, hargaLiveUSD, hargaLiveIDR, kursIdr, totalNetWorthUSD, onEdit, onDelete, isLast }) {
  const isCrypto    = asset.type === 'crypto';
  const isSaham     = asset.type === 'saham';
  const isSahamUS   = asset.type === 'saham_us';
  const isKomoditas = asset.type === 'komoditas';
  const isStable    = asset.type === 'stable';
  const isCashIDR   = asset.type === 'cash_idr';

  const hargaAcuan    = isCrypto || isKomoditas || isSahamUS ? hargaLiveUSD : isSaham ? hargaLiveIDR : 1;
  const nilaiModal    = asset.avg * asset.jumlah;
  const nilaiSekarang = hargaAcuan ? hargaAcuan * asset.jumlah : isCashIDR ? asset.jumlah : null;
  const pnl           = nilaiSekarang && !isStable && !isCashIDR ? nilaiSekarang - nilaiModal : null;
  const pnlPersen     = nilaiModal > 0 && pnl ? (pnl / nilaiModal) * 100 : 0;
  const profit        = pnl >= 0;
  const nilaiDalamUSD = isSaham || isCashIDR ? (nilaiSekarang ?? 0) / kursIdr : (nilaiSekarang ?? 0);
  const pct           = totalNetWorthUSD > 0 ? ((nilaiDalamUSD / totalNetWorthUSD) * 100).toFixed(1) : 0;

  const typeConfig = {
    crypto:    { color: '#f59e0b', bg: 'rgba(245,158,11,0.15)'  },
    saham:     { color: '#3b82f6', bg: 'rgba(59,130,246,0.15)'  },
    saham_us:  { color: '#ec4899', bg: 'rgba(236,72,153,0.15)'  },
    komoditas: { color: '#eab308', bg: 'rgba(234,179,8,0.15)'   },
    stable:    { color: '#10b981', bg: 'rgba(16,185,129,0.15)'  },
    cash_idr:  { color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)'  },
  }[asset.type] || { color: '#737373', bg: 'rgba(115,115,115,0.15)' };

  return (
    <>
      <div className="asset-row-desktop" style={{ alignItems: 'center', padding: '12px 28px', borderBottom: isLast ? 'none' : '1px solid #1f1f1f', gap: '16px', transition: 'background 0.2s' }}>
        <div style={{ flex: 2, display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: typeConfig.bg, color: typeConfig.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '10px', flexShrink: 0, overflow: 'hidden' }}>
            {asset.thumb ? (
              <img src={asset.thumb} alt={asset.ticker} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              asset.ticker.substring(0, 4)
            )}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ color: '#ffffff', fontWeight: 600, fontSize: '14px', letterSpacing: '-0.2px' }}>{asset.ticker}</div>
            <div style={{ color: '#737373', fontSize: '11px', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{asset.nama}</div>
          </div>
        </div>
        <div style={{ flex: 1.5 }}>
          {isCashIDR ? <span style={{ color: '#404040', fontSize: '13px' }}>Pegged</span> : (
            <>
              <div style={{ color: '#e5e5e5', fontWeight: 500, fontSize: '13px' }}>{hargaAcuan ? (isSaham ? formatIDR(hargaAcuan) : formatUSD(hargaAcuan)) : <span style={{ color: '#383838' }}>—</span>}</div>
              <div style={{ color: '#555', fontSize: '11px', marginTop: '2px' }}>{hargaAcuan ? (isSaham ? formatUSD(hargaAcuan / kursIdr) : formatIDR(hargaAcuan * kursIdr)) : ''}</div>
            </>
          )}
        </div>
        <div style={{ flex: 1.5 }}>
          {isCashIDR ? (
            <div style={{ color: '#e5e5e5', fontWeight: 500, fontSize: '13px' }}>{formatIDR(asset.jumlah).replace('Rp ', '')} <span style={{ color: '#555', fontSize: '11px', fontWeight: 400 }}>IDR</span></div>
          ) : (
            <>
              <div style={{ color: '#e5e5e5', fontWeight: 500, fontSize: '13px' }}>{(isSaham ? asset.jumlah / 100 : asset.jumlah).toLocaleString()} <span style={{ color: '#555', fontSize: '11px', fontWeight: 400 }}>{isSaham ? 'Lot' : asset.ticker}</span></div>
              <div style={{ color: '#555', fontSize: '11px', marginTop: '2px' }}>Avg: {isSaham ? formatIDR(asset.avg) : formatUSD(asset.avg)}</div>
            </>
          )}
        </div>
        <div style={{ flex: 1.5 }}>
          <div style={{ color: '#e5e5e5', fontWeight: 600, fontSize: '13px' }}>{nilaiSekarang ? (isSaham || isCashIDR ? formatIDR(nilaiSekarang) : formatUSD(nilaiSekarang)) : '—'}</div>
          <div style={{ color: '#555', fontSize: '11px', marginTop: '2px' }}>{nilaiSekarang ? (isSaham || isCashIDR ? formatUSD(nilaiSekarang / kursIdr) : formatIDR(nilaiSekarang * kursIdr)) : ''}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '6px' }}>
            <div style={{ width: '60px', height: '2px', backgroundColor: '#252525', borderRadius: '999px', overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(parseFloat(pct), 100)}%`, height: '100%', backgroundColor: typeConfig.color }} />
            </div>
            <span style={{ fontSize: '10px', color: '#555', fontWeight: 600 }}>{pct}%</span>
          </div>
        </div>
        <div style={{ flex: 1.5 }}>
          {!isStable && !isCashIDR && pnl !== null ? (
            <>
              <div style={{ color: profit ? '#4ade80' : '#f87171', fontWeight: 600, fontSize: '13px', letterSpacing: '-0.3px' }}>{profit ? '+' : ''}{isSaham ? formatIDR(pnl) : formatUSD(pnl)}</div>
              <div style={{ color: profit ? '#4ade80' : '#f87171', fontSize: '11px', fontWeight: 600, marginTop: '2px' }}>{profit ? '▲' : '▼'} {Math.abs(pnlPersen).toFixed(2)}%</div>
            </>
          ) : <span style={{ color: '#383838', fontSize: '16px' }}>—</span>}
        </div>
        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
          <button onClick={() => onEdit(asset)} style={{ backgroundColor: 'transparent', color: '#909090', border: '1px solid #333', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>Edit</button>
          <button onClick={() => onDelete(asset)} style={{ backgroundColor: 'transparent', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px', padding: '6px 10px', fontSize: '12px', cursor: 'pointer' }}>✕</button>
        </div>
      </div>

      <div className="asset-row-mobile" style={{ borderBottom: '1px solid #1f1f1f', padding: '12px 16px' }}>
        <div className="asset-row-mobile-top">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: typeConfig.bg, color: typeConfig.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '10px', flexShrink: 0, overflow: 'hidden' }}>
              {asset.thumb ? (
                <img src={asset.thumb} alt={asset.ticker} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                asset.ticker.substring(0, 4)
              )}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ color: '#fff', fontWeight: 600, fontSize: '14px' }}>{asset.ticker}</div>
              <div style={{ color: '#737373', fontSize: '11px', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{asset.nama}</div>
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ color: '#e5e5e5', fontWeight: 600, fontSize: '14px' }}>{nilaiSekarang ? (isSaham || isCashIDR ? formatIDR(nilaiSekarang) : formatUSD(nilaiSekarang)) : '—'}</div>
            <div style={{ color: '#555', fontSize: '11px', marginTop: '2px' }}>{nilaiSekarang ? (isSaham || isCashIDR ? formatUSD(nilaiSekarang / kursIdr) : formatIDR(nilaiSekarang * kursIdr)) : ''}</div>
          </div>
        </div>
        <div className="asset-row-mobile-bottom" style={{ marginTop: '12px' }}>
          <div className="asset-row-mobile-stats" style={{ gap: '16px' }}>
            {!isCashIDR && (
              <div>
                <div style={{ color: '#555', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '2px' }}>Harga</div>
                <div style={{ color: '#e5e5e5', fontSize: '12px', fontWeight: 500 }}>{hargaAcuan ? (isSaham ? formatIDR(hargaAcuan) : formatUSD(hargaAcuan)) : '—'}</div>
              </div>
            )}
            <div>
              <div style={{ color: '#555', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '2px' }}>Holdings</div>
              <div style={{ color: '#e5e5e5', fontSize: '12px', fontWeight: 500 }}>{isCashIDR ? formatIDR(asset.jumlah) : `${(isSaham ? asset.jumlah / 100 : asset.jumlah).toLocaleString()} ${isSaham ? 'Lot' : asset.ticker}`}</div>
            </div>
            {!isStable && !isCashIDR && pnl !== null && (
              <div>
                <div style={{ color: '#555', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '2px' }}>PNL</div>
                <span style={{ color: profit ? '#4ade80' : '#f87171', fontSize: '12px', fontWeight: 600 }}>{profit ? '+' : ''}{isSaham ? formatIDR(pnl) : formatUSD(pnl)}</span>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
            <button onClick={() => onEdit(asset)} style={{ backgroundColor: 'transparent', color: '#909090', border: '1px solid #333', borderRadius: '6px', padding: '6px 10px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>Edit</button>
            <button onClick={() => onDelete(asset)} style={{ backgroundColor: 'transparent', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px', padding: '6px 8px', fontSize: '12px', cursor: 'pointer' }}>✕</button>
          </div>
        </div>
      </div>
    </>
  );
}

function ConfirmDeleteModal({ asset, onConfirm, onCancel }) {
  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
      <div style={{ backgroundColor: '#111215', border: '1px solid #1e2026', borderRadius: '18px', padding: '28px 28px 24px', width: '340px', boxShadow: '0 24px 64px rgba(0,0,0,0.8)' }}>
        <div style={{ width: '52px', height: '52px', borderRadius: '14px', backgroundColor: 'rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', fontSize: '24px' }}>🗑</div>
        <h3 style={{ color: '#ffffff', fontSize: '20px', fontWeight: 800, margin: '0 0 10px' }}>Hapus {asset.ticker}?</h3>
        <p style={{ color: '#a3a3a3', fontSize: '14px', margin: '0 0 6px', lineHeight: 1.6 }}>Aset <span style={{ fontWeight: 700 }}>{asset.nama}</span> akan dihapus permanen.</p>
        <div style={{ display: 'flex', gap: '8px', marginTop: '24px' }}>
          <button onClick={onCancel} style={{ flex: 1, backgroundColor: '#1a1a22', color: '#737373', border: '1px solid #242430', borderRadius: '9px', padding: '12px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>Batal</button>
          <button onClick={onConfirm} style={{ flex: 1, backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '9px', padding: '12px', fontSize: '14px', fontWeight: 800, cursor: 'pointer' }}>Hapus</button>
        </div>
      </div>
    </div>
  );
}

function SearchResultItem({ item, onSelect }) {
  const typeColor = {
    crypto:    '#f59e0b',
    stock_idx: '#3b82f6',
    stock_us:  '#ec4899',
    stock:     '#a3a3a3',
    index:     '#10b981',
  }[item.type] || '#737373';

  const typeLabel = {
    crypto:    'Crypto',
    stock_idx: 'IDX',
    stock_us:  'US',
    stock:     item.exchange || 'Stock',
    index:     'Index',
  }[item.type] || item.type;

  return (
    <div
      onClick={() => onSelect(item)}
      style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '10px 14px', cursor: 'pointer',
        borderBottom: '1px solid #1a1a1a',
        transition: 'background 0.15s',
      }}
      onMouseEnter={e => e.currentTarget.style.background = '#1a1a1a'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      {item.thumb
        ? <img src={item.thumb} alt="" style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover' }} />
        : <div style={{ width: 22, height: 22, borderRadius: '50%', backgroundColor: typeColor + '33', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', color: typeColor, fontWeight: 800 }}>{item.symbol?.substring(0, 2)}</div>
      }
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: '#fff', fontWeight: 700, fontSize: '13px' }}>{item.symbol}</div>
        <div style={{ color: '#555', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
      </div>
      <span style={{ fontSize: '10px', fontWeight: 700, color: typeColor, backgroundColor: typeColor + '22', padding: '2px 7px', borderRadius: '4px', flexShrink: 0 }}>{typeLabel}</span>
      {item.market_cap_rank && <span style={{ fontSize: '10px', color: '#555' }}>#{item.market_cap_rank}</span>}
    </div>
  );
}

function AddAssetModal({ onSave, onClose }) {
  const [form, setForm]           = useState({ nama: '', ticker: '', simbol: '', type: 'crypto', avg: '', jumlah: '', thumb: '' });
  const [loadingHarga, setLoading] = useState(false);
  const [infoHarga, setInfo]       = useState('');
  const [isTypeLocked, setIsTypeLocked] = useState(false);
  const [fetchedLivePrice, setFetchedLivePrice] = useState(null);

  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching]       = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchTimeout                   = useRef(null);
  const dropdownRef                     = useRef(null);

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));
  const isCashIDR = form.type === 'cash_idr';

  const handleTickerInput = (val) => {
    const upper = val.toUpperCase();
    set('ticker', upper);
    setInfo('');

    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (upper.length < 1) { setSearchResults([]); setShowDropdown(false); return; }

    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        const typeQuery = isTypeLocked ? `&type=${form.type}` : '';
        const res  = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(upper)}${typeQuery}`);
        const data = await res.json();
        setSearchResults(data.results || []);
        setShowDropdown(true);
      } catch (e) {
        setSearchResults([]);
      }
      setSearching(false);
    }, 350); 
  };

  const handleSelectResult = async (item) => {
    setShowDropdown(false);
    setSearchResults([]);

    const typeMap = {
      crypto:    'crypto',
      stock_idx: 'saham',
      stock_us:  'saham_us',
      stock:     'saham_us',
      index:     'saham_us',
    };
    
    const detectedType = isTypeLocked ? form.type : (typeMap[item.type] || form.type);
    const simbol = item.type === 'crypto' ? item.id : item.id;

    set('ticker', item.symbol);
    set('nama',   item.name || item.symbol);
    set('type',   detectedType);
    set('simbol', simbol);
    set('thumb',  item.thumb || '');

    setLoading(true);
    setInfo('⏳ Mengambil harga live...');
    try {
      const res  = await fetchWithRetry(`${API_BASE}/api/price/${encodeURIComponent(item.symbol)}?type=${detectedType}`);
      const data = await res.json();

      if (data.error) {
        setInfo(`⚠️ ${data.error}`);
      } else {
        const harga    = data.price ?? 0;
        const currency = data.currency || 'USD';
        set('avg', harga);
        setFetchedLivePrice(harga);
        if (data.coingecko_id) set('simbol', data.coingecko_id);
        if (data.name && !form.nama) set('nama', data.name);
        if (data.thumb) set('thumb', data.thumb);
        setInfo(`✅ Live: ${currency === 'IDR' ? formatIDR(harga) : '$' + harga.toLocaleString(undefined, { maximumFractionDigits: 6 })} (${data.change >= 0 ? '+' : ''}${data.change?.toFixed(2)}% 24h)`);
      }
    } catch (e) {
      setInfo(`❌ Gagal fetch harga: ${e.message}`);
    }
    setLoading(false);
  };

  const cekHargaLive = async () => {
    if (!form.ticker) return setInfo('⚠️ Tulis Ticker dulu! (Cth: BTC / BBCA)');
    setLoading(true);
    setInfo('⏳ Mencari di market...');
    setShowDropdown(false);
    try {
      const typeQuery = isTypeLocked ? `?type=${form.type}` : '';
      const res  = await fetchWithRetry(`${API_BASE}/api/price/${encodeURIComponent(form.ticker)}${typeQuery}`);
      const data = await res.json();

      if (data.error) {
        const sRes  = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(form.ticker)}${typeQuery.replace('?', '&')}`);
        const sData = await sRes.json();
        if (sData.results?.length > 0) {
          setSearchResults(sData.results);
          setShowDropdown(true);
          setInfo(`⚠️ Ticker tidak ditemukan langsung. Pilih dari hasil di bawah.`);
        } else {
          setInfo(`❌ "${form.ticker}" tidak ditemukan.`);
        }
      } else {
        const harga    = data.price ?? 0;
        const currency = data.currency || 'USD';
        set('avg', harga);
        setFetchedLivePrice(harga);
        if (data.coingecko_id) set('simbol', data.coingecko_id);
        if (data.name)         set('nama',   data.name);
        if (data.thumb)        set('thumb',  data.thumb);
        
        if (!isTypeLocked) {
          if (data.type === 'crypto')    set('type', 'crypto');
          if (data.type === 'stock_idx') set('type', 'saham');
          if (data.type === 'stock_us' || data.type === 'stock') set('type', 'saham_us');
        }
        setInfo(`✅ ${data.name || form.ticker}: ${currency === 'IDR' ? formatIDR(harga) : '$' + harga.toLocaleString(undefined, { maximumFractionDigits: 6 })} (${data.change >= 0 ? '+' : ''}${data.change?.toFixed(2)}% 24h)`);
      }
    } catch (e) {
      setInfo(`❌ Error: ${e.message}`);
    }
    setLoading(false);
  };

  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSubmit = () => {
    if (!form.nama || !form.ticker || !form.jumlah) return;
    if (!isCashIDR && !form.avg) return;
    onSave({
      nama:   form.nama,
      ticker: form.ticker.toUpperCase(),
      simbol: form.simbol?.trim() || null,
      type:   form.type,
      avg:    isCashIDR ? 1 : parseFloat(form.avg),
      jumlah: parseFloat(form.jumlah),
      thumb:  form.thumb || null,
    }, fetchedLivePrice);
  };

  const typeMap = [
    ['crypto', 'Crypto', '#f59e0b'], ['saham', 'IDX Saham', '#3b82f6'],
    ['saham_us', 'US Saham', '#ec4899'], ['komoditas', 'Komoditas', '#eab308'],
    ['stable', 'Stablecoin', '#10b981'], ['cash_idr', 'Cash IDR', '#8b5cf6'],
  ];
  const labelStyle = { color: '#606060', fontSize: '11px', fontWeight: 700, display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.6px' };
  const inputStyle = { width: '100%', backgroundColor: '#0d0d0d', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '12px 16px', color: '#e5e5e5', fontSize: '14px', outline: 'none', boxSizing: 'border-box', fontWeight: 500 };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ backgroundColor: '#141414', border: '1px solid #262626', borderRadius: '20px', width: '520px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 32px 80px rgba(0,0,0,0.8)' }}>
        <div style={{ padding: '24px 28px 20px', borderBottom: '1px solid #1f1f1f', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ color: '#fff', fontSize: '19px', fontWeight: 800, margin: 0, letterSpacing: '-0.3px' }}>Tambah Aset Baru</h2>
            <p style={{ color: '#606060', fontSize: '13px', margin: '4px 0 0' }}>Ketik ticker apapun — crypto, IDX, US, semua otomatis terdeteksi</p>
          </div>
          <button onClick={onClose} style={{ width: '34px', height: '34px', borderRadius: '10px', backgroundColor: '#1e1e1e', border: '1px solid #2a2a2a', color: '#606060', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={labelStyle}>Tipe Aset <span style={{ color: '#383838', fontWeight: 400, textTransform: 'none' }}>(Klik untuk mengunci filter pencarian)</span></label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px' }}>
              {typeMap.map(([val, lbl, col]) => (
                <button key={val} onClick={() => { set('type', val); setIsTypeLocked(true); }} style={{ padding: '10px 6px', borderRadius: '10px', border: '1px solid', borderColor: form.type === val ? col : '#222', backgroundColor: form.type === val ? `${col}15` : '#0d0d0d', color: form.type === val ? col : '#484848', fontSize: '11px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' }}>
                  {lbl} {isTypeLocked && form.type === val ? '🔒' : ''}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '14px' }}>
            <div style={{ position: 'relative' }} ref={dropdownRef}>
              <label style={labelStyle}>Ticker</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  value={form.ticker}
                  onChange={e => handleTickerInput(e.target.value)}
                  onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                  placeholder="PUMP / BBCA"
                  style={{ ...inputStyle, textTransform: 'uppercase', flex: 1 }}
                  autoComplete="off"
                />
                <button
                  onClick={cekHargaLive}
                  disabled={loadingHarga}
                  title="Cari harga manual"
                  style={{ backgroundColor: '#1e1e1e', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '0 12px', color: loadingHarga ? '#383838' : '#4ade80', cursor: loadingHarga ? 'default' : 'pointer', fontWeight: 'bold', flexShrink: 0, fontSize: '14px' }}
                >
                  {loadingHarga ? '⏳' : '🔎'}
                </button>
              </div>

              {showDropdown && searchResults.length > 0 && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0,
                  backgroundColor: '#141414', border: '1px solid #2a2a2a',
                  borderRadius: '12px', marginTop: '4px', zIndex: 999,
                  maxHeight: '260px', overflowY: 'auto',
                  boxShadow: '0 16px 40px rgba(0,0,0,0.7)',
                }}>
                  {searching && (
                    <div style={{ padding: '10px 14px', color: '#555', fontSize: '12px' }}>Mencari...</div>
                  )}
                  {searchResults.map((item, i) => (
                    <SearchResultItem key={`${item.type}:${item.symbol}:${i}`} item={item} onSelect={handleSelectResult} />
                  ))}
                </div>
              )}
            </div>

            <div>
              <label style={labelStyle}>Nama Aset</label>
              <input
                value={form.nama}
                onChange={e => set('nama', e.target.value)}
                placeholder="Otomatis terisi"
                style={inputStyle}
              />
            </div>
          </div>

          {infoHarga && (
            <div style={{
              color: infoHarga.startsWith('✅') ? '#4ade80' : '#f87171',
              fontSize: '12px', fontWeight: 'bold',
              padding: '8px 12px',
              backgroundColor: infoHarga.startsWith('✅') ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)',
              borderRadius: '6px', marginTop: '-10px',
            }}>{infoHarga}</div>
          )}

          {['saham', 'saham_us', 'komoditas'].includes(form.type) && (
            <div>
              <label style={labelStyle}>Simbol Yahoo Finance (Opsional)</label>
              <input value={form.simbol} onChange={e => set('simbol', e.target.value)} placeholder="Misal: BBCA.JK" style={inputStyle} />
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: isCashIDR ? '1fr' : '1fr 1fr', gap: '14px' }}>
            {!isCashIDR && (
              <div>
                <label style={labelStyle}>Harga Beli AVG ({form.type === 'saham' ? 'IDR' : 'USD'})</label>
                <input type="number" value={form.avg} onChange={e => set('avg', e.target.value)} placeholder="Auto-filled" style={inputStyle} />
              </div>
            )}
            <div>
              <label style={labelStyle}>Jumlah ({form.type === 'saham' ? 'Lembar' : form.type === 'cash_idr' ? 'Rupiah' : 'Unit'})</label>
              <input type="number" value={form.jumlah} onChange={e => set('jumlah', e.target.value)} placeholder={isCashIDR ? '10000000' : '0'} style={inputStyle} />
            </div>
          </div>
        </div>

        <div style={{ padding: '0 28px 28px', display: 'flex', gap: '10px' }}>
          <button onClick={onClose} style={{ flex: 1, backgroundColor: '#1a1a1a', color: '#737373', border: '1px solid #262626', borderRadius: '10px', padding: '13px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>Batal</button>
          <button onClick={handleSubmit} style={{ flex: 2, backgroundColor: '#16a34a', color: '#ffffff', border: 'none', borderRadius: '10px', padding: '13px', fontSize: '14px', fontWeight: 800, cursor: 'pointer' }}>+ Tambah Aset</button>
        </div>
      </div>
    </div>
  );
}

function AIConsultant({ assets, hargaMap, hargaSaham, kursIdr, grandTotalUSD, grandTotalIDR, overallPnlUSD, overallPnlPersen, marketData }) {
  const buildContext = () => {
    const detail = assets.map(a => {
      const isCrypto = a.type === 'crypto', isSaham = a.type === 'saham';
      const harga    = isCrypto ? (hargaMap[a.simbol]?.usd ?? 0) : isSaham ? (hargaSaham[a.ticker] ?? 0) : a.avg;
      const nilai    = isCrypto || a.type === 'stable' ? harga * a.jumlah : isSaham ? harga * a.jumlah : a.jumlah;
      const nilaiUSD = (isSaham || a.type === 'cash_idr') ? nilai / kursIdr : nilai;
      const modal    = a.avg * a.jumlah;
      const pnl      = !['stable', 'cash_idr'].includes(a.type) ? nilai - modal : null;
      const pctAI    = modal > 0 && pnl !== null ? (pnl / modal * 100).toFixed(1) : null;
      const qty      = isSaham ? `${a.jumlah / 100} Lot` : `${a.jumlah} ${a.ticker}`;
      return `  • ${a.ticker} (${a.nama}): Harga ${isSaham ? formatIDR(harga) : formatUSD(harga)}, Holdings ${qty}, Nilai ~${formatUSD(nilaiUSD)}${pctAI !== null ? `, PNL ${pnl >= 0 ? '+' : ''}${pctAI}%` : ''}`;
    }).join('\n');
    const mkt = Object.entries(marketData).map(([k, v]) => `  • ${k}: ${v.type === 'usd' ? '$' : ''}${v.price.toLocaleString(undefined, { maximumFractionDigits: 2 })} (${v.isUp ? '+' : ''}${v.change.toFixed(2)}%)`).join('\n');
    return `PORTFOLIO (${new Date().toLocaleString('id-ID')})\nTotal Net Worth : ${formatUSD(grandTotalUSD)}\nOverall PNL : ${overallPnlUSD >= 0 ? '+' : ''}${formatUSD(overallPnlUSD)} (${overallPnlPersen.toFixed(2)}%)\nKurs USD/IDR : ${kursIdr.toLocaleString('id-ID')}\n\nDETAIL ASET:\n${detail}\n\nDATA PASAR REALTIME:\n${mkt}`;
  };

  const welcome = `Halo! Saya **TotalFund AI**, konsultan keuangan personal kamu. ✦\n\nPortfolio kamu saat ini senilai **${formatUSD(grandTotalUSD)}** dengan PNL **${overallPnlUSD >= 0 ? '+' : ''}${formatUSD(overallPnlUSD)} (${overallPnlPersen.toFixed(2)}%)**.\n\nTanyakan apa saja tentang portfolio, pasar, atau strategi investasimu!`;

  const [messages, setMessages] = useState([{ role: 'ai', text: welcome }]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const bottomRef               = useRef(null);
  const inputRef                = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  const send = async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: msg }]);
    setLoading(true);
    try {
      const history = messages.slice(-8).map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.text }));
      const res  = await fetch(`${API_BASE}/api/ai-chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: msg, context: buildContext(), history }) });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'ai', text: data.response || 'Maaf, terjadi kesalahan.' }]);
    } catch {
      setMessages(prev => [...prev, { role: 'ai', text: '⚠️ Tidak bisa terhubung ke server.' }]);
    }
    setLoading(false);
    inputRef.current?.focus();
  };

  const isWelcome = messages.length === 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', borderRadius: '20px', border: '1px solid #262626', backgroundColor: '#141414', overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.4)' }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid #1f1f1f', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: '12px', background: 'linear-gradient(135deg, #4ade80 0%, #06b6d4 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', boxShadow: '0 4px 14px rgba(74,222,128,0.3)', flexShrink: 0 }}>✦</div>
          <div>
            <div style={{ color: '#ffffff', fontWeight: 800, fontSize: '15px' }}>TotalFund AI</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <div className="status-dot" style={{ width: 6, height: 6 }} />
              <span style={{ color: '#6b7280', fontSize: '12px' }}>Online · Data portfolio real-time</span>
            </div>
          </div>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
        {isWelcome && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60%', textAlign: 'center', padding: '20px 0' }}>
            <div style={{ width: 72, height: 72, borderRadius: '20px', background: 'linear-gradient(135deg, #4ade80 0%, #06b6d4 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', boxShadow: '0 8px 28px rgba(74,222,128,0.25)', marginBottom: 20 }}>✦</div>
            <div style={{ color: '#ffffff', fontWeight: 800, fontSize: '22px', marginBottom: 8 }}>TotalFund AI</div>
            <div style={{ color: '#6b7280', fontSize: '14px', marginBottom: 28, maxWidth: 420, lineHeight: 1.6 }}>Konsultan keuangan personal kamu berbasis AI.</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: 560 }}>
              {SUGGESTIONS.map((s, i) => (
                <button key={i} onClick={() => send(s)} style={{ background: '#1a1a1a', color: '#a3a3a3', border: '1px solid #2a2a2a', borderRadius: '20px', padding: '8px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>{s}</button>
              ))}
            </div>
          </div>
        )}
        {!isWelcome && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', gap: '10px', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', alignItems: 'flex-start' }}>
                {msg.role === 'ai' && <div style={{ width: 30, height: 30, borderRadius: '9px', background: 'linear-gradient(135deg, #4ade80, #06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', flexShrink: 0 }}>✦</div>}
                <div style={{ maxWidth: '74%', padding: '13px 17px', borderRadius: msg.role === 'ai' ? '2px 14px 14px 14px' : '14px 2px 14px 14px', background: msg.role === 'ai' ? '#1a1a1a' : 'linear-gradient(135deg, #166534, #14532d)', border: msg.role === 'ai' ? '1px solid #262626' : '1px solid rgba(74,222,128,0.2)', color: '#e5e5e5', fontSize: '14px', lineHeight: '1.7' }}>
                  {msg.role === 'ai' ? <div dangerouslySetInnerHTML={{ __html: renderAIText(msg.text) }} /> : <span style={{ fontWeight: 500 }}>{msg.text}</span>}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <div style={{ width: 30, height: 30, borderRadius: '9px', background: 'linear-gradient(135deg, #4ade80, #06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', flexShrink: 0 }}>✦</div>
                <div style={{ padding: '13px 17px', borderRadius: '2px 14px 14px 14px', background: '#1a1a1a', border: '1px solid #262626', display: 'flex', gap: '5px', alignItems: 'center' }}>
                  {[0,1,2].map(j => <div key={j} style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#4ade80', animation: `bounce 1.2s ease-in-out ${j*0.2}s infinite` }} />)}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>
      <div style={{ padding: '16px 24px', borderTop: '1px solid #1f1f1f', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: '10px', padding: '12px 16px', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '12px' }}>
          <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()} placeholder="Tanya sesuatu..." disabled={loading} style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#e5e5e5', fontSize: '14px', fontFamily: 'inherit' }} />
          <button onClick={() => send()} disabled={loading || !input.trim()} style={{ width: '36px', height: '36px', borderRadius: '9px', background: input.trim() ? 'linear-gradient(135deg, #4ade80, #06b6d4)' : 'rgba(255,255,255,0.05)', border: 'none', color: input.trim() ? '#000' : '#4b5563', fontSize: '15px', fontWeight: 700, cursor: input.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>▶</button>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [activePage, setActivePage]       = useState('portfolio');
  const [assets, setAssets]               = useLocalStorage('totalfund_portfolio', []);
  const [hargaMap, setHargaMap]           = useState({});
  const [hargaSaham, setHargaSaham]       = useState({});
  const [kursIdr, setKursIdr]             = useState(16200);
  const [period, setPeriod]               = useState(PERIODS[0]);
  const [chartData, setChartData]         = useState(null);
  const [chartError, setChartError]       = useState(false);
  const [pnlChart, setPnlChart]           = useState(null);
  const [showAddModal, setShowAddModal]   = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [sidebarOpen, setSidebarOpen]     = useState(false);
  const [editingAsset, setEditingAsset]   = useState(null);
  const [editForm, setEditForm]           = useState({ harga: '', jumlah: '' });
  const [cryptoLoaded, setCryptoLoaded]   = useState(false);
  const [marketLoaded, setMarketLoaded]   = useState(false);

  // STATE BARU UNTUK PROFIL PENGGUNA
  const [username, setUsername]           = useLocalStorage('totalfund_username', 'User123');
  const [profilePic, setProfilePic]       = useLocalStorage('totalfund_profile_pic', '');

  const [marketData, setMarketData] = useState({
    BTC:    { price: 0, change: 0, isUp: true,  type: 'usd' },
    ETH:    { price: 0, change: 0, isUp: true,  type: 'usd' },
    GOLD:   { price: 0, change: 0, isUp: true,  type: 'usd' },
    XAG:    { price: 0, change: 0, isUp: true,  type: 'usd' },
    SPX500: { price: 0, change: 0, isUp: true,  type: 'usd' },
    NASDAQ: { price: 0, change: 0, isUp: true,  type: 'usd' },
    IHSG:   { price: 0, change: 0, isUp: true,  type: 'idr' },
    BRENT:  { price: 0, change: 0, isUp: false, type: 'usd' },
  });

  const { width } = useWindowSize();
  useEffect(() => { if (width >= 768) setSidebarOpen(false); }, [width]);

  const cryptoAssets = useMemo(
    () => assets.filter(a => a.type === 'crypto' && a.ticker),
    [assets]
  );

  const fetchCryptoPrices = useCallback(async () => {
    try {
      const baseSymbols      = ['BTCUSDT', 'ETHUSDT'];
      const portfolioSymbols = cryptoAssets
        .filter(a => a.ticker)
        .map(a => `${a.ticker.toUpperCase()}USDT`);
      const allSymbols = [...new Set([...baseSymbols, ...portfolioSymbols])];
      const symbolsStr = allSymbols.join(',');

      const res  = await fetchWithRetry(`${API_BASE}/api/crypto-prices?symbols=${symbolsStr}`);
      const data = await res.json();

      if (cryptoAssets.length > 0) {
        setHargaMap(prev => {
          const newMap = { ...prev };
          data.forEach(d => {
            const ticker = d.symbol.replace('USDT', '').toUpperCase();
            const asset  = cryptoAssets.find(a => a.ticker.toUpperCase() === ticker);
            if (asset) {
              const key = asset.simbol || asset.ticker;
              newMap[key] = { usd: parseFloat(d.lastPrice), change: parseFloat(d.priceChangePercent) };
            }
          });
          return newMap;
        });
      }

      const btcRaw = data.find(d => d.symbol === 'BTCUSDT');
      const ethRaw = data.find(d => d.symbol === 'ETHUSDT');

      setMarketData(prev => ({
        ...prev,
        ...(btcRaw ? { BTC: { price: parseFloat(btcRaw.lastPrice), change: parseFloat(btcRaw.priceChangePercent), isUp: parseFloat(btcRaw.priceChangePercent) >= 0, type: 'usd' } } : {}),
        ...(ethRaw ? { ETH: { price: parseFloat(ethRaw.lastPrice), change: parseFloat(ethRaw.priceChangePercent), isUp: parseFloat(ethRaw.priceChangePercent) >= 0, type: 'usd' } } : {}),
      }));

      setCryptoLoaded(true);
    } catch (err) {
      setCryptoLoaded(true);
    }
  }, [cryptoAssets]);

  const nonCryptoSymbols = useMemo(() => {
    return assets
      .filter(a => ['saham', 'saham_us', 'komoditas'].includes(a.type))
      .map(a => a.simbol || a.ticker)
      .filter(Boolean);
  }, [assets]);

  const fetchMarketData = useCallback(async () => {
    try {
      const symQuery = nonCryptoSymbols.length > 0 ? `?symbols=${encodeURIComponent(nonCryptoSymbols.join(','))}` : '';
      const res  = await fetchWithRetry(`${API_BASE}/api/market-data${symQuery}`);
      const data = await res.json();

      const stockUpdates = {};
      Object.keys(data).forEach(ticker => {
        if (data[ticker]?.price !== undefined && data[ticker]?.price !== null) {
          stockUpdates[ticker] = data[ticker].price;
        }
      });
      setHargaSaham(prev => ({ ...prev, ...stockUpdates }));

      const mk = (key, type) => {
        const entry = data[key];
        if (!entry || entry.price === undefined || entry.price === null) return null;
        const price  = parseFloat(entry.price);
        const change = parseFloat(entry.change ?? 0);
        return { price, change, isUp: change >= 0, type };
      };

      const updates = {};
      const mapping = [
        ['IHSG','idr'], ['SPX500','usd'], ['NASDAQ','usd'],
        ['GOLD','usd'], ['XAG','usd'],   ['BRENT','usd'],
      ];
      mapping.forEach(([key, type]) => {
        const result = mk(key, type);
        if (result) updates[key] = result;
      });

      setMarketData(prev => ({ ...prev, ...updates }));
      setMarketLoaded(true);
    } catch (err) {
      setMarketLoaded(true);
    }

    try {
      const res  = await fetchWithRetry('https://api.exchangerate-api.com/v4/latest/USD');
      const data = await res.json();
      if (data?.rates?.IDR) setKursIdr(data.rates.IDR);
    } catch (err) {}
  }, [nonCryptoSymbols]);

  useEffect(() => {
    fetchCryptoPrices();
    const interval = setInterval(fetchCryptoPrices, 60000);
    return () => clearInterval(interval);
  }, [fetchCryptoPrices]);

  useEffect(() => {
    fetchMarketData();
    const interval = setInterval(fetchMarketData, 60000);
    return () => clearInterval(interval);
  }, [fetchMarketData]);

  const getLivePrice = useCallback((asset) => {
    const key = asset.simbol || asset.ticker;
    if (asset.type === 'crypto')    return hargaMap[key]?.usd || hargaMap[asset.ticker]?.usd || asset.avg;
    if (asset.type === 'saham')     return hargaSaham[key] || hargaSaham[asset.ticker] || asset.avg;
    if (asset.type === 'saham_us' || asset.type === 'komoditas') return hargaSaham[key] || hargaSaham[asset.ticker] || asset.avg;
    return asset.avg;
  }, [hargaMap, hargaSaham]);

  const valCryptoUSD    = useMemo(() => assets.filter(a => a.type === 'crypto').reduce((s, a) => s + getLivePrice(a) * a.jumlah, 0), [assets, getLivePrice]);
  const modCryptoUSD    = useMemo(() => assets.filter(a => a.type === 'crypto').reduce((s, a) => s + a.avg * a.jumlah, 0), [assets]);
  const valKomoditasUSD = useMemo(() => assets.filter(a => a.type === 'komoditas').reduce((s, a) => s + getLivePrice(a) * a.jumlah, 0), [assets, getLivePrice]);
  const modKomoditasUSD = useMemo(() => assets.filter(a => a.type === 'komoditas').reduce((s, a) => s + a.avg * a.jumlah, 0), [assets]);
  const valSahamUS_USD  = useMemo(() => assets.filter(a => a.type === 'saham_us').reduce((s, a) => s + getLivePrice(a) * a.jumlah, 0), [assets, getLivePrice]);
  const modSahamUS_USD  = useMemo(() => assets.filter(a => a.type === 'saham_us').reduce((s, a) => s + a.avg * a.jumlah, 0), [assets]);
  const valSahamIDX_IDR = useMemo(() => assets.filter(a => a.type === 'saham').reduce((s, a) => s + getLivePrice(a) * a.jumlah, 0), [assets, getLivePrice]);
  const modSahamIDX_IDR = useMemo(() => assets.filter(a => a.type === 'saham').reduce((s, a) => s + a.avg * a.jumlah, 0), [assets]);
  const valStableUSD    = useMemo(() => assets.filter(a => a.type === 'stable').reduce((s, a) => s + a.avg * a.jumlah, 0), [assets]);
  const valCashIDR      = useMemo(() => assets.filter(a => a.type === 'cash_idr').reduce((s, a) => s + a.jumlah, 0), [assets]);

  const valSahamIDX_USD = valSahamIDX_IDR / kursIdr;
  const valCashUSD      = valCashIDR / kursIdr;

  const grandTotalUSD    = valCryptoUSD + valKomoditasUSD + valSahamUS_USD + valSahamIDX_USD + valStableUSD + valCashUSD;
  const grandTotalIDR    = grandTotalUSD * kursIdr;
  const grandModalUSD    = modCryptoUSD + modKomoditasUSD + modSahamUS_USD + (modSahamIDX_IDR / kursIdr) + valStableUSD + valCashUSD;
  const overallPnlUSD    = grandTotalUSD - grandModalUSD;
  const overallPnlIDR    = overallPnlUSD * kursIdr;
  const overallPnlPersen = grandModalUSD > 0 ? (overallPnlUSD / grandModalUSD) * 100 : 0;
  const isOverallProfit  = overallPnlUSD >= 0;

  const pnlCryptoUSD    = valCryptoUSD - modCryptoUSD;
  const pnlKomoditasUSD = valKomoditasUSD - modKomoditasUSD;
  const pnlSahamUS_USD  = valSahamUS_USD - modSahamUS_USD;
  const pnlSahamIDX_IDR = valSahamIDX_IDR - modSahamIDX_IDR;

  const { dailyPnlUSD, dailyPnlPersen } = useMemo(() => {
    let pnl = 0, modal = 0;
    assets.forEach(a => {
      let valUSD = 0, change24h = 0;
      if (a.type === 'crypto') {
        const key = a.simbol || a.ticker;
        valUSD    = (hargaMap[key]?.usd || a.avg) * a.jumlah;
        change24h = hargaMap[key]?.change || 0;
      } else if (a.type === 'komoditas') {
        const key = a.simbol || a.ticker;
        const price = hargaSaham[key] || a.avg;
        valUSD    = price * a.jumlah;
        change24h = a.simbol === 'GC=F' ? (marketData.GOLD?.change || 0) : a.simbol === 'SI=F' ? (marketData.XAG?.change || 0) : 0;
      } else if (a.type === 'saham_us') {
        const key = a.simbol || a.ticker;
        valUSD    = (hargaSaham[key] || a.avg) * a.jumlah;
        change24h = marketData.SPX500?.change || 0;
      } else if (a.type === 'saham') {
        const key = a.simbol || a.ticker;
        valUSD    = ((hargaSaham[key] || a.avg) * a.jumlah) / kursIdr;
        change24h = marketData.IHSG?.change || 0;
      } else {
        valUSD = a.type === 'cash_idr' ? a.jumlah / kursIdr : a.avg * a.jumlah;
      }
      const denom = 1 + change24h / 100;
      const val0  = denom !== 0 ? valUSD / denom : valUSD;
      pnl   += valUSD - val0;
      modal += val0;
    });
    return { dailyPnlUSD: pnl, dailyPnlPersen: modal > 0 ? (pnl / modal) * 100 : 0 };
  }, [assets, hargaMap, hargaSaham, marketData, kursIdr]);

  const isDailyProfit = dailyPnlUSD >= 0;

  const baselineNonCrypto = valStableUSD + valSahamIDX_USD + valSahamUS_USD + valKomoditasUSD + valCashUSD;
  const baselineRef = useRef(baselineNonCrypto);
  baselineRef.current = baselineNonCrypto;

  useEffect(() => {
    setChartData(null); setChartError(false);
    const fetchChart = async () => {
      const cryptos  = assets.filter(a => a.type === 'crypto' && a.simbol);
      const baseline = baselineRef.current || 0;
      const fetchDays = 1825;
      const now = Date.now();

      const createDummyData = (baseVal) => {
        const arr = [];
        for (let i = fetchDays; i >= 0; i--) { arr.push([now - (i * 86400000), baseVal]); }
        return arr;
      };

      if (cryptos.length === 0) {
        setChartData(createDummyData(baseline));
        setPnlChart({ selisih: 0, persen: 0 });
        return;
      }

      const process = (results) => {
        const validResult = results.find(r => r && r.prices && r.prices.length > 0);
        if (!validResult) return null;
        return validResult.prices.map((pt, i) => [
          pt[0],
          cryptos.reduce((s, a, j) => {
            const price = results[j]?.prices?.[i]?.[1] ?? (hargaMap[a.simbol]?.usd || a.avg || 0);
            return s + (price * a.jumlah);
          }, 0) + baseline
        ]);
      };

      try {
        const results = await Promise.all(
          cryptos.map(a =>
            fetchWithRetry(`${API_BASE}/api/chart?simbol=${a.simbol}&days=${fetchDays}`)
              .then(r => r.json())
              .catch(() => null)
          )
        );
        if (results.some(r => r && r.prices)) {
          const combined = process(results);
          if (combined?.length >= 2) {
            setChartData(combined);
            const diff = combined[combined.length-1][1] - combined[0][1];
            setPnlChart({ selisih: diff, persen: (diff / combined[0][1]) * 100 });
            return;
          }
        }
      } catch (e) {}

      try {
        const results = await Promise.all(
          cryptos.map(a => {
            const targetUrl = `https://api.coingecko.com/api/v3/coins/${a.simbol.toLowerCase()}/market_chart?vs_currency=usd&days=${fetchDays}`;
            const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
            return fetchWithRetry(proxyUrl).then(r => r.json()).catch(() => null);
          })
        );
        if (results.some(r => r && r.prices)) {
          const combined = process(results);
          if (combined?.length >= 2) {
            setChartData(combined);
            const diff = combined[combined.length-1][1] - combined[0][1];
            setPnlChart({ selisih: diff, persen: (diff / combined[0][1]) * 100 });
            return;
          }
        }
      } catch (e) {}

      const fallbackCombined = createDummyData(grandTotalUSD);
      setChartData(fallbackCombined);
      setPnlChart({ selisih: 0, persen: 0 });
      setChartError(true);
    };
    fetchChart();
  }, [assets, grandTotalUSD, hargaMap]);

  const chartColor = pnlChart?.selisih >= 0 ? '#16a34a' : '#ef4444';

  const pieData = useMemo(() => assets.map((a, i) => {
    let valUSD = 0;
    if (['crypto', 'komoditas', 'saham_us'].includes(a.type)) valUSD = getLivePrice(a) * a.jumlah;
    if (a.type === 'saham')    valUSD = (getLivePrice(a) * a.jumlah) / kursIdr;
    if (a.type === 'stable')   valUSD = a.avg * a.jumlah;
    if (a.type === 'cash_idr') valUSD = a.jumlah / kursIdr;
    return { ticker: a.ticker, val: valUSD, pct: grandTotalUSD > 0 ? (valUSD / grandTotalUSD) * 100 : 0, color: COLORS[i % COLORS.length] };
  }).filter(d => d.val > 0).sort((a, b) => b.val - a.val), [assets, getLivePrice, kursIdr, grandTotalUSD]);

  const handleAddAsset = useCallback((newAsset, livePrice) => {
    setAssets(prev => [...prev, { ...newAsset, id: Date.now() }]);
    setShowAddModal(false);
    
    if (livePrice) {
      const key = newAsset.simbol || newAsset.ticker;
      if (newAsset.type === 'crypto') {
        setHargaMap(prev => ({ ...prev, [key]: { usd: livePrice, change: 0 } }));
      } else if (['saham', 'saham_us', 'komoditas'].includes(newAsset.type)) {
        setHargaSaham(prev => ({ ...prev, [key]: livePrice }));
      }
    }
  }, [setAssets]);

  const handleDeleteAsset = useCallback((id) => { setAssets(prev => prev.filter(a => a.id !== id)); }, [setAssets]);
  const openEdit          = useCallback((asset) => { setEditingAsset(asset); setEditForm({ harga: '', jumlah: '' }); }, []);

  function handleSave(id, hargaBaru, jumlahTambah) {
    setAssets(prev => prev.map(a => {
      if (a.id !== id) return a;
      const totalKoin = a.jumlah + jumlahTambah;
      if (totalKoin <= 0) return { ...a, jumlah: 0, avg: 0 };
      return { ...a, avg: (a.avg * a.jumlah + hargaBaru * jumlahTambah) / totalKoin, jumlah: totalKoin };
    }));
    setEditingAsset(null);
  }

  const renderSingleCard = (key, displayName) => {
    const data = marketData[key];
    if (!data) return null;
    const isCrypto = key === 'BTC' || key === 'ETH';
    const loaded   = isCrypto ? cryptoLoaded : marketLoaded;
    const hasData  = data.price > 0;
    return (
      <div style={styles.marketCardMini} key={key}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#a3a3a3', fontWeight: 700, fontSize: '13px' }}>{displayName}</span>
          {!loaded
            ? <div className="skeleton" style={{ width: 42, height: 16 }} />
            : hasData
              ? <span style={{ color: data.isUp ? '#4ade80' : '#f87171', fontSize: '11px', fontWeight: 700, background: data.isUp ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)', padding: '2px 6px', borderRadius: '4px' }}>{data.isUp ? '+' : ''}{data.change.toFixed(2)}%</span>
              : <span style={{ color: '#555', fontSize: '11px' }}>—</span>
          }
        </div>
        {!loaded
          ? <div style={{ marginTop: '8px' }}><div className="skeleton" style={{ width: '80%', height: 20 }} /></div>
          : hasData
            ? <div style={{ color: 'white', fontWeight: 800, fontSize: '18px', marginTop: '6px', letterSpacing: '-0.5px' }}>{data.type === 'usd' ? '$' : ''}{data.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
            : <div style={{ color: '#555', fontWeight: 800, fontSize: '18px', marginTop: '6px' }}>—</div>
        }
      </div>
    );
  };

  return (
    <div className="app-wrapper">
      <div className={`sidebar-overlay${sidebarOpen ? ' sidebar-open' : ''}`} onClick={() => setSidebarOpen(false)} />
      
      {/* SIDEBAR DENGAN PROFIL PENGGUNA */}
      <Sidebar 
        activePage={activePage} 
        setActivePage={setActivePage} 
        onClose={() => setSidebarOpen(false)} 
        isOpen={sidebarOpen}
        username={username}
        setUsername={setUsername}
        profilePic={profilePic}
        setProfilePic={setProfilePic}
      />

      <div className="app-main">
        <div className="max-container">
          
          {/* PAGE HEADER DENGAN IDENTITAS WEBSITE GLOBAL */}
          <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <button className="hamburger-btn" onClick={() => setSidebarOpen(true)}>☰</button>
              
              {/* LOGO TOTALFUND (Selalu Muncul di Semua Halaman) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 120 120" 
                  style={{ width: '28px', height: '28px', flexShrink: 0 }}
                >
                  <rect width="120" height="120" rx="28" fill="#0A0A0A" />
                  <rect width="120" height="120" rx="28" fill="none" stroke="#262626" strokeWidth="3" />
                  <path d="M 20 35 H 55 V 47 H 43.5 V 80 H 31.5 V 47 H 20 V 35 Z" fill="#F5F5F5" />
                  <circle cx="62" cy="74" r="6" fill="#F5F5F5" />
                  <path d="M 72 35 H 100 V 47 H 84 V 53 H 96 V 63 H 84 V 80 H 72 V 35 Z" fill="#F5F5F5" />
                </svg>
                <span style={{ color: '#ffffff', fontWeight: 800, fontSize: '18px', letterSpacing: '-0.4px', display: 'flex', alignItems: 'center' }}>
                  TOTAL<span style={{ color: '#16a34a' }}>FUND</span>
                </span>
              </div>
            </div>

            {/* Nama Halaman Aktif di Kanan Atas (Agar user tau lagi buka apa) */}
            {activePage !== 'portfolio' && (
              <div style={{ color: '#737373', fontSize: '13px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                {activePage === 'networth-detail' ? 'Analytics' : 'AI Chat'}
              </div>
            )}
          </div>

          {activePage === 'portfolio' && (
            <>
              <div className="summary-cards">
                <div style={styles.summaryCard}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ color: '#a3a3a3', fontSize: '13px', fontWeight: 600, letterSpacing: '0.5px' }}>Total Net Worth</span>
                    <span style={{ color: '#4ade80', fontSize: '11px', backgroundColor: 'rgba(74,222,128,0.1)', padding: '4px 8px', borderRadius: '6px', fontWeight: 600 }}>IDR: {kursIdr.toLocaleString('id-ID')}</span>
                  </div>
                  {cryptoLoaded ? (
                    <>
                      <div style={{ color: 'white', fontSize: '28px', fontWeight: 800, letterSpacing: '-0.5px' }}>{formatUSD(grandTotalUSD)}</div>
                      <div style={{ color: '#737373', fontSize: '14px', fontWeight: 500, marginTop: '2px' }}>{formatIDR(grandTotalIDR)}</div>
                      <div style={{ margin: '14px 0', height: '1px', background: '#262626' }} />
                      <div style={{ display: 'flex', gap: '16px' }}>
                        <div style={{ flex: 1 }}>
                          <span style={{ color: '#737373', fontSize: '10px', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>Overall PnL</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ color: isOverallProfit ? '#4ade80' : '#f87171', fontSize: '16px', fontWeight: 800 }}>{isOverallProfit ? '+' : ''}{formatUSD(overallPnlUSD)}</span>
                            <span style={{ color: isOverallProfit ? '#4ade80' : '#f87171', fontSize: '11px', fontWeight: 700, backgroundColor: isOverallProfit ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)', padding: '2px 6px', borderRadius: '6px' }}>{isOverallProfit ? '+' : ''}{overallPnlPersen.toFixed(2)}%</span>
                          </div>
                          <div style={{ color: '#555', fontSize: '11px', marginTop: '4px', fontWeight: 500 }}>{isOverallProfit ? '+' : ''}{formatIDR(overallPnlIDR)}</div>
                        </div>
                        <div style={{ width: '1px', background: '#262626' }} />
                        <div style={{ flex: 1 }}>
                          <span style={{ color: '#737373', fontSize: '10px', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>1-Day PnL</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ color: isDailyProfit ? '#4ade80' : '#f87171', fontSize: '16px', fontWeight: 800 }}>{isDailyProfit ? '+' : ''}{formatUSD(dailyPnlUSD)}</span>
                            <span style={{ color: isDailyProfit ? '#4ade80' : '#f87171', fontSize: '11px', fontWeight: 700, backgroundColor: isDailyProfit ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)', padding: '2px 6px', borderRadius: '6px' }}>{isDailyProfit ? '+' : ''}{dailyPnlPersen.toFixed(2)}%</span>
                          </div>
                          <div style={{ color: '#555', fontSize: '11px', marginTop: '4px', fontWeight: 500 }}>{isDailyProfit ? '+' : ''}{formatIDR(dailyPnlUSD * kursIdr)}</div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="skeleton" style={{ width: '70%', height: 32, marginBottom: 6 }} />
                      <div className="skeleton" style={{ width: '50%', height: 16 }} />
                      <div style={{ margin: '14px 0', height: '1px', background: '#262626' }} />
                      <div style={{ display: 'flex', gap: '16px' }}>
                        <div className="skeleton" style={{ flex: 1, height: 32, borderRadius: 8 }} />
                        <div className="skeleton" style={{ flex: 1, height: 32, borderRadius: 8 }} />
                      </div>
                    </>
                  )}
                </div>

                <div style={styles.summaryCard}>
                  <span style={{ color: '#a3a3a3', fontSize: '13px', fontWeight: 600, letterSpacing: '0.5px', display: 'block', marginBottom: '14px' }}>PnL Breakdown</span>
                  {cryptoLoaded ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', flex: 1 }}>
                      {[
                        { label: 'Kripto (USD)',    val: pnlCryptoUSD,    sub: formatIDR(pnlCryptoUSD * kursIdr),    fmt: formatUSD },
                        { label: 'Komoditas (USD)', val: pnlKomoditasUSD, sub: formatIDR(pnlKomoditasUSD * kursIdr), fmt: formatUSD },
                        { label: 'Saham IDX (IDR)', val: pnlSahamIDX_IDR, sub: formatUSD(pnlSahamIDX_IDR / kursIdr), fmt: formatIDR },
                        { label: 'Saham US (USD)',  val: pnlSahamUS_USD,  sub: formatIDR(pnlSahamUS_USD * kursIdr),  fmt: formatUSD },
                      ].map(({ label, val, sub, fmt }, idx) => (
                        <div key={label} style={{ padding: `${idx >= 2 ? '12px' : '0'} ${idx % 2 === 0 ? '12px' : '0'} ${idx < 2 ? '12px' : '0'} ${idx % 2 === 1 ? '12px' : '0'}`, borderRight: idx % 2 === 0 ? '1px solid #262626' : 'none', borderBottom: idx < 2 ? '1px solid #262626' : 'none', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                          <span style={{ color: '#737373', fontSize: '10px', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>{label}</span>
                          <span style={{ color: val >= 0 ? '#4ade80' : '#f87171', fontSize: '16px', fontWeight: 800, margin: '4px 0 2px' }}>{val >= 0 ? '+' : ''}{fmt(val)}</span>
                          <span style={{ color: '#555', fontSize: '11px', fontWeight: 500 }}>{val >= 0 ? '+' : ''}{sub}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: '8px', flex: 1 }}>
                      {[0,1,2,3].map(i => <div key={i} className="skeleton" style={{ borderRadius: 8 }} />)}
                    </div>
                  )}
                </div>

                <NetWorthTrendCard
                  data={chartData}
                  color={chartColor}
                  isError={chartError}
                  period={period}
                  setPeriod={setPeriod}
                  periodsList={PERIODS}
                  onDetailClick={() => setActivePage('networth-detail')}
                />
              </div>

              <div className="market-section">
                <div className="market-mini-grid">
                  {renderSingleCard('BTC',    'BTC')}
                  {renderSingleCard('GOLD',   'Gold XAU')}
                  {renderSingleCard('SPX500', 'S&P 500')}
                  {renderSingleCard('IHSG',   'IHSG')}
                  {renderSingleCard('ETH',    'ETH')}
                  {renderSingleCard('XAG',    'Silver XAG')}
                  {renderSingleCard('NASDAQ', 'Nasdaq')}
                  {renderSingleCard('BRENT',  'Oil Brent')}
                </div>
                <div className="donut-card" style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', top: 14, left: 18, color: '#a3a3a3', fontSize: '13px', fontWeight: 600, letterSpacing: '0.5px' }}>Current Allocation</div>
                  <div style={{ width: '130px', height: '130px', flexShrink: 0, marginTop: '20px' }}><DonutChart data={pieData} /></div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '140px', overflowY: 'auto', paddingRight: '4px', marginTop: '20px' }}>
                    {pieData.map(d => (
                      <div key={d.ticker} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: d.color }} />
                          <span style={{ color: 'white', fontSize: '13px', fontWeight: 600 }}>{d.ticker}</span>
                        </div>
                        <span style={{ color: '#a3a3a3', fontSize: '12px', fontWeight: 500 }}>{d.pct.toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ borderRadius: '20px', border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden', background: '#0a0a0a', boxShadow: '0 4px 24px rgba(0,0,0,0.4)' }}>
                <div className="holdings-header" style={{ padding: '20px 28px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
                  <div>
                    <h3 style={{ color: '#fff', fontSize: '16px', fontWeight: 800, margin: 0 }}>Holdings</h3>
                    <span style={{ color: '#6b7280', fontSize: '12px', marginTop: '2px', display: 'block' }}>{assets.length} aset terdaftar</span>
                  </div>
                  <button onClick={() => setShowAddModal(true)} style={{ backgroundColor: '#16a34a', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '10px 16px', fontSize: '13px', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 14px rgba(22, 163, 74, 0.3)' }}>+ Tambah Aset</button>
                </div>
                <div className="col-headers" style={{ alignItems: 'center', padding: '12px 28px', gap: '16px', borderBottom: '1px solid rgba(255,255,255,0.04)', background: '#0f0f0f' }}>
                  {[['Aset', 2], ['Harga Live', 1.5], ['Holdings / AVG', 1.5], ['Nilai Aset', 1.5], ['Unrealized PNL', 1.5]].map(([h, f]) => (
                    <div key={h} style={{ flex: f, color: '#4b5563', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.7px' }}>{h}</div>
                  ))}
                  <div style={{ flexShrink: 0, width: '98px' }} />
                </div>
                <div style={{ paddingBottom: '18px' }}>
                  {[
                    { type: 'crypto',     label: 'Crypto',        color: '#f59e0b', list: assets.filter(a => a.type === 'crypto') },
                    { type: 'saham_us',   label: 'Saham US',      color: '#ec4899', list: assets.filter(a => a.type === 'saham_us') },
                    { type: 'saham',      label: 'Saham IDX',     color: '#3b82f6', list: assets.filter(a => a.type === 'saham') },
                    { type: 'komoditas',  label: 'Komoditas',     color: '#eab308', list: assets.filter(a => a.type === 'komoditas') },
                    { type: 'cashstable', label: 'Cash & Stable', color: '#10b981', list: assets.filter(a => a.type === 'stable' || a.type === 'cash_idr') },
                  ].map(({ type, label, color, list }) => (
                    <div key={type}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '16px 28px 8px' }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: color }} />
                        <span style={{ color: '#a3a3a3', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>{label}</span>
                        <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, #1f1f1f, transparent)' }} />
                        <span style={{ color: '#4b5563', fontSize: '10px', fontWeight: 600 }}>{list.length} aset</span>
                      </div>
                      {list.length > 0 ? list.map((asset, idx) => (
                        <DataRow
                          key={asset.id} asset={asset} isLast={idx === list.length - 1}
                          hargaLiveUSD={['crypto', 'komoditas', 'saham_us'].includes(asset.type) ? getLivePrice(asset) : undefined}
                          hargaLiveIDR={asset.type === 'saham' ? getLivePrice(asset) : undefined}
                          kursIdr={kursIdr} totalNetWorthUSD={grandTotalUSD}
                          onEdit={openEdit} onDelete={setDeleteConfirm}
                        />
                      )) : (
                        <div style={{ padding: '10px 28px 20px' }}>
                          <div style={{ padding: '16px', border: '1px dashed #262626', borderRadius: '10px', textAlign: 'center', color: '#555', fontSize: '11px', fontWeight: 500 }}>Belum ada aset {label}</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {activePage === 'ai' && (
            <AIConsultant assets={assets} hargaMap={hargaMap} hargaSaham={hargaSaham} kursIdr={kursIdr} grandTotalUSD={grandTotalUSD} grandTotalIDR={grandTotalIDR} overallPnlUSD={overallPnlUSD} overallPnlPersen={overallPnlPersen} marketData={marketData} />
          )}

          {activePage === 'networth-detail' && (
            <NetWorthDetailPage
              onBack={() => setActivePage('portfolio')}
              chartData={chartData}
              currentNetWorth={grandTotalUSD}
              overallPnlUSD={overallPnlUSD}
              overallPnlPersen={overallPnlPersen}
              assets={assets}
              dailyPnlUSD={dailyPnlUSD}
              hargaMap={hargaMap}
              hargaSaham={hargaSaham}
              kursIdr={kursIdr}
              marketData={marketData}
            />
          )}
        </div>
      </div>

      {showAddModal && <AddAssetModal onSave={handleAddAsset} onClose={() => setShowAddModal(false)} />}
      {deleteConfirm && <ConfirmDeleteModal asset={deleteConfirm} onConfirm={() => { handleDeleteAsset(deleteConfirm.id); setDeleteConfirm(null); }} onCancel={() => setDeleteConfirm(null)} />}

      {editingAsset && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: '#141414', border: '1px solid #262626', borderRadius: '16px', padding: '32px', width: '360px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
            <h2 style={{ color: 'white', fontSize: '20px', fontWeight: 700, margin: '0 0 8px' }}>Top Up {editingAsset.ticker}</h2>
            <p style={{ color: '#a3a3a3', fontSize: '13px', margin: '0 0 24px' }}>Avg kamu saat ini: <b style={{ color: 'white' }}>{editingAsset.type === 'saham' ? 'Rp' : '$'}{editingAsset.avg}</b></p>
            {editingAsset.type !== 'cash_idr' && (
              <>
                <label style={{ color: '#a3a3a3', fontSize: '13px', fontWeight: 500 }}>Harga Beli Baru ({editingAsset.type === 'saham' ? 'IDR' : 'USD'})</label>
                <input type="number" placeholder="Contoh: 65000" value={editForm.harga} onChange={e => setEditForm(p => ({ ...p, length: e.target.value }))} style={styles.modalInput} />
              </>
            )}
            <label style={{ color: '#a3a3a3', fontSize: '13px', fontWeight: 500, marginTop: '16px', display: 'block' }}>
              Penambahan Jumlah ({editingAsset.type === 'saham' ? 'Lembar' : editingAsset.type === 'cash_idr' ? 'Rupiah' : 'Koin'})
            </label>
            <input type="number" placeholder="Contoh: 0.2" value={editForm.jumlah} onChange={e => setEditForm(p => ({ ...p, jumlah: e.target.value }))} style={styles.modalInput} />
            <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
              <button onClick={() => setEditingAsset(null)} style={{ flex: 1, backgroundColor: '#262626', color: 'white', border: 'none', borderRadius: '8px', padding: '12px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>Batal</button>
              <button onClick={() => handleSave(editingAsset.id, parseFloat(editForm.harga || 0), parseFloat(editForm.jumlah || 0))} style={{ flex: 1, backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '8px', padding: '12px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>Tambah Muatan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  summaryCard:      { backgroundColor: '#141414', border: '1px solid #262626', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'center' },
  periodRow:        { display: 'flex', gap: 4, backgroundColor: '#1a1a1a', padding: '4px', borderRadius: '8px' },
  periodBtn:        { backgroundColor: 'transparent', color: '#737373', border: 'none', borderRadius: '6px', padding: '4px 10px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' },
  periodBtnActive:  { backgroundColor: '#333', color: 'white' },
  marketCardMini:   { backgroundColor: '#141414', borderRadius: '12px', padding: '12px 16px', border: '1px solid #262626', display: 'flex', flexDirection: 'column', justifyContent: 'center' },
  modalInput:       { width: '100%', backgroundColor: '#0a0a0a', border: '1px solid #333', borderRadius: '10px', padding: '12px 16px', color: 'white', fontSize: '16px', outline: 'none', marginTop: '8px', boxSizing: 'border-box', fontWeight: 500 },
};

export default App;