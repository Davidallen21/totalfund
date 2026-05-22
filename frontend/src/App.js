import { useState, useEffect, useRef } from 'react';
import './App.css';

// Di local dev: '' (proxy ke localhost:8000 via package.json proxy)
// Di Vercel: set REACT_APP_API_URL ke URL backend Vercel kamu
const API_BASE = process.env.REACT_APP_API_URL || '';

function useWindowSize() {
  const [size, setSize] = useState({ width: window.innerWidth });
  useEffect(() => {
    const handler = () => setSize({ width: window.innerWidth });
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return size;
}

// ============================================
// KONFIGURASI ASET & KURS AWAL
// ============================================
const INITIAL_ASSETS = [
  { id: 1, nama: 'Bitcoin',  ticker: 'BTC',  simbol: 'bitcoin',  avg: 60000, jumlah: 0.5,  type: 'crypto' },
  { id: 2, nama: 'Ethereum', ticker: 'ETH',  simbol: 'ethereum', avg: 3000,  jumlah: 2,    type: 'crypto' },
  { id: 3, nama: 'Lighter',  ticker: 'LIT',  simbol: 'litentry', avg: 1,     jumlah: 2,    type: 'crypto' },
  { id: 4, nama: 'Bank Central Asia', ticker: 'BBCA', simbol: 'BBCA.JK', avg: 9200,  jumlah: 5000,   type: 'saham' },
  { id: 5, nama: 'Bank Rakyat Indo',  ticker: 'BBRI', simbol: 'BBRI.JK', avg: 4500,  jumlah: 10000,  type: 'saham' },
  { id: 6, nama: 'Bank Mandiri',      ticker: 'BMRI', simbol: 'BMRI.JK', avg: 6200,  jumlah: 5000,   type: 'saham' },
  { id: 7, nama: 'GoTo Gojek Toko',   ticker: 'GOTO', simbol: 'GOTO.JK', avg: 65,    jumlah: 100000, type: 'saham' },
  { id: 8, nama: 'Tether USD',  ticker: 'USDT', simbol: null, avg: 1, jumlah: 500,      type: 'stable'   },
  { id: 9, nama: 'Rupiah Cash', ticker: 'IDR',  simbol: null, avg: 1, jumlah: 15000000, type: 'cash_idr' },
];

const PERIODS = [
  { label: '1D', days: 1 }, { label: '7D', days: 7 }, { label: '30D', days: 30 }, { label: '90D', days: 90 }, { label: '1Y', days: 365 },
];

const formatUSD = (val) => '$' + val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatIDR = (val) => 'Rp ' + val.toLocaleString('id-ID', { maximumFractionDigits: 0 });
const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#ec4899', '#8b5cf6', '#06b6d4', '#f97316', '#64748b', '#84cc16'];

// fetchYahooPrice tidak lagi dipakai langsung dari browser
// Semua Yahoo Finance data di-fetch via Python backend (port 8000)

// ============================================
// KOMPONEN: SIDEBAR
// ============================================
const NAV_ITEMS = [
  { key: 'portfolio', label: 'Portfolio Live',  icon: '◈' },
  { key: 'ai',        label: 'AI Consultant',   icon: '✦' },
];

function Sidebar({ activePage, setActivePage, onClose, isOpen }) {
  return (
    <div className={`app-sidebar${isOpen ? ' sidebar-open' : ''}`}>
      <div className="sidebar-logo-area">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="sidebar-logo-icon">D</div>
          <span className="sidebar-logo-text">David<span>Hedge</span></span>
        </div>
        {onClose && (
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#555', fontSize: '18px', cursor: 'pointer', lineHeight: 1, padding: '4px' }}>✕</button>
        )}
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map(({ key, label, icon }) => (
          <div
            key={key}
            className={`nav-item${activePage === key ? ' active' : ''}`}
            onClick={() => { setActivePage(key); onClose?.(); }}
          >
            <span className="nav-icon">{icon}</span>
            {label}
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

// ============================================
// HELPER: CHARTS
// ============================================
function MiniChart({ data, color }) {
  if (!data || data.length < 2) return (
    <div style={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: '#555', fontSize: 13 }}>Memuat chart...</span>
    </div>
  );
  const W = 400, H = 100;
  const prices = data.map(d => d[1]);
  const min = Math.min(...prices), max = Math.max(...prices), range = max - min || 1;
  const points = data.map((d, i) => `${(i / (data.length - 1)) * W},${H - ((d[1] - min) / range) * (H - 4) - 2}`).join(' ');
  const gradientId = `grad-${color.replace('#', '')}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '100%', minHeight: '100px' }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${H} ${points} ${W},${H}`} fill={`url(#${gradientId})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function DonutChart({ data }) {
  let cumulativePercent = 0;
  function getCoordinatesForPercent(percent) {
    const x = Math.cos(2 * Math.PI * percent);
    const y = Math.sin(2 * Math.PI * percent);
    return [x, y];
  }
  return (
    <svg viewBox="-1 -1 2 2" style={{ width: '130px', height: '130px', transform: 'rotate(-90deg)' }}>
      {data.map(slice => {
        if (slice.pct <= 0) return null;
        if (slice.pct >= 99.9) return <circle key={slice.ticker} r="0.8" fill="transparent" stroke={slice.color} strokeWidth="0.4" />;
        const [startX, startY] = getCoordinatesForPercent(cumulativePercent);
        cumulativePercent += slice.pct / 100;
        const [endX, endY] = getCoordinatesForPercent(cumulativePercent);
        const largeArcFlag = slice.pct > 50 ? 1 : 0;
        const pathData = [`M ${startX} ${startY}`, `A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`, `L 0 0`].join(' ');
        return <path key={slice.ticker} d={pathData} fill={slice.color} />;
      })}
      <circle r="0.6" cx="0" cy="0" fill="#141414" />
    </svg>
  );
}

// ============================================
// KOMPONEN: BARIS DATA (TABLE ROW)
// ============================================
function DataRow({ asset, hargaLiveUSD, hargaLiveIDR, kursIdr, totalNetWorthUSD, onEdit, onDelete }) {
  const isCrypto  = asset.type === 'crypto';
  const isSaham   = asset.type === 'saham';
  const isStable  = asset.type === 'stable';
  const isCashIDR = asset.type === 'cash_idr';

  const hargaAcuan    = isCrypto ? hargaLiveUSD : isSaham ? hargaLiveIDR : 1;
  const nilaiModal    = asset.avg * asset.jumlah;
  const nilaiSekarang = hargaAcuan ? hargaAcuan * asset.jumlah : isCashIDR ? asset.jumlah : null;
  const pnl           = nilaiSekarang && !isStable && !isCashIDR ? nilaiSekarang - nilaiModal : null;
  const pnlPersen     = nilaiModal > 0 && pnl ? (pnl / nilaiModal) * 100 : 0;
  const profit        = pnl >= 0;
  const nilaiDalamUSD = isSaham || isCashIDR ? (nilaiSekarang ?? 0) / kursIdr : (nilaiSekarang ?? 0);
  const pct           = totalNetWorthUSD > 0 ? ((nilaiDalamUSD / totalNetWorthUSD) * 100).toFixed(1) : 0;

  const typeConfig = {
    crypto:   { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', glow: 'rgba(245,158,11,0.08)'  },
    saham:    { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', glow: 'rgba(59,130,246,0.08)'  },
    stable:   { color: '#10b981', bg: 'rgba(16,185,129,0.12)', glow: 'rgba(16,185,129,0.08)'  },
    cash_idr: { color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', glow: 'rgba(139,92,246,0.08)'  },
  }[asset.type] || { color: '#737373', bg: 'rgba(115,115,115,0.12)', glow: 'rgba(115,115,115,0.06)' };

  const gradientBg = `linear-gradient(to right, rgba(${typeConfig.color.replace('#','').match(/.{2}/g).map(h=>parseInt(h,16)).join(',')}, 0.04) 0%, #141414 35%)`;

  return (
    <>
    <div className="asset-row-desktop" style={{
      alignItems: 'center',
      padding: '18px 24px 18px 20px',
      borderRadius: '14px',
      marginBottom: '6px',
      background: gradientBg,
      border: '1px solid #262626',
      borderLeft: `4px solid ${typeConfig.color}`,
      gap: '16px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.02)',
    }}>

      {/* Aset Info */}
      <div style={{ flex: 2, display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
        <div style={{
          width: '48px', height: '48px', borderRadius: '13px',
          backgroundColor: typeConfig.bg, color: typeConfig.color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 800, fontSize: '11px', flexShrink: 0, letterSpacing: '0.5px',
          boxShadow: `0 4px 14px ${typeConfig.glow}`,
        }}>
          {asset.ticker.substring(0, 4)}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ color: '#ffffff', fontWeight: 700, fontSize: '16px', letterSpacing: '-0.2px' }}>{asset.ticker}</div>
          <div style={{ color: '#606060', fontSize: '12px', marginTop: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{asset.nama}</div>
        </div>
      </div>

      {/* Harga Live */}
      <div style={{ flex: 1.5 }}>
        {isCashIDR ? (
          <span style={{ color: '#404040', fontSize: '14px' }}>Pegged</span>
        ) : (
          <>
            <div style={{ color: '#e5e5e5', fontWeight: 600, fontSize: '15px' }}>
              {hargaAcuan ? (isSaham ? formatIDR(hargaAcuan) : formatUSD(hargaAcuan)) : <span style={{ color: '#383838' }}>—</span>}
            </div>
            <div style={{ color: '#555', fontSize: '12px', marginTop: '3px' }}>
              {hargaAcuan ? (isSaham ? formatUSD(hargaAcuan / kursIdr) : formatIDR(hargaAcuan * kursIdr)) : ''}
            </div>
          </>
        )}
      </div>

      {/* Holdings */}
      <div style={{ flex: 1.5 }}>
        {isCashIDR ? (
          <div style={{ color: '#e5e5e5', fontWeight: 600, fontSize: '15px' }}>
            {formatIDR(asset.jumlah).replace('Rp ', '')} <span style={{ color: '#555', fontSize: '12px', fontWeight: 400 }}>IDR</span>
          </div>
        ) : (
          <>
            <div style={{ color: '#e5e5e5', fontWeight: 600, fontSize: '15px' }}>
              {(isSaham ? asset.jumlah / 100 : asset.jumlah).toLocaleString()} <span style={{ color: '#555', fontSize: '12px', fontWeight: 400 }}>{isSaham ? 'Lot' : asset.ticker}</span>
            </div>
            <div style={{ color: '#555', fontSize: '12px', marginTop: '3px' }}>Avg: {isSaham ? formatIDR(asset.avg) : formatUSD(asset.avg)}</div>
          </>
        )}
      </div>

      {/* Nilai Aset */}
      <div style={{ flex: 1.5 }}>
        <div style={{ color: '#e5e5e5', fontWeight: 700, fontSize: '15px' }}>
          {nilaiSekarang ? (isSaham || isCashIDR ? formatIDR(nilaiSekarang) : formatUSD(nilaiSekarang)) : '—'}
        </div>
        <div style={{ color: '#555', fontSize: '12px', marginTop: '3px' }}>
          {nilaiSekarang ? (isSaham || isCashIDR ? formatUSD(nilaiSekarang / kursIdr) : formatIDR(nilaiSekarang * kursIdr)) : ''}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px' }}>
          <div style={{ width: '80px', height: '3px', backgroundColor: '#252525', borderRadius: '999px', overflow: 'hidden' }}>
            <div style={{ width: `${Math.min(parseFloat(pct), 100)}%`, height: '100%', backgroundColor: typeConfig.color }}></div>
          </div>
          <span style={{ fontSize: '11px', color: '#555', fontWeight: 600 }}>{pct}%</span>
        </div>
      </div>

      {/* Unrealized PNL */}
      <div style={{ flex: 1.5 }}>
        {!isStable && !isCashIDR && pnl !== null ? (
          <>
            <div style={{ color: profit ? '#4ade80' : '#f87171', fontWeight: 700, fontSize: '16px', letterSpacing: '-0.3px' }}>
              {profit ? '+' : ''}{isSaham ? formatIDR(pnl) : formatUSD(pnl)}
            </div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              marginTop: '6px',
              backgroundColor: profit ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)',
              color: profit ? '#4ade80' : '#f87171',
              padding: '4px 10px', borderRadius: '20px',
              fontSize: '12px', fontWeight: 700,
              border: `1px solid ${profit ? 'rgba(74,222,128,0.15)' : 'rgba(248,113,113,0.15)'}`,
            }}>
              {profit ? '▲' : '▼'} {Math.abs(pnlPersen).toFixed(2)}%
            </div>
          </>
        ) : (
          <span style={{ color: '#383838', fontSize: '20px' }}>—</span>
        )}
      </div>

      {/* Aksi */}
      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
        <button onClick={() => onEdit(asset)} style={{ backgroundColor: '#1e1e1e', color: '#909090', border: '1px solid #2e2e2e', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Edit</button>
        <button onClick={() => onDelete(asset)} style={{ backgroundColor: 'rgba(239,68,68,0.07)', color: '#f87171', border: '1px solid rgba(239,68,68,0.18)', borderRadius: '8px', padding: '8px 12px', fontSize: '15px', cursor: 'pointer' }}>✕</button>
      </div>
    </div>

    {/* ── MOBILE CARD LAYOUT ── */}
    <div className="asset-row-mobile" style={{ borderLeft: `4px solid ${typeConfig.color}`, background: `linear-gradient(to right, rgba(${typeConfig.color.replace('#','').match(/.{2}/g).map(h=>parseInt(h,16)).join(',')}, 0.04) 0%, #141414 35%)` }}>
      <div className="asset-row-mobile-top">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: typeConfig.bg, color: typeConfig.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '11px', flexShrink: 0 }}>
            {asset.ticker.substring(0, 4)}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: '15px' }}>{asset.ticker}</div>
            <div style={{ color: '#606060', fontSize: '12px', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{asset.nama}</div>
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ color: '#e5e5e5', fontWeight: 700, fontSize: '15px' }}>
            {nilaiSekarang ? (isSaham || isCashIDR ? formatIDR(nilaiSekarang) : formatUSD(nilaiSekarang)) : '—'}
          </div>
          <div style={{ color: '#555', fontSize: '12px', marginTop: '2px' }}>
            {nilaiSekarang ? (isSaham || isCashIDR ? formatUSD(nilaiSekarang / kursIdr) : formatIDR(nilaiSekarang * kursIdr)) : ''}
          </div>
        </div>
      </div>

      <div className="asset-row-mobile-bottom">
        <div className="asset-row-mobile-stats">
          {!isCashIDR && (
            <div>
              <div style={{ color: '#555', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '2px' }}>Harga</div>
              <div style={{ color: '#e5e5e5', fontSize: '13px', fontWeight: 600 }}>{hargaAcuan ? (isSaham ? formatIDR(hargaAcuan) : formatUSD(hargaAcuan)) : '—'}</div>
            </div>
          )}
          <div>
            <div style={{ color: '#555', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '2px' }}>Holdings</div>
            <div style={{ color: '#e5e5e5', fontSize: '13px', fontWeight: 600 }}>
              {isCashIDR ? formatIDR(asset.jumlah) : `${(isSaham ? asset.jumlah/100 : asset.jumlah).toLocaleString()} ${isSaham ? 'Lot' : asset.ticker}`}
            </div>
          </div>
          {!isStable && !isCashIDR && pnl !== null && (
            <div>
              <div style={{ color: '#555', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '2px' }}>PNL</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: profit ? '#4ade80' : '#f87171', fontSize: '13px', fontWeight: 700 }}>{profit?'+':''}{isSaham?formatIDR(pnl):formatUSD(pnl)}</span>
                <span style={{ backgroundColor: profit ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)', color: profit ? '#4ade80' : '#f87171', padding: '2px 7px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, border: `1px solid ${profit?'rgba(74,222,128,0.15)':'rgba(248,113,113,0.15)'}` }}>
                  {profit?'▲':'▼'} {Math.abs(pnlPersen).toFixed(1)}%
                </span>
              </div>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
          <button onClick={() => onEdit(asset)} style={{ backgroundColor: '#1e1e1e', color: '#909090', border: '1px solid #2e2e2e', borderRadius: '8px', padding: '7px 12px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>Edit</button>
          <button onClick={() => onDelete(asset)} style={{ backgroundColor: 'rgba(239,68,68,0.07)', color: '#f87171', border: '1px solid rgba(239,68,68,0.18)', borderRadius: '8px', padding: '7px 10px', fontSize: '14px', cursor: 'pointer' }}>✕</button>
        </div>
      </div>
    </div>
    </>
  );
}

// ============================================
// KOMPONEN: KONFIRMASI HAPUS
// ============================================
function ConfirmDeleteModal({ asset, onConfirm, onCancel }) {
  const typeConfig = {
    crypto:   { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)'  },
    saham:    { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)'  },
    stable:   { color: '#10b981', bg: 'rgba(16,185,129,0.1)'  },
    cash_idr: { color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)'  },
  }[asset.type] || { color: '#737373', bg: 'rgba(115,115,115,0.1)' };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
      <div style={{ backgroundColor: '#111215', border: '1px solid #1e2026', borderRadius: '18px', padding: '28px 28px 24px', width: '340px', boxShadow: '0 24px 64px rgba(0,0,0,0.8)' }}>
        <div style={{ width: '52px', height: '52px', borderRadius: '14px', backgroundColor: 'rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', fontSize: '24px' }}>🗑</div>
        <h3 style={{ color: '#ffffff', fontSize: '20px', fontWeight: 800, margin: '0 0 10px' }}>Hapus {asset.ticker}?</h3>
        <p style={{ color: '#a3a3a3', fontSize: '14px', margin: '0 0 6px', lineHeight: 1.6 }}>
          Aset <span style={{ color: typeConfig.color, fontWeight: 700 }}>{asset.nama}</span> akan dihapus permanen dari portfolio.
        </p>
        <p style={{ color: '#525252', fontSize: '13px', margin: '0 0 24px' }}>Aksi ini tidak bisa dibatalkan.</p>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={onCancel} style={{ flex: 1, backgroundColor: '#1a1a22', color: '#737373', border: '1px solid #242430', borderRadius: '9px', padding: '12px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>Batal</button>
          <button onClick={onConfirm} style={{ flex: 1, backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '9px', padding: '12px', fontSize: '14px', fontWeight: 800, cursor: 'pointer' }}>Hapus</button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// KOMPONEN: MODAL TAMBAH ASET
// ============================================
function AddAssetModal({ onSave, onClose }) {
  const [form, setForm] = useState({ nama: '', ticker: '', simbol: '', type: 'crypto', avg: '', jumlah: '' });
  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));
  const isCashIDR = form.type === 'cash_idr';

  const handleSubmit = () => {
    if (!form.nama || !form.ticker || !form.jumlah) return;
    if (!isCashIDR && !form.avg) return;
    onSave({
      nama:   form.nama,
      ticker: form.ticker.toUpperCase(),
      simbol: form.simbol.trim() || null,
      type:   form.type,
      avg:    isCashIDR ? 1 : parseFloat(form.avg),
      jumlah: parseFloat(form.jumlah),
    });
  };

  const typeMap = [
    ['crypto',   'Crypto',     '#f59e0b'],
    ['saham',    'IDX Saham',  '#3b82f6'],
    ['stable',   'Stablecoin', '#10b981'],
    ['cash_idr', 'Cash IDR',   '#8b5cf6'],
  ];

  const labelStyle = {
    color: '#606060', fontSize: '11px', fontWeight: 700,
    display: 'block', marginBottom: '8px',
    textTransform: 'uppercase', letterSpacing: '0.6px',
  };
  const inputStyle = {
    width: '100%', backgroundColor: '#0d0d0d',
    border: '1px solid #2a2a2a', borderRadius: '10px',
    padding: '12px 16px', color: '#e5e5e5', fontSize: '14px',
    outline: 'none', boxSizing: 'border-box', fontWeight: 500,
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ backgroundColor: '#141414', border: '1px solid #262626', borderRadius: '20px', padding: '0', width: '480px', boxShadow: '0 32px 80px rgba(0,0,0,0.8)', maxHeight: '90vh', overflowY: 'auto' }}>

        {/* Modal Header */}
        <div style={{ padding: '24px 28px 20px', borderBottom: '1px solid #1f1f1f', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ color: '#ffffff', fontSize: '19px', fontWeight: 800, margin: 0, letterSpacing: '-0.3px' }}>Tambah Aset Baru</h2>
            <p style={{ color: '#606060', fontSize: '13px', margin: '4px 0 0' }}>Lengkapi informasi aset portfolio kamu</p>
          </div>
          <button onClick={onClose} style={{ width: '34px', height: '34px', borderRadius: '10px', backgroundColor: '#1e1e1e', border: '1px solid #2a2a2a', color: '#606060', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>✕</button>
        </div>

        {/* Form Body */}
        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Nama + Ticker */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '14px' }}>
            <div>
              <label style={labelStyle}>Nama Aset</label>
              <input value={form.nama} onChange={e => set('nama', e.target.value)} placeholder="Bitcoin" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Ticker</label>
              <input value={form.ticker} onChange={e => set('ticker', e.target.value.toUpperCase())} placeholder="BTC" style={{ ...inputStyle, textTransform: 'uppercase', letterSpacing: '0.5px' }} />
            </div>
          </div>

          {/* Tipe Aset */}
          <div>
            <label style={labelStyle}>Tipe Aset</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px' }}>
              {typeMap.map(([val, lbl, col]) => (
                <button key={val} onClick={() => set('type', val)} style={{
                  padding: '10px 6px', borderRadius: '10px', border: '1px solid',
                  borderColor: form.type === val ? col : '#222',
                  backgroundColor: form.type === val ? `${col}15` : '#0d0d0d',
                  color: form.type === val ? col : '#484848',
                  fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                  transition: 'all 0.15s',
                }}>
                  {lbl}
                </button>
              ))}
            </div>
          </div>

          {/* API Symbol */}
          {(form.type === 'crypto' || form.type === 'saham') && (
            <div>
              <label style={labelStyle}>{form.type === 'crypto' ? 'CoinGecko ID' : 'Yahoo Finance Symbol'}</label>
              <input
                value={form.simbol}
                onChange={e => set('simbol', e.target.value)}
                placeholder={form.type === 'crypto' ? 'bitcoin' : 'BBCA.JK'}
                style={inputStyle}
              />
              <p style={{ color: '#404040', fontSize: '11px', margin: '6px 0 0' }}>
                {form.type === 'crypto' ? 'Contoh: bitcoin · ethereum · solana · cardano' : 'Contoh: BBCA.JK · TLKM.JK · ASII.JK'}
              </p>
            </div>
          )}

          {/* Harga AVG + Jumlah */}
          <div style={{ display: 'grid', gridTemplateColumns: isCashIDR ? '1fr' : '1fr 1fr', gap: '14px' }}>
            {!isCashIDR && (
              <div>
                <label style={labelStyle}>Harga Beli AVG ({form.type === 'saham' ? 'IDR' : 'USD'})</label>
                <input type="number" value={form.avg} onChange={e => set('avg', e.target.value)} placeholder="0" style={inputStyle} />
              </div>
            )}
            <div>
              <label style={labelStyle}>Jumlah ({form.type === 'saham' ? 'Lembar' : form.type === 'cash_idr' ? 'Rupiah (IDR)' : 'Unit'})</label>
              <input type="number" value={form.jumlah} onChange={e => set('jumlah', e.target.value)} placeholder={isCashIDR ? '10000000' : '0'} style={inputStyle} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '0 28px 28px', display: 'flex', gap: '10px' }}>
          <button onClick={onClose} style={{ flex: 1, backgroundColor: '#1a1a1a', color: '#737373', border: '1px solid #262626', borderRadius: '10px', padding: '13px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>Batal</button>
          <button onClick={handleSubmit} style={{ flex: 2, backgroundColor: '#4ade80', color: '#000', border: 'none', borderRadius: '10px', padding: '13px', fontSize: '14px', fontWeight: 800, cursor: 'pointer', letterSpacing: '-0.2px' }}>+ Tambah Aset</button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// KOMPONEN: AI CONSULTANT
// ============================================
function renderAIText(text) {
  const escaped = text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  return escaped
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code style="background:rgba(255,255,255,0.08);padding:2px 7px;border-radius:4px;font-size:0.88em;font-family:monospace">$1</code>')
    .replace(/^### (.*?)$/gm, '<div style="font-size:14px;font-weight:700;color:#e5e5e5;margin:10px 0 4px">$1</div>')
    .replace(/^## (.*?)$/gm, '<div style="font-size:15px;font-weight:800;color:#fff;margin:12px 0 6px">$1</div>')
    .replace(/^- (.*?)$/gm, '<div style="display:flex;gap:8px;margin:3px 0"><span style="color:#4ade80;flex-shrink:0">▸</span><span>$1</span></div>')
    .replace(/\n\n/g,'<div style="height:10px"></div>')
    .replace(/\n/g,'<br/>');
}

const SUGGESTIONS = [
  'Analisa portfolio saya secara keseluruhan',
  'Aset mana yang paling menguntungkan?',
  'Bagaimana kondisi pasar hari ini?',
  'Rekomendasi rebalancing portfolio saya',
  'Jelaskan risiko portfolio saya saat ini',
];

function AIConsultant({ assets, hargaMap, hargaSaham, kursIdr, grandTotalUSD, grandTotalIDR, overallPnlUSD, overallPnlPersen, marketData }) {
  const buildContext = () => {
    const detail = assets.map(a => {
      const isCrypto = a.type === 'crypto', isSaham = a.type === 'saham';
      const harga  = isCrypto ? (hargaMap[a.simbol]?.usd ?? 0) : isSaham ? (hargaSaham[a.ticker] ?? 0) : a.avg;
      const nilai  = isCrypto || a.type === 'stable' ? harga * a.jumlah : isSaham ? harga * a.jumlah : a.jumlah;
      const nilaiUSD = (isSaham || a.type === 'cash_idr') ? nilai / kursIdr : nilai;
      const modal  = a.avg * a.jumlah;
      const pnl    = !['stable','cash_idr'].includes(a.type) ? nilai - modal : null;
      const pct    = modal > 0 && pnl !== null ? (pnl / modal * 100).toFixed(1) : null;
      const qty    = isSaham ? `${a.jumlah/100} Lot` : `${a.jumlah} ${a.ticker}`;
      return `  • ${a.ticker} (${a.nama}): Harga ${isSaham ? formatIDR(harga) : formatUSD(harga)}, Holdings ${qty}, Nilai ~${formatUSD(nilaiUSD)}${pct !== null ? `, PNL ${pnl >= 0 ? '+' : ''}${pct}%` : ''}`;
    }).join('\n');

    const mkt = Object.entries(marketData)
      .map(([k,v]) => `  • ${k}: ${v.type==='usd'?'$':''}${v.price.toLocaleString(undefined,{maximumFractionDigits:2})} (${v.isUp?'+':''}${v.change.toFixed(2)}%)`)
      .join('\n');

    return `PORTFOLIO (${new Date().toLocaleString('id-ID')})
Total Net Worth : ${formatUSD(grandTotalUSD)} / ${formatIDR(grandTotalIDR)}
Overall PNL     : ${overallPnlUSD>=0?'+':''}${formatUSD(overallPnlUSD)} (${overallPnlPersen.toFixed(2)}%)
Kurs USD/IDR    : ${kursIdr.toLocaleString('id-ID')}

DETAIL ASET:
${detail}

DATA PASAR REALTIME:
${mkt}`;
  };

  const welcome = `Halo! Saya **DavidHedge AI**, konsultan keuangan personal kamu. ✦

Portfolio kamu saat ini senilai **${formatUSD(grandTotalUSD)}** dengan PNL **${overallPnlUSD>=0?'+':''}${formatUSD(overallPnlUSD)} (${overallPnlPersen.toFixed(2)}%)**.

Tanyakan apa saja tentang portfolio, pasar, atau strategi investasimu!`;

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
      const res  = await fetch(`${API_BASE}/api/ai-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, context: buildContext(), history }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'ai', text: data.response || 'Maaf, terjadi kesalahan.' }]);
    } catch {
      setMessages(prev => [...prev, { role: 'ai', text: '⚠️ Tidak bisa terhubung ke server. Pastikan backend berjalan dan **GROQ_API_KEY** sudah dikonfigurasi.' }]);
    }
    setLoading(false);
    inputRef.current?.focus();
  };

  const isWelcome = messages.length === 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', borderRadius: '20px', border: '1px solid #262626', backgroundColor: '#141414', overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.4)' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid #1f1f1f', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: '12px', background: 'linear-gradient(135deg, #4ade80 0%, #06b6d4 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', boxShadow: '0 4px 14px rgba(74,222,128,0.3)', flexShrink: 0 }}>✦</div>
          <div>
            <div style={{ color: '#ffffff', fontWeight: 800, fontSize: '15px', letterSpacing: '-0.3px' }}>DavidHedge AI</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <div className="status-dot" style={{ width: 6, height: 6 }} />
              <span style={{ color: '#6b7280', fontSize: '12px' }}>Online · Data portfolio real-time</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <span style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.15)', color: '#4ade80', fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '20px' }}>Groq · llama-3.3-70b</span>
        </div>
      </div>

      {/* ── Content area ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>

        {/* Welcome state */}
        {isWelcome && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60%', textAlign: 'center', padding: '20px 0' }}>
            <div style={{ width: 72, height: 72, borderRadius: '20px', background: 'linear-gradient(135deg, #4ade80 0%, #06b6d4 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', boxShadow: '0 8px 28px rgba(74,222,128,0.25)', marginBottom: 20 }}>✦</div>
            <div style={{ color: '#ffffff', fontWeight: 800, fontSize: '22px', letterSpacing: '-0.5px', marginBottom: 8 }}>DavidHedge AI</div>
            <div style={{ color: '#6b7280', fontSize: '14px', marginBottom: 28, maxWidth: 420, lineHeight: 1.6 }}>
              Konsultan keuangan personal kamu berbasis AI dengan akses data portfolio &amp; pasar secara real-time.
            </div>

            {/* Portfolio snapshot */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, width: '100%', maxWidth: 480, marginBottom: 28 }}>
              <div style={{ background: '#1a1a1a', border: '1px solid #262626', borderRadius: '14px', padding: '16px 20px', textAlign: 'left' }}>
                <div style={{ color: '#6b7280', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Net Worth</div>
                <div style={{ color: '#ffffff', fontWeight: 800, fontSize: '20px', letterSpacing: '-0.5px' }}>{formatUSD(grandTotalUSD)}</div>
                <div style={{ color: '#525252', fontSize: '12px', marginTop: 2 }}>{formatIDR(grandTotalIDR)}</div>
              </div>
              <div style={{ background: '#1a1a1a', border: '1px solid #262626', borderRadius: '14px', padding: '16px 20px', textAlign: 'left' }}>
                <div style={{ color: '#6b7280', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Overall PNL</div>
                <div style={{ color: overallPnlUSD >= 0 ? '#4ade80' : '#f87171', fontWeight: 800, fontSize: '20px', letterSpacing: '-0.5px' }}>{overallPnlUSD >= 0 ? '+' : ''}{formatUSD(overallPnlUSD)}</div>
                <div style={{ color: overallPnlUSD >= 0 ? '#166534' : '#991b1b', fontSize: '12px', marginTop: 2, fontWeight: 600 }}>{overallPnlPersen >= 0 ? '+' : ''}{overallPnlPersen.toFixed(2)}%</div>
              </div>
            </div>

            {/* Suggestions */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: 560 }}>
              {SUGGESTIONS.map((s, i) => (
                <button key={i} onClick={() => send(s)} style={{ background: '#1a1a1a', color: '#a3a3a3', border: '1px solid #2a2a2a', borderRadius: '20px', padding: '8px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background='rgba(74,222,128,0.08)'; e.currentTarget.style.color='#4ade80'; e.currentTarget.style.borderColor='rgba(74,222,128,0.2)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background='#1a1a1a'; e.currentTarget.style.color='#a3a3a3'; e.currentTarget.style.borderColor='#2a2a2a'; }}
                >{s}</button>
              ))}
            </div>
          </div>
        )}

        {/* Chat messages */}
        {!isWelcome && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', gap: '10px', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', alignItems: 'flex-start' }}>
                {msg.role === 'ai' && (
                  <div style={{ width: 30, height: 30, borderRadius: '9px', background: 'linear-gradient(135deg, #4ade80, #06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', flexShrink: 0, boxShadow: '0 2px 8px rgba(74,222,128,0.2)' }}>✦</div>
                )}
                <div style={{
                  maxWidth: '74%',
                  padding: '13px 17px',
                  borderRadius: msg.role === 'ai' ? '2px 14px 14px 14px' : '14px 2px 14px 14px',
                  background: msg.role === 'ai' ? '#1a1a1a' : 'linear-gradient(135deg, #166534 0%, #14532d 100%)',
                  border: msg.role === 'ai' ? '1px solid #262626' : '1px solid rgba(74,222,128,0.2)',
                  color: '#e5e5e5', fontSize: '14px', lineHeight: '1.7',
                  boxShadow: msg.role === 'user' ? '0 4px 14px rgba(74,222,128,0.1)' : 'none',
                }}>
                  {msg.role === 'ai'
                    ? <div dangerouslySetInnerHTML={{ __html: renderAIText(msg.text) }} />
                    : <span style={{ fontWeight: 500 }}>{msg.text}</span>}
                </div>
                {msg.role === 'user' && (
                  <div style={{ width: 30, height: 30, borderRadius: '9px', background: '#1a1a1a', border: '1px solid #2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', flexShrink: 0, color: '#737373' }}>◈</div>
                )}
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

      {/* ── Input bar ── */}
      <div style={{ padding: '16px 24px', borderTop: '1px solid #1f1f1f', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: '10px', padding: '12px 16px', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '12px' }}>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder="Tanya tentang portfolio, pasar, atau strategi investasimu..."
            disabled={loading}
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#e5e5e5', fontSize: '14px', fontFamily: 'inherit' }}
          />
          <button
            onClick={() => send()}
            disabled={loading || !input.trim()}
            style={{ width: '36px', height: '36px', borderRadius: '9px', background: input.trim() ? 'linear-gradient(135deg, #4ade80, #06b6d4)' : 'rgba(255,255,255,0.05)', border: 'none', color: input.trim() ? '#000' : '#4b5563', fontSize: '15px', fontWeight: 700, cursor: input.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: input.trim() ? '0 4px 12px rgba(74,222,128,0.3)' : 'none' }}
          >▶</button>
        </div>
        <div style={{ color: '#374151', fontSize: '11px', marginTop: '8px', textAlign: 'center' }}>
          AI dapat membuat kesalahan · Verifikasi sebelum mengambil keputusan investasi
        </div>
      </div>
    </div>
  );
}

// ============================================
// KOMPONEN UTAMA: APP
// ============================================
function App() {
  const [activePage, setActivePage]     = useState('portfolio');
  const [assets, setAssets]             = useState(INITIAL_ASSETS);
  const [hargaMap, setHargaMap]         = useState({});
  const [editingAsset, setEditingAsset] = useState(null);
  const [kursIdr, setKursIdr]           = useState(16200);
  const [period, setPeriod]             = useState(PERIODS[0]);
  const [chartData, setChartData]       = useState(null);
  const [pnlChart, setPnlChart]         = useState(null);
  const [showAddModal, setShowAddModal]   = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [sidebarOpen, setSidebarOpen]     = useState(false);
  const { width } = useWindowSize();

  const [hargaSaham, setHargaSaham] = useState({});
  const [cryptoLoaded, setCryptoLoaded] = useState(false);
  const [marketLoaded, setMarketLoaded] = useState(false);

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

  // ── FETCH SEMUA DATA REALTIME ──
  useEffect(() => {
    const fetchAll = async () => {

      // 1. CRYPTO via Binance (no rate limit, no CORS issue, realtime)
      try {
        const res  = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbols=' + encodeURIComponent('["BTCUSDT","ETHUSDT","LITUSDT"]'));
        const data = await res.json();
        const find = (sym) => data.find(d => d.symbol === sym) || {};

        const btc = find('BTCUSDT');
        const eth = find('ETHUSDT');
        const lit = find('LITUSDT');

        const btcPrice  = parseFloat(btc.lastPrice)          || 0;
        const btcChange = parseFloat(btc.priceChangePercent)  || 0;
        const ethPrice  = parseFloat(eth.lastPrice)          || 0;
        const ethChange = parseFloat(eth.priceChangePercent)  || 0;
        const litPrice  = parseFloat(lit.lastPrice)          || 0;

        setHargaMap({
          bitcoin:  { usd: btcPrice  },
          ethereum: { usd: ethPrice  },
          litentry: { usd: litPrice  },
        });

        setMarketData(prev => ({
          ...prev,
          BTC: { price: btcPrice, change: btcChange, isUp: btcChange >= 0, type: 'usd' },
          ETH: { price: ethPrice, change: ethChange, isUp: ethChange >= 0, type: 'usd' },
        }));
        if (btcPrice > 0) setCryptoLoaded(true);
      } catch (e) {
        // Fallback ke CoinGecko jika Binance gagal
        try {
          const res  = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,litentry&vs_currencies=usd&include_24hr_change=true');
          const data = await res.json();
          const btcPrice  = data.bitcoin?.usd  ?? 0;
          const btcChange = data.bitcoin?.usd_24h_change  ?? 0;
          const ethPrice  = data.ethereum?.usd ?? 0;
          const ethChange = data.ethereum?.usd_24h_change ?? 0;
          const litPrice  = data.litentry?.usd ?? 0;
          setHargaMap({ bitcoin: { usd: btcPrice }, ethereum: { usd: ethPrice }, litentry: { usd: litPrice } });
          setMarketData(prev => ({ ...prev,
            BTC: { price: btcPrice, change: btcChange, isUp: btcChange >= 0, type: 'usd' },
            ETH: { price: ethPrice, change: ethChange, isUp: ethChange >= 0, type: 'usd' },
          }));
          if (btcPrice > 0) setCryptoLoaded(true);
        } catch (e2) { console.warn('Crypto fetch error:', e2); }
      }

      // 2. MARKET DATA via Python backend (no CORS issue, lebih reliable)
      try {
        const res  = await fetch(`${API_BASE}/api/market-data`);
        const data = await res.json();

        // IDX stock prices
        const stockUpdates = {};
        ['BBCA','BBRI','BMRI','GOTO'].forEach(t => {
          if (data[t]?.price) stockUpdates[t] = data[t].price;
        });
        if (Object.keys(stockUpdates).length > 0) {
          setHargaSaham(prev => ({ ...prev, ...stockUpdates }));
        }

        // Market overview cards
        const mk = (key, type) => data[key]
          ? { price: data[key].price, change: data[key].change, isUp: data[key].change >= 0, type }
          : null;

        setMarketData(prev => ({
          ...prev,
          ...(mk('IHSG',   'idr') ? { IHSG:   mk('IHSG',   'idr') } : {}),
          ...(mk('SPX500', 'usd') ? { SPX500: mk('SPX500', 'usd') } : {}),
          ...(mk('NASDAQ', 'usd') ? { NASDAQ: mk('NASDAQ', 'usd') } : {}),
          ...(mk('GOLD',   'usd') ? { GOLD:   mk('GOLD',   'usd') } : {}),
          ...(mk('XAG',    'usd') ? { XAG:    mk('XAG',    'usd') } : {}),
          ...(mk('BRENT',  'usd') ? { BRENT:  mk('BRENT',  'usd') } : {}),
        }));
        setMarketLoaded(true);
      } catch (e) { console.warn('Backend market-data error (pastikan python bot.py berjalan):', e); }

      // 3. KURS USD/IDR
      try {
        const res  = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        const data = await res.json();
        if (data?.rates?.IDR) setKursIdr(data.rates.IDR);
      } catch (e) { console.warn('Exchange rate error:', e); }
    };

    fetchAll();
    const interval = setInterval(fetchAll, 60000);
    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Chart baseline — pakai useRef agar tidak trigger re-fetch saat harga berubah
  const valStableUSD      = assets.filter(a => a.type === 'stable').reduce((s, a) => s + a.avg * a.jumlah, 0);
  const valSahamIDR       = assets.filter(a => a.type === 'saham').reduce((s, a) => s + (hargaSaham[a.ticker] ?? 0) * a.jumlah, 0);
  const valCashIDR        = assets.filter(a => a.type === 'cash_idr').reduce((s, a) => s + a.jumlah, 0);
  const baselineNonCrypto = valStableUSD + valSahamIDR / kursIdr + valCashIDR / kursIdr;

  const baselineRef = useRef(baselineNonCrypto);
  baselineRef.current = baselineNonCrypto;

  // Chart historis — hanya re-fetch saat period atau assets berubah, BUKAN saat harga update
  useEffect(() => {
    const fetchChart = async () => {
      const cryptoAssets = assets.filter(a => a.type === 'crypto' && a.simbol);
      try {
        const results = await Promise.all(
          cryptoAssets.map(a =>
            fetch(`${API_BASE}/api/chart?simbol=${a.simbol}&days=${period.days}`)
              .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
          )
        );
        const base = results[0]?.prices ?? [];
        const baseline = baselineRef.current;
        const combined = base.map((pt, i) => [
          pt[0],
          cryptoAssets.reduce((s, a, j) => s + (results[j]?.prices?.[i]?.[1] ?? 0) * a.jumlah, 0) + baseline,
        ]);
        setChartData(combined);
        if (combined.length >= 2) {
          const awal = combined[0][1], akhir = combined[combined.length - 1][1], diff = akhir - awal;
          setPnlChart({ selisih: diff, persen: (diff / awal) * 100 });
        }
      } catch { setChartData([]); }
    };
    fetchChart();
  }, [period, assets]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSave(id, avgBaru, jumlahBaru) {
    setAssets(prev => prev.map(a => a.id === id ? { ...a, avg: avgBaru, jumlah: jumlahBaru } : a));
    setEditingAsset(null);
  }

  function handleDeleteAsset(id) {
    setAssets(prev => prev.filter(a => a.id !== id));
  }

  function handleAddAsset(newAsset) {
    const newId = Date.now();
    setAssets(prev => [...prev, { ...newAsset, id: newId }]);
    setShowAddModal(false);
  }

  // Kalkulasi grand total
  const valCryptoUSD   = assets.filter(a => a.type === 'crypto').reduce((s, a) => s + (hargaMap[a.simbol]?.usd ?? 0) * a.jumlah, 0);
  const modCryptoUSD   = assets.filter(a => a.type === 'crypto').reduce((s, a) => s + a.avg * a.jumlah, 0);
  const modSahamIDR    = assets.filter(a => a.type === 'saham').reduce((s, a) => s + a.avg * a.jumlah, 0);
  const valSahamUSD    = valSahamIDR / kursIdr;
  const modSahamUSD    = modSahamIDR / kursIdr;
  const valCashUSD     = valCashIDR / kursIdr;

  const grandTotalUSD   = valCryptoUSD + valStableUSD + valSahamUSD + valCashUSD;
  const grandTotalIDR   = grandTotalUSD * kursIdr;
  const grandModalUSD   = modCryptoUSD + valStableUSD + modSahamUSD + valCashUSD;
  const overallPnlUSD   = grandTotalUSD - grandModalUSD;
  const overallPnlIDR   = overallPnlUSD * kursIdr;
  const overallPnlPersen = grandModalUSD > 0 ? (overallPnlUSD / grandModalUSD) * 100 : 0;
  const isOverallProfit  = overallPnlUSD >= 0;
  const pnlCryptoUSD     = valCryptoUSD - modCryptoUSD;
  const pnlSahamIDR      = valSahamIDR - modSahamIDR;
  const chartColor       = pnlChart?.selisih >= 0 ? '#4ade80' : '#f87171';

  // Pie data
  const pieData = assets.map((a, i) => {
    let valUSD = 0;
    if (a.type === 'crypto')   valUSD = (hargaMap[a.simbol]?.usd ?? 0) * a.jumlah;
    if (a.type === 'saham')    valUSD = ((hargaSaham[a.ticker] ?? 0) * a.jumlah) / kursIdr;
    if (a.type === 'stable')   valUSD = a.avg * a.jumlah;
    if (a.type === 'cash_idr') valUSD = a.jumlah / kursIdr;
    return { ticker: a.ticker, val: valUSD, pct: grandTotalUSD > 0 ? (valUSD / grandTotalUSD) * 100 : 0, color: COLORS[i % COLORS.length] };
  }).filter(d => d.val > 0).sort((a, b) => b.val - a.val);

  const renderSingleCard = (key, displayName) => {
    const data     = marketData[key];
    const isLoaded = data.price > 0;
    const isCrypto = key === 'BTC' || key === 'ETH';
    const loaded   = isCrypto ? cryptoLoaded : marketLoaded;

    return (
      <div style={styles.marketCardMini} key={key}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#a3a3a3', fontWeight: 700, fontSize: '13px' }}>{displayName}</span>
          {loaded && isLoaded
            ? <span style={{ color: data.isUp ? '#4ade80' : '#f87171', fontSize: '11px', fontWeight: 700, background: data.isUp ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                {data.isUp ? '+' : ''}{data.change.toFixed(2)}%
              </span>
            : <div className="skeleton" style={{ width: 42, height: 16 }} />
          }
        </div>
        {loaded && isLoaded
          ? <div style={{ color: 'white', fontWeight: 800, fontSize: '18px', marginTop: '6px', letterSpacing: '-0.5px' }}>
              {data.type === 'usd' ? '$' : ''}{data.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </div>
          : <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div className="skeleton" style={{ width: '80%', height: 20 }} />
            </div>
        }
      </div>
    );
  };

  return (
    <div className="app-wrapper">
      <div className={`sidebar-overlay${sidebarOpen ? ' sidebar-open' : ''}`} onClick={() => setSidebarOpen(false)} />
      <Sidebar activePage={activePage} setActivePage={setActivePage} onClose={() => setSidebarOpen(false)} isOpen={sidebarOpen} />

      <div className="app-main">
        <div className="max-container">

          <div className="page-header">
            <button className="hamburger-btn" onClick={() => setSidebarOpen(true)}>☰</button>
            <div>
              <h1 className="page-title">
                {activePage === 'portfolio' && 'Overview'}
                {activePage === 'ai'        && 'AI Consultant'}
              </h1>
            </div>
          </div>

          {activePage === 'portfolio' && (
            <>
              {/* ROW 1: NET WORTH | PNL | CHART */}
              <div className="summary-cards">

                <div style={styles.summaryCard}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <span style={{ color: '#a3a3a3', fontSize: '14px', fontWeight: 500 }}>Total Net Worth</span>
                    <span style={{ color: '#4ade80', fontSize: '12px', backgroundColor: 'rgba(74,222,128,0.1)', padding: '4px 8px', borderRadius: '6px', fontWeight: 600 }}>IDR: {kursIdr.toLocaleString('id-ID')}</span>
                  </div>
                  {cryptoLoaded
                    ? <>
                        <div style={{ color: 'white', fontSize: '36px', fontWeight: 800, letterSpacing: '-1px' }}>{formatUSD(grandTotalUSD)}</div>
                        <div style={{ color: '#737373', fontSize: '18px', fontWeight: 500, marginTop: '4px' }}>{formatIDR(grandTotalIDR)}</div>
                      </>
                    : <>
                        <div className="skeleton" style={{ width: '70%', height: 38, marginBottom: 8 }} />
                        <div className="skeleton" style={{ width: '50%', height: 22 }} />
                      </>
                  }
                </div>

                <div style={styles.summaryCard}>
                  <span style={{ color: '#a3a3a3', fontSize: '14px', fontWeight: 500, display: 'block', marginBottom: '12px' }}>Overall PNL (All Assets)</span>
                  {cryptoLoaded
                    ? <>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
                          <div style={{ color: isOverallProfit ? '#4ade80' : '#f87171', fontSize: '30px', fontWeight: 800, letterSpacing: '-1px' }}>
                            {isOverallProfit ? '+' : ''}{formatUSD(overallPnlUSD)}
                          </div>
                          <span style={{ backgroundColor: isOverallProfit ? 'rgba(74,222,128,0.15)' : 'rgba(248,113,113,0.15)', color: isOverallProfit ? '#4ade80' : '#f87171', padding: '4px 10px', borderRadius: '12px', fontSize: '13px', fontWeight: 'bold' }}>
                            {isOverallProfit ? '+' : ''}{overallPnlPersen.toFixed(2)}%
                          </span>
                        </div>
                        <div style={{ color: isOverallProfit ? '#166534' : '#991b1b', fontSize: '14px', fontWeight: 600, marginTop: '4px' }}>
                          {isOverallProfit ? '+' : ''}{formatIDR(overallPnlIDR)}
                        </div>
                        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #262626', display: 'flex', gap: '16px' }}>
                          <div style={{ flex: 1 }}>
                            <span style={{ color: '#737373', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Kripto (USD)</span>
                            <span style={{ color: pnlCryptoUSD >= 0 ? '#4ade80' : '#f87171', fontSize: '14px', fontWeight: 'bold' }}>
                              {pnlCryptoUSD >= 0 ? '+' : ''}{formatUSD(pnlCryptoUSD)}
                            </span>
                          </div>
                          <div style={{ width: '1px', backgroundColor: '#262626' }} />
                          <div style={{ flex: 1 }}>
                            <span style={{ color: '#737373', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Saham (IDR)</span>
                            <span style={{ color: pnlSahamIDR >= 0 ? '#4ade80' : '#f87171', fontSize: '14px', fontWeight: 'bold' }}>
                              {pnlSahamIDR >= 0 ? '+' : ''}{formatIDR(pnlSahamIDR)}
                            </span>
                          </div>
                        </div>
                      </>
                    : <>
                        <div className="skeleton" style={{ width: '60%', height: 34, marginBottom: 8 }} />
                        <div className="skeleton" style={{ width: '40%', height: 18, marginBottom: 20 }} />
                        <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                          <div className="skeleton" style={{ flex: 1, height: 36, borderRadius: 8 }} />
                          <div className="skeleton" style={{ flex: 1, height: 36, borderRadius: 8 }} />
                        </div>
                      </>
                  }
                </div>

                <div style={{ ...styles.summaryCard, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <span style={{ color: '#a3a3a3', fontSize: '14px', fontWeight: 500 }}>Net Worth Trend</span>
                    <div style={styles.periodRow}>
                      {PERIODS.map(p => (
                        <button key={p.label} onClick={() => setPeriod(p)} style={{ ...styles.periodBtn, ...(period.label === p.label ? styles.periodBtnActive : {}) }}>{p.label}</button>
                      ))}
                    </div>
                  </div>
                  <div style={{ flex: 1 }}><MiniChart data={chartData} color={chartColor} /></div>
                </div>
              </div>

              {/* ROW 2: 8 MARKET CARDS + DONUT CHART */}
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
                <div className="donut-card">
                  <div style={{ width: '130px', height: '130px', flexShrink: 0 }}>
                    <DonutChart data={pieData} />
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '140px', overflowY: 'auto', paddingRight: '4px' }}>
                    {pieData.map(d => (
                      <div key={d.ticker} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: d.color }}></div>
                          <span style={{ color: 'white', fontSize: '13px', fontWeight: 600 }}>{d.ticker}</span>
                        </div>
                        <span style={{ color: '#a3a3a3', fontSize: '12px', fontWeight: 500 }}>{d.pct.toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* TABEL ASET */}
              <div style={{ borderRadius: '20px', border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden', background: 'linear-gradient(180deg, #0f1014 0%, #0c0e12 100%)', boxShadow: '0 4px 24px rgba(0,0,0,0.4)' }}>

                {/* Header */}
                <div className="holdings-header" style={{ padding: '22px 28px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
                  <div>
                    <h3 style={{ color: '#fff', fontSize: '17px', fontWeight: 800, margin: 0, letterSpacing: '-0.3px' }}>Holdings</h3>
                    <span style={{ color: '#6b7280', fontSize: '13px', marginTop: '2px', display: 'block' }}>{assets.length} aset terdaftar</span>
                  </div>
                  <button
                    onClick={() => setShowAddModal(true)}
                    style={{ background: 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)', color: '#000', border: 'none', borderRadius: '10px', padding: '10px 20px', fontSize: '13px', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 14px rgba(74,222,128,0.25)', letterSpacing: '-0.2px' }}
                  >+ Tambah Aset</button>
                </div>

                {/* Column Headers */}
                <div className="col-headers" style={{ alignItems: 'center', padding: '10px 28px', gap: '16px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  {[['Aset', 2], ['Harga Live', 1.5], ['Holdings / AVG', 1.5], ['Nilai Aset', 1.5], ['Unrealized PNL', 1.5]].map(([h, f]) => (
                    <div key={h} style={{ flex: f, color: '#4b5563', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.7px' }}>{h}</div>
                  ))}
                  <div style={{ flexShrink: 0, width: '98px' }} />
                </div>

                <div style={{ padding: '10px 8px 18px' }}>

                  {[
                    { type: 'crypto',   label: 'Crypto',      color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  list: assets.filter(a => a.type === 'crypto') },
                    { type: 'saham',    label: 'Saham IDX',   color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', list: assets.filter(a => a.type === 'saham') },
                    { type: 'cashstable', label: 'Cash & Stable', color: '#10b981', bg: 'rgba(16,185,129,0.1)', list: assets.filter(a => a.type === 'stable' || a.type === 'cash_idr') },
                  ].map(({ type, label, color, bg, list }) => list.length > 0 && (
                    <div key={type}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 10px 10px' }}>
                        <span style={{ backgroundColor: bg, color, fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', padding: '4px 10px', borderRadius: '6px' }}>{label}</span>
                        <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, rgba(255,255,255,0.06), transparent)' }} />
                        <span style={{ color: '#374151', fontSize: '11px', fontWeight: 600 }}>{list.length} aset</span>
                      </div>
                      {list.map(asset => (
                        <DataRow
                          key={asset.id} asset={asset}
                          hargaLiveUSD={asset.type === 'crypto' ? hargaMap[asset.simbol]?.usd : undefined}
                          hargaLiveIDR={asset.type === 'saham' ? hargaSaham[asset.ticker] : undefined}
                          kursIdr={kursIdr} totalNetWorthUSD={grandTotalUSD}
                          onEdit={setEditingAsset} onDelete={setDeleteConfirm}
                        />
                      ))}
                    </div>
                  ))}

                  {assets.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '60px 24px' }}>
                      <div style={{ fontSize: '40px', marginBottom: '16px', opacity: 0.4 }}>◈</div>
                      <div style={{ color: '#6b7280', fontSize: '15px', fontWeight: 600 }}>Belum ada aset</div>
                      <div style={{ color: '#374151', fontSize: '13px', marginTop: '6px' }}>Klik "+ Tambah Aset" untuk mulai tracking</div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {activePage === 'ai' && (
            <AIConsultant
              assets={assets}
              hargaMap={hargaMap}
              hargaSaham={hargaSaham}
              kursIdr={kursIdr}
              grandTotalUSD={grandTotalUSD}
              grandTotalIDR={grandTotalIDR}
              overallPnlUSD={overallPnlUSD}
              overallPnlPersen={overallPnlPersen}
              marketData={marketData}
            />
          )}
        </div>
      </div>

      {showAddModal && <AddAssetModal onSave={handleAddAsset} onClose={() => setShowAddModal(false)} />}
      {deleteConfirm && (
        <ConfirmDeleteModal
          asset={deleteConfirm}
          onConfirm={() => { handleDeleteAsset(deleteConfirm.id); setDeleteConfirm(null); }}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}

      {/* MODAL EDIT */}
      {editingAsset && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: '#141414', border: '1px solid #262626', borderRadius: '16px', padding: '32px', width: '360px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
            <h2 style={{ color: 'white', fontSize: '20px', fontWeight: 700, margin: '0 0 24px' }}>Edit {editingAsset.ticker}</h2>
            {editingAsset.type !== 'cash_idr' && (
              <>
                <label style={{ color: '#a3a3a3', fontSize: '13px', fontWeight: 500 }}>Average Beli ({editingAsset.type === 'saham' ? 'IDR' : 'USD'})</label>
                <input type="number" defaultValue={editingAsset.avg} id="editAvg" style={styles.modalInput} />
              </>
            )}
            <label style={{ color: '#a3a3a3', fontSize: '13px', fontWeight: 500, marginTop: '16px', display: 'block' }}>
              Jumlah ({editingAsset.type === 'saham' ? 'Lembar' : editingAsset.type === 'cash_idr' ? 'IDR' : 'Koin'})
            </label>
            <input type="number" defaultValue={editingAsset.jumlah} id="editJumlah" style={styles.modalInput} />
            <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
              <button onClick={() => setEditingAsset(null)} style={{ flex: 1, backgroundColor: '#262626', color: 'white', border: 'none', borderRadius: '8px', padding: '12px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>Batal</button>
              <button
                onClick={() => handleSave(
                  editingAsset.id,
                  parseFloat(document.getElementById('editAvg')?.value || editingAsset.avg),
                  parseFloat(document.getElementById('editJumlah').value)
                )}
                style={{ flex: 1, backgroundColor: 'white', color: 'black', border: 'none', borderRadius: '8px', padding: '12px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// STYLES
// ============================================
const styles = {
  sidebar: { width: 260, backgroundColor: '#0a0a0a', borderRight: '1px solid #1f1f1f', display: 'flex', flexDirection: 'column' },
  sidebarLogo: { height: 88, display: 'flex', alignItems: 'center', gap: '12px', padding: '0 24px', borderBottom: '1px solid #1f1f1f' },
  sidebarMenu: { padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 6, flex: 1 },
  menuItemActive: { padding: '14px 16px', backgroundColor: '#1a1a1a', color: 'white', borderRadius: '10px', cursor: 'pointer' },
  menuItem: { padding: '14px 16px', color: '#737373', borderRadius: '10px', cursor: 'pointer' },
  header: { display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 32 },
  headerTitle: { color: 'white', fontSize: 32, fontWeight: 800, margin: 0, letterSpacing: '-0.5px' },
  summaryCard: { backgroundColor: '#141414', border: '1px solid #262626', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center' },
  periodRow: { display: 'flex', gap: 4, backgroundColor: '#1a1a1a', padding: '4px', borderRadius: '8px' },
  periodBtn: { backgroundColor: 'transparent', color: '#737373', border: 'none', borderRadius: '6px', padding: '4px 10px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' },
  periodBtnActive: { backgroundColor: '#333', color: 'white' },
  marketCardMini: { backgroundColor: '#141414', borderRadius: '12px', padding: '12px 16px', border: '1px solid #262626', display: 'flex', flexDirection: 'column', justifyContent: 'center' },
  modernRow: { display: 'flex', padding: '16px 12px', alignItems: 'center', borderBottom: '1px solid #1f1f1f', borderRadius: '10px', margin: '4px 0' },
  actionBtn: { backgroundColor: '#1a1a1a', color: 'white', border: '1px solid #333', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
  modalInput: { width: '100%', backgroundColor: '#0a0a0a', border: '1px solid #333', borderRadius: '10px', padding: '12px 16px', color: 'white', fontSize: '16px', outline: 'none', marginTop: '8px', boxSizing: 'border-box', fontWeight: 500 },
};

export default App;