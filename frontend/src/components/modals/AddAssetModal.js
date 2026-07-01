import { useState, useRef, useEffect } from 'react';
import { API_BASE, fetchWithRetry } from '../../utils/api';
import { formatIDR } from '../../utils/helpers';

function SearchResultItem({ item, onSelect }) {
  const typeColor = { crypto: '#f59e0b', stock_idx: '#3b82f6', stock_us: '#ec4899', stock: '#a3a3a3', index: '#10b981' }[item.type] || '#737373';
  const typeLabel = { crypto: 'Crypto', stock_idx: 'IDX', stock_us: 'US', stock: item.exchange || 'Stock', index: 'Index' }[item.type] || item.type;

  return (
    <div
      onClick={() => onSelect(item)}
      style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #1a1a1a', transition: 'background 0.15s' }}
      onMouseEnter={e => e.currentTarget.style.background = '#111F35'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      {item.thumb ? <img src={item.thumb} alt="" style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover' }} /> : <div style={{ width: 22, height: 22, borderRadius: '50%', backgroundColor: typeColor + '33', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', color: typeColor, fontWeight: 800 }}>{item.symbol?.substring(0, 2)}</div>}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: '#fff', fontWeight: 700, fontSize: '13px' }}>{item.symbol}</div>
        <div style={{ color: '#94A3B8', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
      </div>
      <span style={{ fontSize: '10px', fontWeight: 700, color: typeColor, backgroundColor: typeColor + '22', padding: '2px 7px', borderRadius: '4px', flexShrink: 0 }}>{typeLabel}</span>
      {item.market_cap_rank && <span style={{ fontSize: '10px', color: '#94A3B8' }}>#{item.market_cap_rank}</span>}
    </div>
  );
}

export default function AddAssetModal({ onSave, onClose, t }) {
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
      } catch (e) { setSearchResults([]); }
      setSearching(false);
    }, 350);
  };

  const handleSelectResult = async (item) => {
    setShowDropdown(false); setSearchResults([]);
    const typeMap = { crypto: 'crypto', stock_idx: 'saham', stock_us: 'saham_us', stock: 'saham_us', index: 'saham_us' };
    const detectedType = isTypeLocked ? form.type : (typeMap[item.type] || form.type);
    const simbol = item.type === 'crypto' ? item.id : item.id;

    set('ticker', item.symbol); set('nama', item.name || item.symbol);
    set('type', detectedType); set('simbol', simbol); set('thumb', item.thumb || '');

    setLoading(true); setInfo(t('fetching_live'));
    try {
      const res  = await fetchWithRetry(`${API_BASE}/api/price/${encodeURIComponent(item.symbol)}?type=${detectedType}`);
      const data = await res.json();
      if (data.error) setInfo(`⚠️ ${data.error}`);
      else {
        const harga = data.price ?? 0;
        set('avg', harga); setFetchedLivePrice(harga);
        if (data.coingecko_id) set('simbol', data.coingecko_id);
        if (data.name && !form.nama) set('nama', data.name);
        if (data.thumb) set('thumb', data.thumb);
        setInfo(`✅ Live: ${data.currency === 'IDR' ? formatIDR(harga) : '$' + harga.toLocaleString(undefined, { maximumFractionDigits: 6 })} (${data.change >= 0 ? '+' : ''}${data.change?.toFixed(2)}% 24h)`);
      }
    } catch (e) { setInfo(`❌ Error: ${e.message}`); }
    setLoading(false);
  };

  const cekHargaLive = async () => {
    if (!form.ticker) return setInfo(t('err_ticker_empty'));
    setLoading(true); setInfo(t('searching_market')); setShowDropdown(false);
    try {
      const typeQuery = isTypeLocked ? `?type=${form.type}` : '';
      const res  = await fetchWithRetry(`${API_BASE}/api/price/${encodeURIComponent(form.ticker)}${typeQuery}`);
      const data = await res.json();

      if (data.error) {
        const sRes  = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(form.ticker)}${typeQuery.replace('?', '&')}`);
        const sData = await sRes.json();
        if (sData.results?.length > 0) {
          setSearchResults(sData.results); setShowDropdown(true); setInfo(t('err_select_from_results'));
        } else setInfo(`❌ "${form.ticker}" ${t('err_not_found')}`);
      } else {
        const harga = data.price ?? 0;
        set('avg', harga); setFetchedLivePrice(harga);
        if (data.coingecko_id) set('simbol', data.coingecko_id);
        if (data.name) set('nama', data.name);
        if (data.thumb) set('thumb', data.thumb);
        if (!isTypeLocked) {
          if (data.type === 'crypto') set('type', 'crypto');
          if (data.type === 'stock_idx') set('type', 'saham');
          if (data.type === 'stock_us' || data.type === 'stock') set('type', 'saham_us');
        }
        setInfo(`✅ ${data.name || form.ticker}: ${data.currency === 'IDR' ? formatIDR(harga) : '$' + harga.toLocaleString(undefined, { maximumFractionDigits: 6 })} (${data.change >= 0 ? '+' : ''}${data.change?.toFixed(2)}% 24h)`);
      }
    } catch (e) { setInfo(`❌ Error: ${e.message}`); }
    setLoading(false);
  };

  useEffect(() => {
    const handleClick = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowDropdown(false); };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSubmit = () => {
    if (!form.nama || !form.ticker || !form.jumlah) return;
    if (!isCashIDR && !form.avg) return;
    onSave({ nama: form.nama, ticker: form.ticker.toUpperCase(), simbol: form.simbol?.trim() || null, type: form.type, avg: isCashIDR ? 1 : parseFloat(form.avg), jumlah: parseFloat(form.jumlah), thumb: form.thumb || null }, fetchedLivePrice);
  };

  const typeMap = [['crypto', t('cat_crypto'), '#f59e0b'], ['saham', t('cat_saham_idx'), '#3b82f6'], ['saham_us', t('cat_saham_us'), '#ec4899'], ['komoditas', t('cat_komoditas'), '#eab308'], ['stable', t('stablecoin'), '#10b981'], ['cash_idr', t('cash_idr'), '#8b5cf6']];
  const labelStyle = { color: '#94A3B8', fontSize: '11px', fontWeight: 700, display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.6px' };
  const inputStyle = { width: '100%', backgroundColor: '#0d0d0d', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '12px 16px', color: '#e5e5e5', fontSize: '14px', outline: 'none', boxSizing: 'border-box', fontWeight: 500 };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ backgroundColor: '#111C30', border: '1px solid #262626', borderRadius: '20px', width: '520px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 32px 80px rgba(0,0,0,0.8)' }}>
        <div style={{ padding: '24px 28px 20px', borderBottom: '1px solid #1f1f1f', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ color: '#fff', fontSize: '19px', fontWeight: 800, margin: 0, letterSpacing: '-0.3px' }}>{t('add_asset')}</h2>
          </div>
          <button onClick={onClose} style={{ width: '34px', height: '34px', borderRadius: '10px', backgroundColor: 'rgba(15,25,41,0.8)', border: '1px solid #2a2a2a', color: '#94A3B8', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={labelStyle}>{t('asset_type')} <span style={{ color: '#383838', fontWeight: 400, textTransform: 'none' }}>{t('click_to_lock')}</span></label>
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
              <label style={labelStyle}>{t('ticker')}</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input value={form.ticker} onChange={e => handleTickerInput(e.target.value)} onFocus={() => searchResults.length > 0 && setShowDropdown(true)} placeholder="PUMP / AAPL" style={{ ...inputStyle, textTransform: 'uppercase', flex: 1 }} autoComplete="off" />
                <button onClick={cekHargaLive} disabled={loadingHarga} style={{ backgroundColor: 'rgba(15,25,41,0.8)', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '0 12px', color: loadingHarga ? '#383838' : '#10B981', cursor: loadingHarga ? 'default' : 'pointer', fontWeight: 'bold', flexShrink: 0, fontSize: '14px' }}>{loadingHarga ? '⏳' : '🔎'}</button>
              </div>

              {showDropdown && searchResults.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: '#111C30', border: '1px solid #2a2a2a', borderRadius: '12px', marginTop: '4px', zIndex: 999, maxHeight: '260px', overflowY: 'auto', boxShadow: '0 16px 40px rgba(0,0,0,0.7)' }}>
                  {searching && <div style={{ padding: '10px 14px', color: '#94A3B8', fontSize: '12px' }}>{t('searching_market')}</div>}
                  {searchResults.map((item, i) => <SearchResultItem key={`${item.type}:${item.symbol}:${i}`} item={item} onSelect={handleSelectResult} />)}
                </div>
              )}
            </div>

            <div>
              <label style={labelStyle}>{t('asset_name')}</label>
              <input value={form.nama} onChange={e => set('nama', e.target.value)} placeholder={t('auto_filled')} style={inputStyle} />
            </div>
          </div>

          {infoHarga && (
            <div style={{ color: infoHarga.startsWith('✅') ? '#10B981' : '#EF4444', fontSize: '12px', fontWeight: 'bold', padding: '8px 12px', backgroundColor: infoHarga.startsWith('✅') ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', borderRadius: '6px', marginTop: '-10px' }}>{infoHarga}</div>
          )}

          {['saham', 'saham_us', 'komoditas'].includes(form.type) && (
            <div>
              <label style={labelStyle}>{t('yahoo_symbol')}</label>
              <input value={form.simbol} onChange={e => set('simbol', e.target.value)} placeholder={t('eg_bbca')} style={inputStyle} />
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: isCashIDR ? '1fr' : '1fr 1fr', gap: '14px' }}>
            {!isCashIDR && (
              <div>
                <label style={labelStyle}>{t('avg_buy_price')} ({form.type === 'saham' ? 'IDR' : 'USD'})</label>
                <input type="number" value={form.avg} onChange={e => set('avg', e.target.value)} placeholder={t('auto_filled')} style={inputStyle} />
              </div>
            )}
            <div>
              <label style={labelStyle}>{t('amount')} ({form.type === 'saham' ? t('sheet') : form.type === 'cash_idr' ? t('rupiah') : t('unit')})</label>
              <input type="number" value={form.jumlah} onChange={e => set('jumlah', e.target.value)} placeholder="0" style={inputStyle} />
            </div>
          </div>
        </div>

        <div style={{ padding: '0 28px 28px', display: 'flex', gap: '10px' }}>
          <button onClick={onClose} style={{ flex: 1, backgroundColor: '#111F35', color: '#CBD5E1', border: '1px solid #262626', borderRadius: '10px', padding: '13px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>{t('cancel')}</button>
          <button onClick={handleSubmit} style={{ flex: 2, backgroundColor: '#16a34a', color: '#ffffff', border: 'none', borderRadius: '10px', padding: '13px', fontSize: '14px', fontWeight: 800, cursor: 'pointer' }}>{t('add_asset')}</button>
        </div>
      </div>
    </div>
  );
}
