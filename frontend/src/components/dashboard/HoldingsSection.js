import { useState } from 'react';
import { formatUSD, formatIDR } from '../../utils/helpers';

const COMMODITY_EMOJI = {
  GOLD:'🥇', XAU:'🥇', XAG:'🥈', BRENT:'🛢️', WTI:'🛢️', OIL:'🛢️',
  NG:'💨', HG:'⚙️', PLAT:'🔷', PALL:'🔹', CORN:'🌽', WHEAT:'🌾',
  COFFEE:'☕', COCOA:'🍫', SUGAR:'🍬', COTTON:'🪡', ALU:'⚙️',
};

function AssetIcon({ asset }) {
  const [err, setErr] = useState(false);
  const tk = asset.ticker?.toUpperCase() || '';
  const simbol = (asset.simbol || tk).replace('.JK', '');
  let src = null;
  if (!err) {
    if (asset.thumb) {
      src = asset.thumb;
    } else if (asset.type === 'saham_us') {
      src = `https://financialmodelingprep.com/image-stock/${tk}.png`;
    } else if (asset.type === 'saham') {
      src = `https://financialmodelingprep.com/image-stock/${simbol}.png`;
    }
  }
  if (src) return <img src={src} alt={tk} style={{ width: '100%', height: '100%', objectFit: 'contain' }} onError={() => setErr(true)} />;
  const emoji = COMMODITY_EMOJI[tk];
  if (emoji) return <span style={{ fontSize: '18px', lineHeight: 1 }}>{emoji}</span>;
  return <span>{tk.substring(0, 4)}</span>;
}

function DataRow({ asset, hargaLiveUSD, hargaLiveIDR, kursIdr, totalNetWorthUSD, onRowClick, isLast, t }) {
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
    saham:     { color: '#3b82f6', bg: 'rgba(79,124,255,0.12)'  },
    saham_us:  { color: '#ec4899', bg: 'rgba(236,72,153,0.15)'  },
    komoditas: { color: '#eab308', bg: 'rgba(234,179,8,0.15)'   },
    stable:    { color: '#10b981', bg: 'rgba(16,185,129,0.15)'  },
    cash_idr:  { color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)'  },
  }[asset.type] || { color: '#94A3B8', bg: 'rgba(115,115,115,0.15)' };

  const handleClick = (e) => onRowClick(asset, { x: e.clientX, y: e.clientY });

  return (
    <>
      <div
        className="asset-row-desktop"
        onClick={handleClick}
        style={{ alignItems: 'center', padding: '13px 20px', borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.035)', gap: '12px', transition: 'background 0.18s' }}
      >
        <div style={{ flex: 2.4, display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: typeConfig.bg, color: typeConfig.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '10px', flexShrink: 0, overflow: 'hidden', border: `1px solid ${typeConfig.color}22` }}>
            <AssetIcon asset={asset} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ color: '#ffffff', fontWeight: 700, fontSize: '14px', letterSpacing: '-0.2px' }}>{asset.ticker}</div>
            <div style={{ color: '#484848', fontSize: '11px', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{asset.nama}</div>
            {!isCashIDR && (
              <div style={{ color: '#64748B', fontSize: '11px', marginTop: '3px', fontFamily: 'monospace' }}>
                {hargaAcuan ? (isSaham ? formatIDR(hargaAcuan) : formatUSD(hargaAcuan)) : '—'}
              </div>
            )}
          </div>
        </div>

        <div style={{ flex: 1.4, minWidth: 0 }}>
          {isCashIDR ? (
            <div style={{ color: '#e5e5e5', fontWeight: 500, fontSize: '13px' }}>{formatIDR(asset.jumlah).replace('Rp ', '')} <span style={{ color: '#444', fontSize: '11px', fontWeight: 400 }}>IDR</span></div>
          ) : (
            <>
              <div style={{ color: '#d4d4d4', fontWeight: 500, fontSize: '13px' }}>
                {(isSaham ? asset.jumlah / 100 : asset.jumlah).toLocaleString()}
                <span style={{ color: '#444', fontSize: '11px', fontWeight: 400, marginLeft: '4px' }}>{isSaham ? t('sheet') : asset.ticker}</span>
              </div>
              <div style={{ color: '#3e3e3e', fontSize: '11px', marginTop: '2px' }}>Avg {isSaham ? formatIDR(asset.avg) : formatUSD(asset.avg)}</div>
            </>
          )}
        </div>

        <div style={{ flex: 1.4 }}>
          <div style={{ color: '#e5e5e5', fontWeight: 600, fontSize: '13px' }}>
            {nilaiSekarang ? (isSaham || isCashIDR ? formatIDR(nilaiSekarang) : formatUSD(nilaiSekarang)) : '—'}
          </div>
          <div style={{ color: '#424242', fontSize: '11px', marginTop: '1px' }}>
            {nilaiSekarang ? (isSaham || isCashIDR ? formatUSD(nilaiSekarang / kursIdr) : formatIDR(nilaiSekarang * kursIdr)) : ''}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '5px' }}>
            <div style={{ width: '52px', height: '2px', backgroundColor: '#111F35', borderRadius: '999px', overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(parseFloat(pct), 100)}%`, height: '100%', background: `linear-gradient(90deg, ${typeConfig.color}55, ${typeConfig.color})`, borderRadius: '999px' }} />
            </div>
            <span style={{ fontSize: '10px', color: '#383838', fontWeight: 600 }}>{pct}%</span>
          </div>
        </div>

        <div style={{ flex: 1.3 }}>
          {!isStable && !isCashIDR && pnl !== null ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
              <div style={{ color: profit ? '#10B981' : '#EF4444', fontWeight: 700, fontSize: '13px', letterSpacing: '-0.3px' }}>
                {profit ? '+' : ''}{isSaham ? formatIDR(pnl) : formatUSD(pnl)}
              </div>
              <span className={profit ? 'badge-up' : 'badge-down'} style={{ fontSize: '10px', padding: '1px 7px' }}>
                {profit ? '↑' : '↓'} {Math.abs(pnlPersen).toFixed(2)}%
              </span>
            </div>
          ) : <span style={{ color: '#242424', fontSize: '13px' }}>—</span>}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, width: '24px', color: '#2e2e2e', fontSize: '16px' }}>⋯</div>
      </div>

      <div className="asset-row-mobile" onClick={handleClick}>
        <div className="asset-row-mobile-top">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: typeConfig.bg, color: typeConfig.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '10px', flexShrink: 0, overflow: 'hidden', border: `1px solid ${typeConfig.color}22` }}>
              <AssetIcon asset={asset} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: '14px' }}>{asset.ticker}</div>
              <div style={{ color: '#525252', fontSize: '11px', marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{asset.nama}</div>
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ color: '#e5e5e5', fontWeight: 600, fontSize: '14px' }}>{nilaiSekarang ? (isSaham || isCashIDR ? formatIDR(nilaiSekarang) : formatUSD(nilaiSekarang)) : '—'}</div>
            <div style={{ color: '#64748B', fontSize: '11px', marginTop: '2px' }}>{nilaiSekarang ? (isSaham || isCashIDR ? formatUSD(nilaiSekarang / kursIdr) : formatIDR(nilaiSekarang * kursIdr)) : ''}</div>
          </div>
        </div>
        <div className="asset-row-mobile-bottom">
          <div className="asset-row-mobile-stats">
            {!isCashIDR && (
              <div>
                <div style={{ color: '#64748B', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '2px' }}>{t('price_live')}</div>
                <div style={{ color: '#e5e5e5', fontSize: '12px', fontWeight: 500 }}>{hargaAcuan ? (isSaham ? formatIDR(hargaAcuan) : formatUSD(hargaAcuan)) : '—'}</div>
              </div>
            )}
            <div>
              <div style={{ color: '#64748B', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '2px' }}>{t('holdings')}</div>
              <div style={{ color: '#e5e5e5', fontSize: '12px', fontWeight: 500 }}>{isCashIDR ? formatIDR(asset.jumlah) : `${(isSaham ? asset.jumlah / 100 : asset.jumlah).toLocaleString()} ${isSaham ? t('sheet') : asset.ticker}`}</div>
            </div>
            {!isStable && !isCashIDR && pnl !== null && (
              <div>
                <div style={{ color: '#64748B', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '2px' }}>PNL</div>
                <div style={{ color: profit ? '#10B981' : '#EF4444', fontSize: '12px', fontWeight: 600 }}>{profit ? '+' : ''}{isSaham ? formatIDR(pnl) : formatUSD(pnl)}</div>
                <span className={profit ? 'badge-up' : 'badge-down'} style={{ marginTop: '2px', fontSize: '10px', padding: '1px 7px' }}>
                  {profit ? '↑' : '↓'} {Math.abs(pnlPersen).toFixed(2)}%
                </span>
              </div>
            )}
          </div>
          <span style={{ color: '#454545', fontSize: '16px', flexShrink: 0, padding: '4px 6px' }}>⋯</span>
        </div>
      </div>
    </>
  );
}

export default function HoldingsSection({ assets, getLivePrice, grandTotalUSD, kursIdr, handleRowClick, setShowAddModal, holdingsRef, t }) {
  const categories = [
    { type: 'crypto',     label: t('cat_crypto'),    color: '#F59E0B', list: assets.filter(a => a.type === 'crypto') },
    { type: 'saham_us',   label: t('cat_saham_us'),  color: '#EC4899', list: assets.filter(a => a.type === 'saham_us') },
    { type: 'saham',      label: t('cat_saham_idx'), color: '#3B82F6', list: assets.filter(a => a.type === 'saham') },
    { type: 'komoditas',  label: t('cat_komoditas'), color: '#EAB308', list: assets.filter(a => a.type === 'komoditas') },
    { type: 'cashstable', label: t('cash_stable'),   color: '#10B981', list: assets.filter(a => a.type === 'stable' || a.type === 'cash_idr') },
  ];

  return (
    <div ref={holdingsRef} style={{ borderRadius: '16px', border: '1px solid rgba(79,124,255,0.12)', overflow: 'hidden', background: '#111C30', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
      <div className="holdings-header" style={{ padding: '16px 24px', borderBottom: '1px solid rgba(79,124,255,0.06)' }}>
        <div>
          <h3 style={{ color: '#F8FAFC', fontSize: '15px', fontWeight: 800, margin: 0, letterSpacing: '-0.2px' }}>{t('holdings')}</h3>
          <span style={{ color: '#4A5568', fontSize: '11px', marginTop: '3px', display: 'block' }}>{assets.length} {t('registered_assets')}</span>
        </div>
        <button onClick={() => setShowAddModal(true)} style={{ background: 'linear-gradient(135deg, #06B6D4, #3B82F6)', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(6,182,212,0.25)', letterSpacing: '0.3px' }}>
          + Add Asset
        </button>
      </div>
      <div style={{ paddingBottom: '18px' }}>
        {categories.map(({ type, label, color, list }) => (
          <div key={type}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 20px 4px' }}>
              <div style={{ width: '3px', height: '12px', borderRadius: '2px', backgroundColor: color, flexShrink: 0 }} />
              <span style={{ color, fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.8 }}>{label}</span>
              <span style={{ color: '#1A2C42', fontSize: '10px', fontWeight: 600, marginLeft: 'auto' }}>{list.length}</span>
            </div>
            {list.length > 0 ? list.map((asset, idx) => (
              <DataRow
                key={asset.id}
                asset={asset}
                isLast={idx === list.length - 1}
                hargaLiveUSD={['crypto', 'komoditas', 'saham_us'].includes(asset.type) ? getLivePrice(asset) : undefined}
                hargaLiveIDR={asset.type === 'saham' ? getLivePrice(asset) : undefined}
                kursIdr={kursIdr}
                totalNetWorthUSD={grandTotalUSD}
                onRowClick={handleRowClick}
                t={t}
              />
            )) : (
              <div style={{ padding: '10px 28px 20px' }}>
                <div style={{ padding: '16px', border: '1px dashed rgba(79,124,255,0.08)', borderRadius: '10px', textAlign: 'center', color: '#4A5568', fontSize: '11px', fontWeight: 500 }}>
                  {t('no_assets')} {label}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
