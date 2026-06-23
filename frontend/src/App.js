import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import './App.css';

import { useLocalStorage } from './hooks/useLocalstorage';
import { formatUSD, formatIDR, renderAIText } from './utils/helpers';
import { NetWorthTrendCard, NetWorthDetailPage } from './networthtrend';
import Sidebar from './components/Sidebar';
import MarketExplorerPage from './components/MarketExplorerPage';
import MarketOverviewPage from './components/MarketOverviewPage';
import WatchlistPage from './components/WatchlistPage';
import { AssetClassCard, PositionsCard } from './components/CurrentAllocationCard';
import MultiChartPage from './components/MultiChartPage';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// ==========================================
// KAMUS BAHASA
// ==========================================
const DICTIONARY = {
  id: {
    dashboard: 'Dashboard', ai_consultant: 'Konsultan AI', system_online: 'Sistem Online', online: 'Online',
    total_net_worth: 'Total Kekayaan', overall_pnl: 'Total PnL', day_pnl: 'PnL 1 Hari',
    pnl_breakdown: 'Rincian PnL', current_allocation: 'Alokasi Saat Ini', holdings: 'Aset Dimiliki',
    add_asset: '+ Tambah Aset', no_assets: 'Belum ada aset', save: 'Simpan', cancel: 'Batal',
    delete: 'Hapus', edit: 'Edit', price_live: 'Harga Live', registered_assets: 'Aset Terdaftar',
    investor_account: 'Akun Investor', analytics: 'Analitik', ai_chat: 'Chat AI', market_news: 'Berita Pasar',
    market_explorer: 'Market Explorer', market_overview: 'Market Overview', search_asset: 'Cari koin atau saham...',
    all: 'Semua', no_news_found: 'Belum ada berita untuk aset ini.', no_assets_news: 'Tambah aset ke portofolio untuk melihat berita.',
    crypto_usd: 'Kripto (USD)', commodities_usd: 'Komoditas (USD)', stock_idx_idr: 'Saham IDX (IDR)',
    stock_us_usd: 'Saham US (USD)', asset: 'Aset', holdings_avg: 'Holdings / AVG',
    asset_value: 'Nilai Aset', unrealized_pnl: 'Unrealized PNL', cash_stable: 'Cash & Stable',
    assets_count: 'aset', top_up: 'Top Up', your_current_avg: 'Avg kamu saat ini:',
    new_buy_price: 'Harga Beli Baru', amount_added: 'Penambahan Jumlah', sheet: 'Lembar',
    coin: 'Koin', rupiah: 'Rupiah', unit: 'Unit', pegged: 'Pegged', asset_type: 'Tipe Aset',
    click_to_lock: '(Klik untuk mengunci filter pencarian)', ticker: 'Ticker', asset_name: 'Nama Aset',
    auto_filled: 'Otomatis terisi', yahoo_symbol: 'Simbol Yahoo Finance (Opsional)', avg_buy_price: 'Harga Beli AVG',
    amount: 'Jumlah', searching_market: '⏳ Mencari di market...', fetching_live: '⏳ Mengambil harga live...',
    ai_welcome_1: 'Halo! Saya **TotalFund AI**, konsultan keuangan personal kamu. ✦\n\nPortfolio kamu saat ini senilai',
    ai_welcome_2: 'dengan PNL',
    ai_welcome_3: 'Tanyakan apa saja tentang portfolio, pasar, atau strategi investasimu!',
    cat_crypto: 'Kripto', cat_saham_us: 'Saham US', cat_saham_idx: 'Saham IDX', cat_komoditas: 'Komoditas', stablecoin: 'Stablecoin', cash_idr: 'Cash IDR',
    set_username: 'Set Username', change_profile_pic: 'Klik untuk ubah foto profil',
    err_ticker_empty: '⚠️ Tulis Ticker!', err_select_from_results: '⚠️ Pilih dari hasil di bawah.', err_not_found: 'tidak ditemukan.',
    eg_bbca: 'Misal: BBCA.JK', err_server: 'Maaf, terjadi kesalahan.', err_network: '⚠️ Tidak bisa terhubung ke server.',
    edit_asset: 'Edit Aset', delete_asset: 'Hapus Aset', asset_actions: 'Aksi Aset',
    open_account_settings: 'Buka pengaturan akun', account_settings: 'Pengaturan Akun', email: 'Email',
    email_placeholder: 'nama@email.com', full_name: 'Nama', close: 'Tutup', view_assets: 'Lihat Aset'
  },
  en: {
    dashboard: 'Dashboard', ai_consultant: 'AI Consultant', system_online: 'System Online', online: 'Online',
    total_net_worth: 'Total Net Worth', overall_pnl: 'Overall PnL', day_pnl: '1-Day PnL',
    pnl_breakdown: 'PnL Breakdown', current_allocation: 'Current Allocation', holdings: 'Holdings',
    add_asset: '+ Add Asset', no_assets: 'No assets in', save: 'Save', cancel: 'Cancel',
    delete: 'Delete', edit: 'Edit', price_live: 'Live Price', registered_assets: 'Registered Assets',
    investor_account: 'Investor Account', analytics: 'Analytics', ai_chat: 'AI Chat', market_news: 'Market News',
    market_explorer: 'Market Explorer', market_overview: 'Market Overview', search_asset: 'Search coin or stock...',
    all: 'All', no_news_found: 'No news found for these assets.', no_assets_news: 'Add assets to your portfolio to see news.',
    crypto_usd: 'Crypto (USD)', commodities_usd: 'Commodities (USD)', stock_idx_idr: 'IDX Stock (IDR)',
    stock_us_usd: 'US Stock (USD)', asset: 'Asset', holdings_avg: 'Holdings / AVG',
    asset_value: 'Asset Value', unrealized_pnl: 'Unrealized PNL', cash_stable: 'Cash & Stable',
    assets_count: 'assets', top_up: 'Top Up', your_current_avg: 'Your current avg:',
    new_buy_price: 'New Buy Price', amount_added: 'Amount Added', sheet: 'Shares',
    coin: 'Coins', rupiah: 'Rupiah', unit: 'Units', pegged: 'Pegged', asset_type: 'Asset Type',
    click_to_lock: '(Click to lock search filter)', ticker: 'Ticker', asset_name: 'Asset Name',
    auto_filled: 'Auto-filled', yahoo_symbol: 'Yahoo Finance Symbol (Optional)', avg_buy_price: 'Avg Buy Price',
    amount: 'Amount', searching_market: '⏳ Searching market...', fetching_live: '⏳ Fetching live price...',
    ai_welcome_1: 'Hello! I am **TotalFund AI**, your personal financial consultant. ✦\n\nYour portfolio is currently worth',
    ai_welcome_2: 'with a PNL of',
    ai_welcome_3: 'Ask me anything about your portfolio, markets, or investment strategy!',
    cat_crypto: 'Crypto', cat_saham_us: 'US Stock', cat_saham_idx: 'IDX Stock', cat_komoditas: 'Commodities', stablecoin: 'Stablecoin', cash_idr: 'Cash IDR',
    set_username: 'Set Username', change_profile_pic: 'Click to change profile pic',
    err_ticker_empty: '⚠️ Enter Ticker!', err_select_from_results: '⚠️ Select from results below.', err_not_found: 'not found.',
    eg_bbca: 'e.g., AAPL', err_server: 'Sorry, an error occurred.', err_network: '⚠️ Cannot connect to server.',
    edit_asset: 'Edit Asset', delete_asset: 'Delete Asset', asset_actions: 'Asset Actions',
    open_account_settings: 'Open account settings', account_settings: 'Account Settings', email: 'Email',
    email_placeholder: 'name@email.com', full_name: 'Name', close: 'Close', view_assets: 'View Assets'
  },
  zh: {
    dashboard: '我的投资组合', ai_consultant: 'AI 顾问', system_online: '系统在线', online: '在线',
    total_net_worth: '净资产总额', overall_pnl: '总盈亏', day_pnl: '单日盈亏',
    pnl_breakdown: '盈亏明细', current_allocation: '当前资产配置', holdings: '持仓',
    add_asset: '+ 添加资产', no_assets: '暂无资产', save: '保存', cancel: '取消',
    delete: '删除', edit: '编辑', price_live: '实时价格', registered_assets: '已注册资产',
    investor_account: '投资者账户', analytics: '分析', ai_chat: 'AI 聊天', market_news: '市场新闻',
    market_explorer: '市场资源管理器', market_overview: '市场概览', search_asset: '搜索硬币或股票...',
    all: '全部', no_news_found: '未找到相关新闻。', no_assets_news: '在您的投资组合中添加资产以查看新闻。',
    crypto_usd: '加密货币 (USD)', commodities_usd: '大宗商品 (USD)', stock_idx_idr: '印尼股票 (IDR)',
    stock_us_usd: '美股 (USD)', asset: '资产', holdings_avg: '持仓 / 均价',
    asset_value: '资产价值', unrealized_pnl: '未实现盈亏', cash_stable: '现金与稳定币',
    assets_count: '资产', top_up: '充值', your_current_avg: '您当前的均价：',
    new_buy_price: '新买入价', amount_added: '增加数量', sheet: '股',
    coin: '币', rupiah: '印尼盾', unit: '单位', pegged: '锚定', asset_type: '资产类型',
    click_to_lock: '(点击锁定搜索过滤器)', ticker: '代码', asset_name: '资产名称',
    auto_filled: '自动填写', yahoo_symbol: '雅虎财经代码（可选）', avg_buy_price: '平均买入价',
    amount: '数量', searching_market: '⏳ 正在搜索市场...', fetching_live: '⏳ 正在获取实时价格...',
    ai_welcome_1: '你好！我是 **TotalFund AI**，您的个人财务顾问。 ✦\n\n您目前的投资组合价值为',
    ai_welcome_2: '盈亏为',
    ai_welcome_3: '请随便问我关于您的投资组合、市场或投资策略的任何问题！',
    cat_crypto: '加密货币', cat_saham_us: '美股', cat_saham_idx: '印尼股票', cat_komoditas: '大宗商品', stablecoin: '稳定币', cash_idr: '印尼盾现金',
    set_username: '设置用户名', change_profile_pic: '点击更改头像',
    err_ticker_empty: '⚠️ 请输入代码！', err_select_from_results: '⚠️ 请从下方结果中选择。', err_not_found: '未找到。',
    eg_bbca: '例如：AAPL', err_server: '抱歉，发生错误。', err_network: '⚠️ 无法连接到服务器。',
    edit_asset: '编辑资产', delete_asset: '删除资产', asset_actions: '资产操作',
    open_account_settings: '打开账户设置', account_settings: '账户设置', email: '电子邮箱',
    email_placeholder: 'name@email.com', full_name: '姓名', close: '关闭', view_assets: '查看资产'
  }
};

function getDefaultLang() {
  const browserLang = (navigator.language || navigator.userLanguage || '').toLowerCase();
  if (browserLang.includes('id')) return 'id';
  if (browserLang.includes('zh')) return 'zh';
  return 'en';
}

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

// ── FLOATING ACTION MENU (Task 3) ──────────────────────────────────────────
// Dipanggil saat asset row di-tap/klik. Render dropdown kecil di desktop
// (nempel di posisi klik) atau bottom sheet slide-up di mobile.
// Isi minimal: Edit Asset & Delete Asset (delete tetap lewat confirm modal
// terpisah yang sudah ada di App, menu ini cuma trigger-nya).
function AssetActionMenu({ asset, anchorPos, isMobile, onEdit, onDelete, onClose, t }) {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) onClose();
    };
    // delay sedikit biar klik yang men-trigger menu ini sendiri gak langsung nutup
    const timer = setTimeout(() => document.addEventListener('mousedown', handleClick), 0);
    return () => { clearTimeout(timer); document.removeEventListener('mousedown', handleClick); };
  }, [onClose]);

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!asset) return null;

  const menuItems = (
    <>
      <div className="action-menu-item" onClick={() => { onEdit(asset); onClose(); }}>
        <span style={{ fontSize: '15px' }}>✎</span> {t('edit_asset')}
      </div>
      <div className="action-menu-item danger" onClick={() => { onDelete(asset); onClose(); }}>
        <span style={{ fontSize: '15px' }}>🗑</span> {t('delete_asset')}
      </div>
    </>
  );

  if (isMobile) {
    return (
      <>
        <div className="action-menu-backdrop" onClick={onClose} />
        <div className="action-menu-sheet" ref={menuRef}>
          <div className="action-menu-sheet-handle" />
          <div className="action-menu-sheet-title">{asset.ticker} — {t('asset_actions')}</div>
          {menuItems}
        </div>
      </>
    );
  }

  // Desktop: dropdown nempel di posisi klik, dijaga gak keluar viewport
  const style = {
    top: Math.min(anchorPos?.y ?? 0, window.innerHeight - 120),
    left: Math.min(anchorPos?.x ?? 0, window.innerWidth - 200),
  };

  return (
    <>
      <div className="action-menu-backdrop" style={{ background: 'transparent', backdropFilter: 'none' }} onClick={onClose} />
      <div className="action-menu-dropdown" style={style} ref={menuRef}>
        {menuItems}
      </div>
    </>
  );
}

const COMMODITY_EMOJI = { GOLD:'🥇', XAU:'🥇', XAG:'🥈', BRENT:'🛢️', WTI:'🛢️', OIL:'🛢️', NG:'💨', HG:'⚙️', PLAT:'🔷', PALL:'🔹', CORN:'🌽', WHEAT:'🌾', COFFEE:'☕', COCOA:'🍫', SUGAR:'🍬', COTTON:'🪡', ALU:'⚙️' };

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
  if (src) return <img src={src} alt={tk} style={{ width:'100%', height:'100%', objectFit:'contain' }} onError={() => setErr(true)} />;
  const emoji = COMMODITY_EMOJI[tk];
  if (emoji) return <span style={{ fontSize:'18px', lineHeight:1 }}>{emoji}</span>;
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
    saham:     { color: '#3b82f6', bg: 'rgba(59,130,246,0.15)'  },
    saham_us:  { color: '#ec4899', bg: 'rgba(236,72,153,0.15)'  },
    komoditas: { color: '#eab308', bg: 'rgba(234,179,8,0.15)'   },
    stable:    { color: '#10b981', bg: 'rgba(16,185,129,0.15)'  },
    cash_idr:  { color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)'  },
  }[asset.type] || { color: '#64748B', bg: 'rgba(115,115,115,0.15)' };

  // Task 3: row jadi satu-satunya trigger aksi (tidak ada button inline lagi).
  // Klik di mana saja pada row (desktop) membuka dropdown nempel di posisi klik;
  // tap di mobile membuka bottom sheet.
  const handleClick = (e) => onRowClick(asset, { x: e.clientX, y: e.clientY });

  return (
    <>
      <div
        className="asset-row-desktop"
        onClick={handleClick}
        style={{ alignItems: 'center', padding: '13px 20px', borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.035)', gap: '12px', transition: 'background 0.18s' }}
      >
        {/* ── Section 1: identity + live price ── */}
        <div style={{ flex: 2.4, display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: typeConfig.bg, color: typeConfig.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '10px', flexShrink: 0, overflow: 'hidden', border: `1px solid ${typeConfig.color}22` }}>
            <AssetIcon asset={asset} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ color: '#ffffff', fontWeight: 700, fontSize: '14px', letterSpacing: '-0.2px' }}>{asset.ticker}</div>
            <div style={{ color: '#484848', fontSize: '11px', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{asset.nama}</div>
            {!isCashIDR && (
              <div style={{ color: '#475569', fontSize: '11px', marginTop: '3px', fontFamily: 'monospace' }}>
                {hargaAcuan ? (isSaham ? formatIDR(hargaAcuan) : formatUSD(hargaAcuan)) : '—'}
              </div>
            )}
          </div>
        </div>

        {/* ── Section 2: holdings qty + avg ── */}
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

        {/* ── Section 3: current value + allocation bar ── */}
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

        {/* ── Section 4: unrealized PnL ── */}
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
            <div style={{ color: '#475569', fontSize: '11px', marginTop: '2px' }}>{nilaiSekarang ? (isSaham || isCashIDR ? formatUSD(nilaiSekarang / kursIdr) : formatIDR(nilaiSekarang * kursIdr)) : ''}</div>
          </div>
        </div>
        <div className="asset-row-mobile-bottom">
          <div className="asset-row-mobile-stats">
            {!isCashIDR && (
              <div>
                <div style={{ color: '#475569', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '2px' }}>{t('price_live')}</div>
                <div style={{ color: '#e5e5e5', fontSize: '12px', fontWeight: 500 }}>{hargaAcuan ? (isSaham ? formatIDR(hargaAcuan) : formatUSD(hargaAcuan)) : '—'}</div>
              </div>
            )}
            <div>
              <div style={{ color: '#475569', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '2px' }}>{t('holdings')}</div>
              <div style={{ color: '#e5e5e5', fontSize: '12px', fontWeight: 500 }}>{isCashIDR ? formatIDR(asset.jumlah) : `${(isSaham ? asset.jumlah / 100 : asset.jumlah).toLocaleString()} ${isSaham ? t('sheet') : asset.ticker}`}</div>
            </div>
            {/* FIX TASK 2: sebelumnya cuma render nilai dollar/rupiah PNL tanpa persentase.
                Sekarang disamakan dengan desktop: nilai + baris persen ▲/▼ X.XX% di bawahnya. */}
            {!isStable && !isCashIDR && pnl !== null && (
              <div>
                <div style={{ color: '#475569', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '2px' }}>PNL</div>
                <div style={{ color: profit ? '#10B981' : '#EF4444', fontSize: '12px', fontWeight: 600 }}>{profit ? '+' : ''}{isSaham ? formatIDR(pnl) : formatUSD(pnl)}</div>
                <span className={profit ? 'badge-up' : 'badge-down'} style={{ marginTop: '2px', fontSize: '10px', padding: '1px 7px' }}>
                  {profit ? '↑' : '↓'} {Math.abs(pnlPersen).toFixed(2)}%
                </span>
              </div>
            )}
          </div>
          {/* Inline Edit/Delete button dihapus (Task 3) — tap row untuk buka bottom sheet aksi. */}
          <span style={{ color: '#454545', fontSize: '16px', flexShrink: 0, padding: '4px 6px' }}>⋯</span>
        </div>
      </div>
    </>
  );
}

function ConfirmDeleteModal({ asset, onConfirm, onCancel, t }) {
  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
      <div style={{ backgroundColor: '#111215', border: '1px solid #1e2026', borderRadius: '18px', padding: '28px 28px 24px', width: '340px', boxShadow: '0 24px 64px rgba(0,0,0,0.8)' }}>
        <div style={{ width: '52px', height: '52px', borderRadius: '14px', backgroundColor: 'rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', fontSize: '24px' }}>🗑</div>
        <h3 style={{ color: '#ffffff', fontSize: '20px', fontWeight: 800, margin: '0 0 10px' }}>{t('delete')} {asset.ticker}?</h3>
        <p style={{ color: '#94A3B8', fontSize: '14px', margin: '0 0 6px', lineHeight: 1.6 }}>Aset <span style={{ fontWeight: 700 }}>{asset.nama}</span> akan dihapus permanen.</p>
        <div style={{ display: 'flex', gap: '8px', marginTop: '24px' }}>
          <button onClick={onCancel} style={{ flex: 1, backgroundColor: '#1a1a22', color: '#64748B', border: '1px solid #242430', borderRadius: '9px', padding: '12px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>{t('cancel')}</button>
          <button onClick={onConfirm} style={{ flex: 1, backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '9px', padding: '12px', fontSize: '14px', fontWeight: 800, cursor: 'pointer' }}>{t('delete')}</button>
        </div>
      </div>
    </div>
  );
}

// ── ACCOUNT SETTINGS MODAL ──────────────────────────────────────────────────
// Floating modal (center overlay) dibuka lewat klik area profil di Sidebar.
// Field saat ini: Nama, Foto, Email — semua disimpan ke localStorage lewat
// useLocalStorage (lihat App: username, profilePic, email). Field baru bisa
// ditambah ke sini nanti, dan saat database masuk, fungsi handleSave cukup
// diubah supaya juga mengirim ke API alih-alih (atau selain) localStorage.
function AccountSettingsModal({ username, profilePic, email, onSave, onClose, t }) {
  const [nameDraft, setNameDraft]   = useState(username || '');
  const [emailDraft, setEmailDraft] = useState(email || '');
  const fileInputRef = useRef(null);
  const [picDraft, setPicDraft]     = useState(profilePic || '');

  const handleImageClick = () => fileInputRef.current?.click();
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPicDraft(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = () => {
    onSave({ username: nameDraft.trim(), email: emailDraft.trim(), profilePic: picDraft });
  };

  const labelStyle = { color: '#475569', fontSize: '11px', fontWeight: 700, display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.6px' };
  const inputStyle = { width: '100%', backgroundColor: '#0d0d0d', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '12px 16px', color: '#e5e5e5', fontSize: '14px', outline: 'none', boxSizing: 'border-box', fontWeight: 500 };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ backgroundColor: '#0F1929', border: '1px solid #262626', borderRadius: '20px', width: '420px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 32px 80px rgba(0,0,0,0.8)' }}>
        <div style={{ padding: '24px 28px 20px', borderBottom: '1px solid #1f1f1f', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ color: '#fff', fontSize: '19px', fontWeight: 800, margin: 0, letterSpacing: '-0.3px' }}>{t('account_settings')}</h2>
          <button onClick={onClose} style={{ width: '34px', height: '34px', borderRadius: '10px', backgroundColor: 'rgba(15,25,41,0.8)', border: '1px solid #2a2a2a', color: '#475569', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Foto profil */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              onClick={handleImageClick}
              style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', border: '2px solid #333', flexShrink: 0 }}
              title={t('change_profile_pic')}
            >
              {picDraft ? (
                <img src={picDraft} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ color: '#64748B', fontSize: '22px', fontWeight: 'bold' }}>{nameDraft ? nameDraft[0].toUpperCase() : 'U'}</span>
              )}
            </div>
            <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" style={{ display: 'none' }} />
            <div>
              <button onClick={handleImageClick} style={{ backgroundColor: 'rgba(15,25,41,0.8)', border: '1px solid #2a2a2a', borderRadius: '8px', padding: '8px 14px', color: '#94A3B8', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>{t('change_profile_pic')}</button>
            </div>
          </div>

          <div>
            <label style={labelStyle}>{t('full_name')}</label>
            <input value={nameDraft} onChange={e => setNameDraft(e.target.value)} placeholder={t('set_username')} style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>{t('email')}</label>
            <input type="email" value={emailDraft} onChange={e => setEmailDraft(e.target.value)} placeholder={t('email_placeholder')} style={inputStyle} />
          </div>
        </div>

        <div style={{ padding: '0 28px 28px', display: 'flex', gap: '10px' }}>
          <button onClick={onClose} style={{ flex: 1, backgroundColor: '#111F35', color: '#64748B', border: '1px solid #262626', borderRadius: '10px', padding: '13px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>{t('cancel')}</button>
          <button onClick={handleSubmit} style={{ flex: 2, backgroundColor: '#16a34a', color: '#ffffff', border: 'none', borderRadius: '10px', padding: '13px', fontSize: '14px', fontWeight: 800, cursor: 'pointer' }}>{t('save')}</button>
        </div>
      </div>
    </div>
  );
}

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
        <div style={{ color: '#475569', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
      </div>
      <span style={{ fontSize: '10px', fontWeight: 700, color: typeColor, backgroundColor: typeColor + '22', padding: '2px 7px', borderRadius: '4px', flexShrink: 0 }}>{typeLabel}</span>
      {item.market_cap_rank && <span style={{ fontSize: '10px', color: '#475569' }}>#{item.market_cap_rank}</span>}
    </div>
  );
}

function AddAssetModal({ onSave, onClose, t }) {
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
  const labelStyle = { color: '#475569', fontSize: '11px', fontWeight: 700, display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.6px' };
  const inputStyle = { width: '100%', backgroundColor: '#0d0d0d', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '12px 16px', color: '#e5e5e5', fontSize: '14px', outline: 'none', boxSizing: 'border-box', fontWeight: 500 };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ backgroundColor: '#0F1929', border: '1px solid #262626', borderRadius: '20px', width: '520px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 32px 80px rgba(0,0,0,0.8)' }}>
        <div style={{ padding: '24px 28px 20px', borderBottom: '1px solid #1f1f1f', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ color: '#fff', fontSize: '19px', fontWeight: 800, margin: 0, letterSpacing: '-0.3px' }}>{t('add_asset')}</h2>
          </div>
          <button onClick={onClose} style={{ width: '34px', height: '34px', borderRadius: '10px', backgroundColor: 'rgba(15,25,41,0.8)', border: '1px solid #2a2a2a', color: '#475569', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
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
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: '#0F1929', border: '1px solid #2a2a2a', borderRadius: '12px', marginTop: '4px', zIndex: 999, maxHeight: '260px', overflowY: 'auto', boxShadow: '0 16px 40px rgba(0,0,0,0.7)' }}>
                  {searching && <div style={{ padding: '10px 14px', color: '#475569', fontSize: '12px' }}>{t('searching_market')}</div>}
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
          <button onClick={onClose} style={{ flex: 1, backgroundColor: '#111F35', color: '#64748B', border: '1px solid #262626', borderRadius: '10px', padding: '13px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>{t('cancel')}</button>
          <button onClick={handleSubmit} style={{ flex: 2, backgroundColor: '#16a34a', color: '#ffffff', border: 'none', borderRadius: '10px', padding: '13px', fontSize: '14px', fontWeight: 800, cursor: 'pointer' }}>{t('add_asset')}</button>
        </div>
      </div>
    </div>
  );
}

function MarketNewsPage({ assets, t }) {
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
      <div style={{ padding: '60px 20px', textAlign: 'center', backgroundColor: '#0F1929', borderRadius: '16px', border: '1px solid rgba(59,130,246,0.07)', marginTop: '20px' }}>
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
                color: activeTab === tab.id ? '#10B981' : '#a3a3a3',
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
                backgroundColor: '#0F1929',
                border: '1px solid rgba(59,130,246,0.08)',
                borderRadius: '16px',
                overflow: 'hidden',
                textDecoration: 'none',
                transition: 'transform 0.2s, borderColor 0.2s'
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'rgba(59,130,246,0.08)'; }}
            >
              {item.thumbnail ? (
                <img src={item.thumbnail} alt="" style={{ width: '100%', height: '160px', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '160px', backgroundColor: 'rgba(59,130,246,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' }}>
                  📰
                </div>
              )}
              <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ backgroundColor: 'rgba(59,130,246,0.07)', color: '#e5e5e5', fontSize: '11px', fontWeight: 700, padding: '4px 8px', borderRadius: '6px' }}>{item.ticker}</span>
                  <span style={{ color: '#64748B', fontSize: '11px', fontWeight: 500 }}>{new Date(item.published_at * 1000).toLocaleDateString()}</span>
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
        <div style={{ padding: '60px 20px', textAlign: 'center', backgroundColor: '#0F1929', borderRadius: '16px', border: '1px solid rgba(59,130,246,0.07)' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>📰</div>
          <div style={{ color: '#94A3B8', fontSize: '14px', fontWeight: 500 }}>{t('no_news_found')}</div>
        </div>
      )}
    </div>
  );
}

function AIConsultant({ assets, hargaMap, hargaSaham, kursIdr, grandTotalUSD, grandTotalIDR, overallPnlUSD, overallPnlPersen, marketData, t }) {
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

  const welcome = `${t('ai_welcome_1')} **${formatUSD(grandTotalUSD)}** ${t('ai_welcome_2')} **${overallPnlUSD >= 0 ? '+' : ''}${formatUSD(overallPnlUSD)} (${overallPnlPersen.toFixed(2)}%)**.\n\n${t('ai_welcome_3')}`;

  const [messages, setMessages] = useState([{ role: 'ai', text: welcome }]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const bottomRef               = useRef(null);
  const inputRef                = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  const send = async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput(''); setMessages(prev => [...prev, { role: 'user', text: msg }]); setLoading(true);
    try {
      const history = messages.slice(-8).map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.text }));
      const res  = await fetch(`${API_BASE}/api/ai-chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: msg, context: buildContext(), history }) });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'ai', text: data.response || t('err_server') }]);
    } catch {
      setMessages(prev => [...prev, { role: 'ai', text: t('err_network') }]);
    }
    setLoading(false); inputRef.current?.focus();
  };

  const isWelcome = messages.length === 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', borderRadius: '20px', border: '1px solid rgba(59,130,246,0.15)', backgroundColor: '#0F1929', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid rgba(255,255,255,0.04)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: '12px', background: 'linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', boxShadow: '0 4px 14px rgba(6,182,212,0.3)', flexShrink: 0 }}>✦</div>
          <div>
            <div style={{ color: '#ffffff', fontWeight: 800, fontSize: '15px' }}>TotalFund AI</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <div className="status-dot" style={{ width: 6, height: 6 }} />
              <span style={{ color: '#6b7280', fontSize: '12px' }}>{t('online')}</span>
            </div>
          </div>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
        {isWelcome && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60%', textAlign: 'center', padding: '20px 0' }}>
            <div style={{ width: 72, height: 72, borderRadius: '20px', background: 'linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', boxShadow: '0 8px 28px rgba(6,182,212,0.25)', marginBottom: 20 }}>✦</div>
            <div style={{ color: '#ffffff', fontWeight: 800, fontSize: '22px', marginBottom: 8 }}>TotalFund AI</div>
            <div style={{ color: '#6b7280', fontSize: '14px', marginBottom: 28, maxWidth: 420, lineHeight: 1.6 }}>{t('ai_consultant')}</div>
          </div>
        )}
        {!isWelcome && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', gap: '10px', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', alignItems: 'flex-start' }}>
                {msg.role === 'ai' && <div style={{ width: 30, height: 30, borderRadius: '9px', background: 'linear-gradient(135deg, #06B6D4, #3B82F6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', flexShrink: 0 }}>✦</div>}
                <div style={{ maxWidth: '74%', padding: '13px 17px', borderRadius: msg.role === 'ai' ? '2px 14px 14px 14px' : '14px 2px 14px 14px', background: msg.role === 'ai' ? '#111F35' : 'linear-gradient(135deg, #0E2847, #122255)', border: msg.role === 'ai' ? '1px solid rgba(59,130,246,0.08)' : '1px solid rgba(16,185,129,0.2)', color: '#e5e5e5', fontSize: '14px', lineHeight: '1.7' }}>
                  {msg.role === 'ai' ? <div dangerouslySetInnerHTML={{ __html: renderAIText(msg.text) }} /> : <span style={{ fontWeight: 500 }}>{msg.text}</span>}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <div style={{ width: 30, height: 30, borderRadius: '9px', background: 'linear-gradient(135deg, #06B6D4, #3B82F6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', flexShrink: 0 }}>✦</div>
                <div style={{ padding: '13px 17px', borderRadius: '2px 14px 14px 14px', background: '#111F35', border: '1px solid rgba(59,130,246,0.08)', display: 'flex', gap: '5px', alignItems: 'center' }}>
                  {[0,1,2].map(j => <div key={j} style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10B981', animation: `bounce 1.2s ease-in-out ${j*0.2}s infinite` }} />)}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>
      <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.04)', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: '10px', padding: '12px 16px', background: '#111F35', border: '1px solid rgba(59,130,246,0.15)', borderRadius: '12px' }}>
          <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()} placeholder="..." disabled={loading} style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#e5e5e5', fontSize: '14px', fontFamily: 'inherit' }} />
          <button onClick={() => send()} disabled={loading || !input.trim()} style={{ width: '36px', height: '36px', borderRadius: '9px', background: input.trim() ? 'linear-gradient(135deg, #06B6D4, #3B82F6)' : 'rgba(59,130,246,0.07)', border: 'none', color: input.trim() ? '#000' : '#4b5563', fontSize: '15px', fontWeight: 700, cursor: input.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>▶</button>
        </div>
      </div>
    </div>
  );
}

// ── Mini sparkline SVG (trend-based, no real history needed) ─────────────────
function MiniSparkline({ change, color, w = 80, h = 28 }) {
  const steps = 10;
  const pts = Array.from({ length: steps }, (_, i) => {
    const t = i / (steps - 1);
    const trend = t * change * 2;
    const wave  = Math.sin(i * 1.7 + Math.abs(change)) * Math.abs(change) * 0.5;
    return { x: t * w, y: h / 2 - trend - wave };
  });
  const minY = Math.min(...pts.map(p => p.y));
  const maxY = Math.max(...pts.map(p => p.y));
  const range = maxY - minY || 1;
  const norm = pts.map(p => ({ x: p.x, y: 3 + ((p.y - minY) / range) * (h - 6) }));
  const d = norm.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
      <path d={d} stroke={color} strokeWidth={1.5} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.85} />
    </svg>
  );
}

// ── Macro Pulse ───────────────────────────────────────────────────────────────
function MacroPulseCard({ marketData }) {
  const score = (change, scale = 12) => Math.round(Math.max(5, Math.min(95, 50 + change * scale)));
  const sentiment = (s) =>
    s >= 62 ? { label: 'Bullish', color: '#10B981', bg: 'rgba(16,185,129,0.1)'  }
    : s >= 40 ? { label: 'Neutral', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' }
    :            { label: 'Bearish', color: '#EF4444', bg: 'rgba(239,68,68,0.1)'  };

  const sectors = [
    { icon: '₿',  label: 'Crypto',     s: score(((marketData.BTC?.change ?? 0) + (marketData.ETH?.change ?? 0)) / 2, 8) },
    { icon: '🇺🇸', label: 'US Stocks',  s: score(marketData.SPX500?.change ?? 0, 18) },
    { icon: '🇮🇩', label: 'IDX Stocks', s: score(marketData.IHSG?.change ?? 0,   18) },
    { icon: '🥇',  label: 'Commodity',  s: score(((marketData.GOLD?.change ?? 0) + (marketData.XAG?.change ?? 0)) / 2, 12) },
  ];

  const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <div style={{ background: '#0F1929', border: '1px solid rgba(59,130,246,0.15)', borderRadius: '16px', padding: '18px 20px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
        <div>
          <div style={{ color: '#E2E8F0', fontSize: '14px', fontWeight: 700, letterSpacing: '-0.2px' }}>Macro Pulse</div>
          <div style={{ color: '#334155', fontSize: '10px', marginTop: '2px' }}>Updated {now}</div>
        </div>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#06B6D4', boxShadow: '0 0 6px rgba(6,182,212,0.7)', marginTop: 4 }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0', flex: 1 }}>
        {sectors.map(({ icon, label, s }) => {
          const sent = sentiment(s);
          return (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: '1px solid rgba(59,130,246,0.06)' }}>
              <span style={{ fontSize: '16px', width: '22px', textAlign: 'center', lineHeight: 1, flexShrink: 0 }}>{icon}</span>
              <span style={{ color: '#94A3B8', fontSize: '12px', fontWeight: 500, flex: 1 }}>{label}</span>
              <span style={{ color: sent.color, fontSize: '9px', fontWeight: 700, background: sent.bg, padding: '2px 6px', borderRadius: '4px', letterSpacing: '0.3px', flexShrink: 0 }}>{sent.label}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                <div style={{ width: '44px', height: '3px', background: 'rgba(59,130,246,0.1)', borderRadius: '99px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${s}%`, background: `linear-gradient(90deg, ${sent.color}55, ${sent.color})`, borderRadius: '99px', transition: 'width 0.6s ease' }} />
                </div>
                <span style={{ color: '#E2E8F0', fontSize: '13px', fontWeight: 800, fontFamily: 'monospace', minWidth: '20px', textAlign: 'right' }}>
                  {s}<span style={{ color: '#334155', fontSize: '9px', fontWeight: 400 }}>/100</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Asset Class Performance 24H ───────────────────────────────────────────────
function AssetClassPerformanceCard({ marketData }) {
  const classes = [
    { key: 'Crypto',     icon: '₿',  accentColor: '#06B6D4', change: ((marketData.BTC?.change ?? 0) + (marketData.ETH?.change ?? 0)) / 2 },
    { key: 'US Stocks',  icon: '🇺🇸', accentColor: '#8B5CF6', change: marketData.SPX500?.change ?? 0 },
    { key: 'IDX Stocks', icon: '🇮🇩', accentColor: '#10B981', change: marketData.IHSG?.change ?? 0 },
    { key: 'Commodity',  icon: '🥇',  accentColor: '#F59E0B', change: ((marketData.GOLD?.change ?? 0) + (marketData.XAG?.change ?? 0)) / 2 },
  ];

  const maxAbs = Math.max(...classes.map(c => Math.abs(c.change)), 0.01);

  return (
    <div style={{ background: '#0F1929', border: '1px solid rgba(59,130,246,0.15)', borderRadius: '16px', padding: '16px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <div style={{ color: '#64748B', fontSize: '10px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '16px' }}>Asset Class Performance (24H)</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {classes.map(({ key, icon, accentColor, change }) => {
          const isUp = change >= 0;
          const pnlColor = isUp ? '#10B981' : '#EF4444';
          const barPct = (Math.abs(change) / maxAbs) * 100;
          return (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: `${accentColor}18`, border: `1px solid ${accentColor}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>
                {icon}
              </div>
              <span style={{ color: '#94A3B8', fontSize: '12px', fontWeight: 600, width: '74px', flexShrink: 0 }}>{key}</span>
              <div style={{ flex: 1, height: '4px', background: 'rgba(59,130,246,0.08)', borderRadius: '99px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${barPct}%`, background: `linear-gradient(90deg, ${pnlColor}55, ${pnlColor})`, borderRadius: '99px', transition: 'width 0.6s cubic-bezier(0.23,1,0.32,1)' }} />
              </div>
              <span style={{ color: pnlColor, fontSize: '12px', fontWeight: 800, minWidth: '56px', textAlign: 'right', letterSpacing: '-0.2px', flexShrink: 0 }}>
                {isUp ? '+' : ''}{change.toFixed(2)}%
              </span>
              <MiniSparkline change={change} color={pnlColor} w={48} h={18} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Portfolio Movers Today ─────────────────────────────────────────────────────
function PortfolioMoversCard({ assets, hargaMap, hargaSaham, marketData }) {
  const movers = useMemo(() => {
    return assets
      .filter(a => !['stable', 'cash_idr'].includes(a.type))
      .map(a => {
        let change = 0;
        const key = a.simbol || a.ticker;
        if (a.type === 'crypto')         change = hargaMap[key]?.change || hargaMap[a.ticker]?.change || 0;
        else if (a.type === 'komoditas') change = a.simbol === 'GC=F' ? (marketData.GOLD?.change || 0) : a.simbol === 'SI=F' ? (marketData.XAG?.change || 0) : 0;
        else if (a.type === 'saham_us')  change = marketData.SPX500?.change || 0;
        else if (a.type === 'saham')     change = marketData.IHSG?.change || 0;
        return { ticker: a.ticker, change };
      })
      .filter(m => m.change !== 0)
      .sort((a, b) => b.change - a.change);
  }, [assets, hargaMap, marketData]);

  const gainers = movers.filter(m => m.change >= 0).slice(0, 4);
  const losers  = [...movers].filter(m => m.change < 0).slice(0, 4);
  const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <div style={{ background: '#0F1929', border: '1px solid rgba(59,130,246,0.15)', borderRadius: '16px', padding: '18px 20px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
        <div>
          <div style={{ color: '#E2E8F0', fontSize: '14px', fontWeight: 700, letterSpacing: '-0.2px' }}>Portfolio Movers</div>
          <div style={{ color: '#334155', fontSize: '10px', marginTop: '2px' }}>Updated {now}</div>
        </div>
        <span style={{ color: '#475569', fontSize: '9px', fontWeight: 700, background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)', padding: '2px 7px', borderRadius: '4px', letterSpacing: '0.5px' }}>TODAY</span>
      </div>

      {movers.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: '22px' }}>📊</span>
          <span style={{ color: '#334155', fontSize: '12px', fontWeight: 500 }}>Add assets to see movers</span>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', flex: 1 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '8px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981', flexShrink: 0 }} />
              <span style={{ color: '#10B981', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Gainers</span>
            </div>
            {gainers.length === 0
              ? <div style={{ color: '#334155', fontSize: '11px', padding: '6px 0' }}>—</div>
              : gainers.map(m => (
                <div key={m.ticker} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid rgba(59,130,246,0.06)' }}>
                  <span style={{ color: '#94A3B8', fontSize: '12px', fontWeight: 700, fontFamily: 'monospace' }}>{m.ticker}</span>
                  <span style={{ color: '#10B981', fontSize: '11px', fontWeight: 700, background: 'rgba(16,185,129,0.1)', padding: '1px 7px', borderRadius: '4px' }}>+{m.change.toFixed(2)}%</span>
                </div>
              ))
            }
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '8px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#EF4444', flexShrink: 0 }} />
              <span style={{ color: '#EF4444', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Losers</span>
            </div>
            {losers.length === 0
              ? <div style={{ color: '#334155', fontSize: '11px', padding: '6px 0' }}>—</div>
              : losers.map(m => (
                <div key={m.ticker} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid rgba(59,130,246,0.06)' }}>
                  <span style={{ color: '#94A3B8', fontSize: '12px', fontWeight: 700, fontFamily: 'monospace' }}>{m.ticker}</span>
                  <span style={{ color: '#EF4444', fontSize: '11px', fontWeight: 700, background: 'rgba(239,68,68,0.1)', padding: '1px 7px', borderRadius: '4px' }}>{m.change.toFixed(2)}%</span>
                </div>
              ))
            }
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  const [lang, setLang] = useLocalStorage('totalfund_lang', getDefaultLang());
  
  const t = useCallback((key) => {
    let safeLang = 'en';
    if (typeof lang === 'string') {
      safeLang = lang.replace(/[^a-zA-Z]/g, '').toLowerCase();
    }
    const validLang = ['id', 'en', 'zh'].includes(safeLang) ? safeLang : 'en';
    return DICTIONARY[validLang]?.[key] || DICTIONARY['en']?.[key] || key;
  }, [lang]);

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
  
  // Task 3: state untuk floating action menu (dropdown desktop / bottom sheet mobile)
  const [actionMenuAsset, setActionMenuAsset] = useState(null);
  const [actionMenuPos, setActionMenuPos]     = useState({ x: 0, y: 0 });

  const [username, setUsername]           = useLocalStorage('totalfund_username', 'User123');
  const [profilePic, setProfilePic]       = useLocalStorage('totalfund_profile_pic', '');
  const [email, setEmail]                 = useLocalStorage('totalfund_email', '');
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [showAiChat, setShowAiChat]                   = useState(false);
  const [showNotifs, setShowNotifs]                   = useState(false);
  const [showLangPicker, setShowLangPicker]           = useState(false);
  const [hideBalance, setHideBalance]                 = useState(false);

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
  const isMobileViewport = width <= 768;
  useEffect(() => { if (width >= 768) setSidebarOpen(false); }, [width]);

  const cryptoAssets = useMemo(() => assets.filter(a => a.type === 'crypto' && a.ticker), [assets]);

  const fetchCryptoPrices = useCallback(async () => {
    try {
      const baseSymbols      = ['BTCUSDT', 'ETHUSDT'];
      const portfolioSymbols = cryptoAssets.filter(a => a.ticker).map(a => `${a.ticker.toUpperCase()}USDT`);
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
    } catch (err) { setCryptoLoaded(true); }
  }, [cryptoAssets]);

  const nonCryptoSymbols = useMemo(() => {
    return assets.filter(a => ['saham', 'saham_us', 'komoditas'].includes(a.type)).map(a => a.simbol || a.ticker).filter(Boolean);
  }, [assets]);

  const fetchMarketData = useCallback(async () => {
    try {
      const symQuery = nonCryptoSymbols.length > 0 ? `?symbols=${encodeURIComponent(nonCryptoSymbols.join(','))}` : '';
      const res  = await fetchWithRetry(`${API_BASE}/api/market-data${symQuery}`);
      const data = await res.json();

      const stockUpdates = {};
      Object.keys(data).forEach(ticker => {
        if (data[ticker]?.price !== undefined && data[ticker]?.price !== null) stockUpdates[ticker] = data[ticker].price;
      });
      setHargaSaham(prev => ({ ...prev, ...stockUpdates }));

      const mk = (key, type) => {
        const entry = data[key];
        if (!entry || entry.price === undefined || entry.price === null) return null;
        return { price: parseFloat(entry.price), change: parseFloat(entry.change ?? 0), isUp: parseFloat(entry.change ?? 0) >= 0, type };
      };

      const updates = {};
      [['IHSG','idr'], ['SPX500','usd'], ['NASDAQ','usd'], ['GOLD','usd'], ['XAG','usd'], ['BRENT','usd']].forEach(([key, type]) => {
        const result = mk(key, type); if (result) updates[key] = result;
      });

      setMarketData(prev => ({ ...prev, ...updates }));
      setMarketLoaded(true);
    } catch (err) { setMarketLoaded(true); }

    try {
      const res  = await fetchWithRetry('https://api.exchangerate-api.com/v4/latest/USD');
      const data = await res.json();
      if (data?.rates?.IDR) setKursIdr(data.rates.IDR);
    } catch (err) {}
  }, [nonCryptoSymbols]);

  // One-time initial fetch to seed prices (handles stablecoins + non-Binance coins too)
  useEffect(() => { fetchCryptoPrices(); }, [fetchCryptoPrices]);
  useEffect(() => { fetchMarketData(); const i = setInterval(fetchMarketData, 60000); return () => clearInterval(i); }, [fetchMarketData]);

  // Binance WebSocket — real-time crypto prices, zero backend calls, no rate limits
  const _wsAssetsRef = useRef(cryptoAssets);
  useEffect(() => { _wsAssetsRef.current = cryptoAssets; }, [cryptoAssets]);

  const _wsTickers = useMemo(() =>
    [...new Set(['BTC', 'ETH', ...cryptoAssets.map(a => a.ticker?.toUpperCase()).filter(Boolean)])].sort().join(','),
    [cryptoAssets]
  );

  useEffect(() => {
    const PAIRS = {
      BTC:'btcusdt', ETH:'ethusdt', SOL:'solusdt', BNB:'bnbusdt', XRP:'xrpusdt',
      ADA:'adausdt', DOGE:'dogeusdt', AVAX:'avaxusdt', TON:'tonusdt', HYPE:'hypeusdt',
      LINK:'linkusdt', SUI:'suiusdt', DOT:'dotusdt', UNI:'uniusdt', NEAR:'nearusdt',
      ARB:'arbusdt', OP:'opusdt', APT:'aptusdt', ATOM:'atomusdt', LTC:'ltcusdt',
      BCH:'bchusdt', TRX:'trxusdt', INJ:'injusdt', SHIB:'shibusdt',
    };
    const pairs = _wsTickers.split(',').filter(s => PAIRS[s]).map(s => PAIRS[s]);
    if (!pairs.length) return;

    const streams = pairs.map(p => `${p}@ticker`).join('/');
    const latest = {};
    let ws, reconnTimer, flushTimer;

    const connect = () => {
      ws = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streams}`);
      ws.onmessage = (e) => {
        const msg = JSON.parse(e.data);
        if (!msg?.data?.s) return;
        const d = msg.data;
        latest[d.s.replace('USDT', '')] = { price: parseFloat(d.c), change: parseFloat(d.P) };
      };
      ws.onerror = () => ws.close();
      ws.onclose  = () => { reconnTimer = setTimeout(connect, 5000); };
    };

    connect();

    // Batch state updates every 3s — avoids excessive re-renders
    flushTimer = setInterval(() => {
      if (!Object.keys(latest).length) return;
      const cas = _wsAssetsRef.current;
      setHargaMap(prev => {
        const m = { ...prev };
        cas.forEach(a => {
          const t = a.ticker?.toUpperCase();
          if (t && latest[t]) m[a.simbol || a.ticker] = { usd: latest[t].price, change: latest[t].change };
        });
        return m;
      });
      setMarketData(prev => {
        const u = {};
        ['BTC', 'ETH'].forEach(s => {
          if (latest[s]) u[s] = { price: latest[s].price, change: latest[s].change, isUp: latest[s].change >= 0, type: 'usd' };
        });
        return Object.keys(u).length ? { ...prev, ...u } : prev;
      });
    }, 3000);

    return () => { clearTimeout(reconnTimer); clearInterval(flushTimer); ws?.close(); };
  }, [_wsTickers]);

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
        valUSD = (hargaMap[key]?.usd || a.avg) * a.jumlah; change24h = hargaMap[key]?.change || 0;
      } else if (a.type === 'komoditas') {
        const key = a.simbol || a.ticker;
        valUSD = (hargaSaham[key] || a.avg) * a.jumlah;
        change24h = a.simbol === 'GC=F' ? (marketData.GOLD?.change || 0) : a.simbol === 'SI=F' ? (marketData.XAG?.change || 0) : 0;
      } else if (a.type === 'saham_us') {
        const key = a.simbol || a.ticker;
        valUSD = (hargaSaham[key] || a.avg) * a.jumlah; change24h = marketData.SPX500?.change || 0;
      } else if (a.type === 'saham') {
        const key = a.simbol || a.ticker;
        valUSD = ((hargaSaham[key] || a.avg) * a.jumlah) / kursIdr; change24h = marketData.IHSG?.change || 0;
      } else {
        valUSD = a.type === 'cash_idr' ? a.jumlah / kursIdr : a.avg * a.jumlah;
      }
      const denom = 1 + change24h / 100;
      const val0  = denom !== 0 ? valUSD / denom : valUSD;
      pnl += valUSD - val0; modal += val0;
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
      const fetchDays = 1825; const now = Date.now();

      const createDummyData = (baseVal) => {
        const arr = [];
        for (let i = fetchDays; i >= 0; i--) { arr.push([now - (i * 86400000), baseVal]); }
        return arr;
      };

      if (cryptos.length === 0) {
        setChartData(createDummyData(baseline)); setPnlChart({ selisih: 0, persen: 0 }); return;
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
        const results = await Promise.all(cryptos.map(a => fetchWithRetry(`${API_BASE}/api/chart?simbol=${a.simbol}&days=${fetchDays}`).then(r => r.json()).catch(() => null)));
        if (results.some(r => r && r.prices)) {
          const combined = process(results);
          if (combined?.length >= 2) {
            setChartData(combined); const diff = combined[combined.length-1][1] - combined[0][1];
            setPnlChart({ selisih: diff, persen: (diff / combined[0][1]) * 100 }); return;
          }
        }
      } catch (e) {}

      setChartData(createDummyData(grandTotalUSD)); setPnlChart({ selisih: 0, persen: 0 }); setChartError(true);
    };
    fetchChart();
  }, [assets, grandTotalUSD, hargaMap]);

  const chartColor = pnlChart?.selisih >= 0 ? '#10B981' : '#EF4444';

  const handleAddAsset = useCallback((newAsset, livePrice) => {
    setAssets(prev => [...prev, { ...newAsset, id: Date.now() }]);
    setShowAddModal(false);
    if (livePrice) {
      const key = newAsset.simbol || newAsset.ticker;
      if (newAsset.type === 'crypto') setHargaMap(prev => ({ ...prev, [key]: { usd: livePrice, change: 0 } }));
      else if (['saham', 'saham_us', 'komoditas'].includes(newAsset.type)) setHargaSaham(prev => ({ ...prev, [key]: livePrice }));
    }
  }, [setAssets]);

  const handleDeleteAsset = useCallback((id) => { setAssets(prev => prev.filter(a => a.id !== id)); }, [setAssets]);
  const openEdit          = useCallback((asset) => { setEditingAsset(asset); setEditForm({ harga: '', jumlah: '' }); }, []);

  // Task 3: row diklik -> simpan asset + posisi klik untuk floating menu
  const handleRowClick = useCallback((asset, pos) => {
    setActionMenuAsset(asset);
    setActionMenuPos(pos);
  }, []);
  // Ref ke section Holdings - dipakai tombol "Lihat Aset" di mobile buat scroll langsung ke situ.
  const holdingsRef = useRef(null);
  const scrollToHoldings = useCallback(() => {
    holdingsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);
  const closeActionMenu = useCallback(() => setActionMenuAsset(null), []);

  // Account settings: simpan ketiga field sekaligus, lalu tutup modal.
  // Saat database masuk nanti, cukup tambahkan call API di sini (di samping
  // atau menggantikan localStorage lewat useLocalStorage di atas).
  const handleSaveAccountSettings = useCallback(({ username: newName, email: newEmail, profilePic: newPic }) => {
    setUsername(newName);
    setEmail(newEmail);
    setProfilePic(newPic);
    setShowAccountSettings(false);
  }, [setUsername, setEmail, setProfilePic]);

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
    const color    = data.isUp ? '#10B981' : '#EF4444';
    return (
      <div style={styles.marketCardMini} key={key}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
          <span style={{ color: '#64748B', fontWeight: 700, fontSize: '11px', letterSpacing: '0.2px' }}>{displayName}</span>
          {loaded && hasData && (
            <span style={{ color, fontSize: '9px', fontWeight: 700, background: data.isUp ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', padding: '1px 5px', borderRadius: '4px' }}>
              {data.isUp ? '+' : ''}{data.change.toFixed(2)}%
            </span>
          )}
          {!loaded && <div className="skeleton" style={{ width: 34, height: 12 }} />}
        </div>
        {!loaded
          ? <div className="skeleton" style={{ width: '70%', height: 17, margin: '3px 0' }} />
          : hasData
            ? <div style={{ color: '#E2E8F0', fontWeight: 800, fontSize: '14px', letterSpacing: '-0.3px', margin: '1px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {data.type === 'usd' ? '$' : ''}{data.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </div>
            : <div style={{ color: '#334155', fontWeight: 800, fontSize: '14px', margin: '1px 0' }}>—</div>
        }
        {hasData && <MiniSparkline change={data.change} color={color} w={100} h={20} />}
        {!hasData && loaded && <div style={{ height: 20 }} />}
      </div>
    );
  };

  return (
    <div className="app-wrapper">
      <div className={`sidebar-overlay${sidebarOpen ? ' sidebar-open' : ''}`} onClick={() => setSidebarOpen(false)} />
      
      <Sidebar activePage={activePage} setActivePage={setActivePage} onClose={() => setSidebarOpen(false)} isOpen={sidebarOpen} t={t} />

      <div className="app-main">
        <div className="max-container">
          
          <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
            <button className="hamburger-btn" onClick={() => setSidebarOpen(true)}>☰</button>

            <div className="header-search" style={{ flex: 1, maxWidth: '420px' }}>
              <svg className="header-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>
              <input placeholder="Search coins, stocks, ETFs..." onFocus={() => setActivePage('market-explorer')} readOnly />
              <span style={{ color: '#1E3A5F', fontSize: '11px', fontWeight: 600, background: '#0F1929', border: '1px solid rgba(59,130,246,0.15)', borderRadius: '5px', padding: '2px 5px' }}>/</span>
            </div>

            <div className="header-right" style={{ marginLeft: 'auto' }}>
              {/* Globe — language picker */}
              <div className="header-icon-btn" style={{ position: 'relative' }} onClick={() => { setShowLangPicker(p => !p); setShowNotifs(false); }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
              </div>

              {/* Bell — notifications */}
              <div className="header-icon-btn" style={{ position: 'relative' }} onClick={() => { setShowNotifs(p => !p); setShowLangPicker(false); }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              </div>

              {/* Profile chip */}
              <div className="header-profile" onClick={() => setShowAccountSettings(true)}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, #06B6D4, #3B82F6)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                  {profilePic ? <img src={profilePic} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ color: '#000', fontWeight: 800, fontSize: '11px' }}>{(username||'U')[0].toUpperCase()}</span>}
                </div>
                <div className="header-profile-text">
                  <div className="header-profile-name">{username || 'User'}</div>
                  <div className="header-profile-role">Investor</div>
                </div>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
              </div>
            </div>
          </div>

          {/* ── Language Picker Panel ── */}
          {showLangPicker && (
            <>
              <div onClick={() => setShowLangPicker(false)} style={{ position: 'fixed', inset: 0, zIndex: 199 }} />
              <div style={{ position: 'fixed', top: '68px', right: '96px', background: '#0F1929', border: '1px solid rgba(59,130,246,0.18)', borderRadius: '14px', boxShadow: '0 16px 48px rgba(0,0,0,0.55)', zIndex: 200, overflow: 'hidden', minWidth: '160px' }}>
                <div style={{ padding: '10px 14px 8px', borderBottom: '1px solid rgba(59,130,246,0.08)' }}>
                  <span style={{ color: '#475569', fontSize: '10px', fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase' }}>Language</span>
                </div>
                {[
                  { code: 'id', label: 'Indonesia', flag: '🇮🇩' },
                  { code: 'en', label: 'English',   flag: '🇬🇧' },
                  { code: 'zh', label: '中文',       flag: '🇨🇳' },
                ].map(l => (
                  <div
                    key={l.code}
                    onClick={() => { setLang(l.code); setShowLangPicker(false); }}
                    style={{ padding: '11px 16px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', background: lang.includes(l.code) ? 'rgba(6,182,212,0.07)' : 'transparent', transition: 'background 0.12s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,130,246,0.07)'}
                    onMouseLeave={e => e.currentTarget.style.background = lang.includes(l.code) ? 'rgba(6,182,212,0.07)' : 'transparent'}
                  >
                    <span style={{ fontSize: '17px' }}>{l.flag}</span>
                    <span style={{ color: lang.includes(l.code) ? '#06B6D4' : '#94A3B8', fontSize: '13px', fontWeight: 600, flex: 1 }}>{l.label}</span>
                    {lang.includes(l.code) && (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#06B6D4" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── Notification Panel ── */}
          {showNotifs && (
            <>
              <div onClick={() => setShowNotifs(false)} style={{ position: 'fixed', inset: 0, zIndex: 199 }} />
              <div style={{ position: 'fixed', top: '68px', right: '56px', width: '300px', background: '#0F1929', border: '1px solid rgba(59,130,246,0.18)', borderRadius: '16px', boxShadow: '0 20px 60px rgba(0,0,0,0.55)', zIndex: 200, overflow: 'hidden' }}>
                <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(59,130,246,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#E2E8F0', fontWeight: 700, fontSize: '14px' }}>Notifications</span>
                  <button onClick={() => setShowNotifs(false)} style={{ background: 'none', border: 'none', color: '#334155', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '2px' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  </button>
                </div>
                <div style={{ padding: '36px 20px 32px', textAlign: 'center' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="1.8"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                  </div>
                  <div style={{ color: '#64748B', fontSize: '13px', fontWeight: 600 }}>No notifications yet</div>
                  <div style={{ color: '#334155', fontSize: '11px', marginTop: '6px', lineHeight: 1.5 }}>Portfolio alerts and updates will appear here</div>
                </div>
              </div>
            </>
          )}

          {activePage === 'portfolio' && (
            <>
              <div className="summary-cards">
                <div style={styles.summaryCard}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: '#94A3B8', fontSize: '13px', fontWeight: 600, letterSpacing: '0.5px' }}>{t('total_net_worth')}</span>
                      <button onClick={() => setHideBalance(h => !h)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#334155', padding: '2px', display: 'flex', alignItems: 'center', lineHeight: 1, transition: 'color 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.color='#64748B'} onMouseLeave={e => e.currentTarget.style.color='#334155'}>
                        {hideBalance ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>
                          </svg>
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                          </svg>
                        )}
                      </button>
                    </div>
                    {isMobileViewport ? (
                      <button onClick={scrollToHoldings} style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#06B6D4', fontSize: '11px', fontWeight: 700, backgroundColor: 'rgba(6,182,212,0.1)', border: 'none', padding: '4px 9px', borderRadius: '6px', cursor: 'pointer' }}>
                        {t('view_assets')} <span style={{ fontSize: '12px' }}>›</span>
                      </button>
                    ) : (
                      <span style={{ color: '#06B6D4', fontSize: '11px', backgroundColor: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.15)', padding: '3px 8px', borderRadius: '6px', fontWeight: 600 }}>IDR: {kursIdr.toLocaleString('id-ID')}</span>
                    )}
                  </div>
                  {cryptoLoaded ? (
                    <>
                      <div style={{ color: '#E2E8F0', fontSize: '32px', fontWeight: 800, letterSpacing: '-0.8px', lineHeight: 1.1 }}>
                        {hideBalance ? <span style={{ color: '#1E293B', letterSpacing: '4px' }}>••••••</span> : formatUSD(grandTotalUSD)}
                      </div>
                      <div style={{ color: '#475569', fontSize: '13px', fontWeight: 500, marginTop: '3px' }}>
                        {hideBalance ? <span style={{ color: '#1E293B', letterSpacing: '3px' }}>••••••</span> : formatIDR(grandTotalIDR)}
                      </div>
                      {isMobileViewport && (
                        <div style={{ color: '#334155', fontSize: '10px', fontWeight: 600, marginTop: '4px' }}>IDR: {kursIdr.toLocaleString('id-ID')}</div>
                      )}
                      <div style={{ margin: '14px 0', height: '1px', background: 'rgba(59,130,246,0.1)' }} />
                      <div style={{ display: 'flex', gap: '16px' }}>
                        <div style={{ flex: 1 }}>
                          <span style={{ color: '#64748B', fontSize: '10px', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>{t('overall_pnl')}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ color: isOverallProfit ? '#10B981' : '#EF4444', fontSize: '16px', fontWeight: 800 }}>
                              {hideBalance ? <span style={{ letterSpacing: '3px', fontSize: '13px' }}>••••</span> : <>{isOverallProfit ? '+' : ''}{formatUSD(overallPnlUSD)}</>}
                            </span>
                            {!hideBalance && <span style={{ color: isOverallProfit ? '#10B981' : '#EF4444', fontSize: '11px', fontWeight: 700, backgroundColor: isOverallProfit ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', padding: '2px 6px', borderRadius: '6px' }}>{isOverallProfit ? '+' : ''}{overallPnlPersen.toFixed(2)}%</span>}
                          </div>
                          <div style={{ color: '#475569', fontSize: '11px', marginTop: '4px', fontWeight: 500 }}>
                            {hideBalance ? '' : <>{isOverallProfit ? '+' : ''}{formatIDR(overallPnlIDR)}</>}
                          </div>
                        </div>
                        <div style={{ width: '1px', background: 'rgba(59,130,246,0.1)' }} />
                        <div style={{ flex: 1 }}>
                          <span style={{ color: '#64748B', fontSize: '10px', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>{t('day_pnl')}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ color: isDailyProfit ? '#10B981' : '#EF4444', fontSize: '16px', fontWeight: 800 }}>
                              {hideBalance ? <span style={{ letterSpacing: '3px', fontSize: '13px' }}>••••</span> : <>{isDailyProfit ? '+' : ''}{formatUSD(dailyPnlUSD)}</>}
                            </span>
                            {!hideBalance && <span style={{ color: isDailyProfit ? '#10B981' : '#EF4444', fontSize: '11px', fontWeight: 700, backgroundColor: isDailyProfit ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', padding: '2px 6px', borderRadius: '6px' }}>{isDailyProfit ? '+' : ''}{dailyPnlPersen.toFixed(2)}%</span>}
                          </div>
                          <div style={{ color: '#475569', fontSize: '11px', marginTop: '4px', fontWeight: 500 }}>
                            {hideBalance ? '' : <>{isDailyProfit ? '+' : ''}{formatIDR(dailyPnlUSD * kursIdr)}</>}
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="skeleton" style={{ width: '70%', height: 32, marginBottom: 6 }} />
                      <div className="skeleton" style={{ width: '50%', height: 16 }} />
                      <div style={{ margin: '14px 0', height: '1px', background: 'rgba(59,130,246,0.08)' }} />
                      <div style={{ display: 'flex', gap: '16px' }}>
                        <div className="skeleton" style={{ flex: 1, height: 32, borderRadius: 8 }} />
                        <div className="skeleton" style={{ flex: 1, height: 32, borderRadius: 8 }} />
                      </div>
                    </>
                  )}
                </div>

                <div style={styles.summaryCard}>
                  <span style={{ color: '#94A3B8', fontSize: '13px', fontWeight: 600, letterSpacing: '0.5px', display: 'block', marginBottom: '14px' }}>{t('pnl_breakdown')}</span>
                  {cryptoLoaded ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', flex: 1 }}>
                      {[
                        { label: t('crypto_usd'),      val: pnlCryptoUSD,    sub: formatIDR(pnlCryptoUSD * kursIdr),    fmt: formatUSD },
                        { label: t('commodities_usd'), val: pnlKomoditasUSD, sub: formatIDR(pnlKomoditasUSD * kursIdr), fmt: formatUSD },
                        { label: t('stock_idx_idr'),   val: pnlSahamIDX_IDR, sub: formatUSD(pnlSahamIDX_IDR / kursIdr), fmt: formatIDR },
                        { label: t('stock_us_usd'),    val: pnlSahamUS_USD,  sub: formatIDR(pnlSahamUS_USD * kursIdr),  fmt: formatUSD },
                      ].map(({ label, val, sub, fmt }, idx) => (
                        <div key={label} style={{ padding: `${idx >= 2 ? '12px' : '0'} ${idx % 2 === 0 ? '12px' : '0'} ${idx < 2 ? '12px' : '0'} ${idx % 2 === 1 ? '12px' : '0'}`, borderRight: idx % 2 === 0 ? '1px solid rgba(59,130,246,0.08)' : 'none', borderBottom: idx < 2 ? '1px solid rgba(59,130,246,0.08)' : 'none', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                          <span style={{ color: '#64748B', fontSize: '10px', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>{label}</span>
                          <span style={{ color: val >= 0 ? '#10B981' : '#EF4444', fontSize: '16px', fontWeight: 800, margin: '4px 0 2px' }}>{val >= 0 ? '+' : ''}{fmt(val)}</span>
                          <span style={{ color: '#475569', fontSize: '11px', fontWeight: 500 }}>{val >= 0 ? '+' : ''}{sub}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: '8px', flex: 1 }}>
                      {[0,1,2,3].map(i => <div key={i} className="skeleton" style={{ borderRadius: 8 }} />)}
                    </div>
                  )}
                </div>

                <NetWorthTrendCard data={chartData} color={chartColor} isError={chartError} period={period} setPeriod={setPeriod} periodsList={PERIODS} onDetailClick={() => setActivePage('networth-detail')} t={t} />
              </div>

              <div className="market-section">
                {/* Row 2: 6 price cards + Asset Allocation + Positions */}
                <div style={{ display: 'grid', gridTemplateColumns: isMobileViewport ? '1fr' : '1fr 0.9fr 0.9fr', gap: '14px', alignItems: 'stretch' }}>
                  <div className="market-mini-grid" style={{ minWidth: 0 }}>
                    {renderSingleCard('BTC',    'BTC')}
                    {renderSingleCard('ETH',    'ETH')}
                    {renderSingleCard('GOLD',   'Gold XAU')}
                    {renderSingleCard('XAG',    'Silver XAG')}
                    {renderSingleCard('SPX500', 'S&P 500')}
                    {renderSingleCard('IHSG',   'IHSG')}
                  </div>
                  <AssetClassCard assets={assets} getLivePrice={getLivePrice} grandTotalUSD={grandTotalUSD} kursIdr={kursIdr} />
                  <PositionsCard  assets={assets} getLivePrice={getLivePrice} grandTotalUSD={grandTotalUSD} kursIdr={kursIdr} />
                </div>

                {/* Row 3: Asset Perf 24H + Macro Pulse + Portfolio Movers */}
                <div style={{ display: 'grid', gridTemplateColumns: isMobileViewport ? '1fr' : '1.25fr 1fr 1fr', gap: '14px', alignItems: 'stretch' }}>
                  <AssetClassPerformanceCard marketData={marketData} />
                  <MacroPulseCard marketData={marketData} />
                  <PortfolioMoversCard assets={assets} hargaMap={hargaMap} hargaSaham={hargaSaham} marketData={marketData} kursIdr={kursIdr} />
                </div>
              </div>

              <div ref={holdingsRef} style={{ borderRadius: '16px', border: '1px solid rgba(59,130,246,0.15)', overflow: 'hidden', background: '#0F1929', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
                <div className="holdings-header" style={{ padding: '16px 24px', borderBottom: '1px solid rgba(59,130,246,0.08)' }}>
                  <div>
                    <h3 style={{ color: '#E2E8F0', fontSize: '15px', fontWeight: 800, margin: 0, letterSpacing: '-0.2px' }}>{t('holdings')}</h3>
                    <span style={{ color: '#334155', fontSize: '11px', marginTop: '3px', display: 'block' }}>{assets.length} {t('registered_assets')}</span>
                  </div>
                  <button onClick={() => setShowAddModal(true)} style={{ background: 'linear-gradient(135deg, #06B6D4, #3B82F6)', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(6,182,212,0.25)', letterSpacing: '0.3px' }}>+ Add Asset</button>
                </div>
                <div style={{ paddingBottom: '18px' }}>
                  {[
                    { type: 'crypto',     label: t('cat_crypto'),    color: '#F59E0B', list: assets.filter(a => a.type === 'crypto') },
                    { type: 'saham_us',   label: t('cat_saham_us'),  color: '#EC4899', list: assets.filter(a => a.type === 'saham_us') },
                    { type: 'saham',      label: t('cat_saham_idx'), color: '#3B82F6', list: assets.filter(a => a.type === 'saham') },
                    { type: 'komoditas',  label: t('cat_komoditas'), color: '#EAB308', list: assets.filter(a => a.type === 'komoditas') },
                    { type: 'cashstable', label: t('cash_stable'),   color: '#10B981', list: assets.filter(a => a.type === 'stable' || a.type === 'cash_idr') },
                  ].map(({ type, label, color, list }) => (
                    <div key={type}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 20px 4px' }}>
                        <div style={{ width: '3px', height: '12px', borderRadius: '2px', backgroundColor: color, flexShrink: 0 }} />
                        <span style={{ color: color, fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.8 }}>{label}</span>
                        <span style={{ color: '#1E293B', fontSize: '10px', fontWeight: 600, marginLeft: 'auto' }}>{list.length}</span>
                      </div>
                      {list.length > 0 ? list.map((asset, idx) => (
                        <DataRow key={asset.id} asset={asset} isLast={idx === list.length - 1} hargaLiveUSD={['crypto', 'komoditas', 'saham_us'].includes(asset.type) ? getLivePrice(asset) : undefined} hargaLiveIDR={asset.type === 'saham' ? getLivePrice(asset) : undefined} kursIdr={kursIdr} totalNetWorthUSD={grandTotalUSD} onRowClick={handleRowClick} t={t} />
                      )) : (
                        <div style={{ padding: '10px 28px 20px' }}>
                          <div style={{ padding: '16px', border: '1px dashed rgba(59,130,246,0.1)', borderRadius: '10px', textAlign: 'center', color: '#334155', fontSize: '11px', fontWeight: 500 }}>{t('no_assets')} {label}</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {activePage === 'market-explorer' && (
            <MarketExplorerPage t={t} />
          )}

          {activePage === 'market-overview' && (
            <MarketOverviewPage t={t} />
          )}

          {activePage === 'watchlist' && (
            <WatchlistPage />
          )}

          {activePage === 'networth-detail' && (
            <NetWorthDetailPage onBack={() => setActivePage('portfolio')} chartData={chartData} currentNetWorth={grandTotalUSD} overallPnlUSD={overallPnlUSD} overallPnlPersen={overallPnlPersen} assets={assets} dailyPnlUSD={dailyPnlUSD} hargaMap={hargaMap} hargaSaham={hargaSaham} kursIdr={kursIdr} marketData={marketData} t={t} />
          )}
          
          {activePage === 'news' && (
            <MarketNewsPage assets={assets} t={t} />
          )}

          {activePage === 'multi-chart' && (
            <MultiChartPage />
          )}
        </div>
      </div>

      {showAddModal && <AddAssetModal onSave={handleAddAsset} onClose={() => setShowAddModal(false)} t={t} />}
      {deleteConfirm && <ConfirmDeleteModal asset={deleteConfirm} onConfirm={() => { handleDeleteAsset(deleteConfirm.id); setDeleteConfirm(null); }} onCancel={() => setDeleteConfirm(null)} t={t} />}

      {showAccountSettings && (
        <AccountSettingsModal
          username={username}
          profilePic={profilePic}
          email={email}
          onSave={handleSaveAccountSettings}
          onClose={() => setShowAccountSettings(false)}
          t={t}
        />
      )}

      {/* Task 3: Floating action menu — muncul saat asset row diklik/tap.
          Desktop: dropdown nempel di posisi klik. Mobile: bottom sheet slide-up. */}
      {actionMenuAsset && (
        <AssetActionMenu
          asset={actionMenuAsset}
          anchorPos={actionMenuPos}
          isMobile={isMobileViewport}
          onEdit={openEdit}
          onDelete={setDeleteConfirm}
          onClose={closeActionMenu}
          t={t}
        />
      )}

      {editingAsset && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: '#0F1929', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '16px', padding: '32px', width: '360px', boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}>
            <h2 style={{ color: '#E2E8F0', fontSize: '20px', fontWeight: 700, margin: '0 0 8px' }}>{t('top_up')} {editingAsset.ticker}</h2>
            <p style={{ color: '#64748B', fontSize: '13px', margin: '0 0 24px' }}>{t('your_current_avg')} <b style={{ color: '#E2E8F0' }}>{editingAsset.type === 'saham' ? 'Rp' : '$'}{editingAsset.avg}</b></p>
            {editingAsset.type !== 'cash_idr' && (
              <>
                <label style={{ color: '#94A3B8', fontSize: '13px', fontWeight: 500 }}>{t('new_buy_price')} ({editingAsset.type === 'saham' ? 'IDR' : 'USD'})</label>
                <input type="number" placeholder="0" value={editForm.harga} onChange={e => setEditForm(p => ({ ...p, harga: e.target.value }))} style={styles.modalInput} />
              </>
            )}
            <label style={{ color: '#94A3B8', fontSize: '13px', fontWeight: 500, marginTop: '16px', display: 'block' }}>
              {t('amount_added')} ({editingAsset.type === 'saham' ? t('sheet') : editingAsset.type === 'cash_idr' ? t('rupiah') : t('coin')})
            </label>
            <input type="number" placeholder="0" value={editForm.jumlah} onChange={e => setEditForm(p => ({ ...p, jumlah: e.target.value }))} style={styles.modalInput} />
            <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
              <button onClick={() => setEditingAsset(null)} style={{ flex: 1, backgroundColor: 'rgba(59,130,246,0.08)', color: '#94A3B8', border: '1px solid rgba(59,130,246,0.15)', borderRadius: '8px', padding: '12px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>{t('cancel')}</button>
              <button onClick={() => handleSave(editingAsset.id, parseFloat(editForm.harga || 0), parseFloat(editForm.jumlah || 0))} style={{ flex: 1, background: 'linear-gradient(135deg,#06B6D4,#3B82F6)', color: 'white', border: 'none', borderRadius: '8px', padding: '12px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>{t('save')}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Floating AI Chat Panel ── */}
      {showAiChat && (
        <div style={{
          position: 'fixed',
          bottom: isMobileViewport ? 0 : '92px',
          right: isMobileViewport ? 0 : '24px',
          left: isMobileViewport ? 0 : 'auto',
          width: isMobileViewport ? '100%' : '400px',
          height: isMobileViewport ? '82vh' : '580px',
          zIndex: 250,
          borderRadius: isMobileViewport ? '20px 20px 0 0' : '20px',
          overflow: 'hidden',
          boxShadow: '0 24px 80px rgba(0,0,0,0.8)',
          animation: 'aiPanelIn 0.22s cubic-bezier(0.34,1.56,0.64,1)',
        }}>
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
            t={t}
          />
        </div>
      )}

      {/* ── AI FAB Button ── */}
      <button
        onClick={() => setShowAiChat(prev => !prev)}
        title={t('ai_consultant')}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '52px',
          height: '52px',
          borderRadius: '16px',
          background: showAiChat
            ? '#0F1929'
            : 'linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%)',
          border: showAiChat ? '1px solid rgba(59,130,246,0.25)' : 'none',
          cursor: 'pointer',
          zIndex: 260,
          boxShadow: showAiChat
            ? '0 4px 20px rgba(0,0,0,0.5)'
            : '0 8px 28px rgba(6,182,212,0.4), 0 2px 8px rgba(59,130,246,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.22s cubic-bezier(0.23,1,0.32,1)',
        }}
      >
        {showAiChat ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M12 3L13.4 9.6L20 11L13.4 12.4L12 19L10.6 12.4L4 11L10.6 9.6L12 3Z" fill="white" opacity="0.95"/>
            <path d="M5.5 4.5L6.1 7.1L8.5 7.5L6.1 7.9L5.5 10.5L4.9 7.9L2.5 7.5L4.9 7.1L5.5 4.5Z" fill="white" opacity="0.5"/>
            <path d="M19 15L19.4 17L21 17.5L19.4 18L19 20L18.6 18L17 17.5L18.6 17L19 15Z" fill="white" opacity="0.35"/>
          </svg>
        )}
      </button>
    </div>
  );
}

const styles = {
  summaryCard:    { backgroundColor: '#0F1929', border: '1px solid rgba(59,130,246,0.14)', borderRadius: '16px', padding: '16px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' },
  marketCardMini: { backgroundColor: '#0F1929', borderRadius: '11px', padding: '9px 12px', border: '1px solid rgba(59,130,246,0.12)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 4px 16px rgba(0,0,0,0.2)', minHeight: '68px', minWidth: 0, overflow: 'hidden' },
  modalInput:     { width: '100%', backgroundColor: '#0F1929', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '10px', padding: '12px 16px', color: '#E2E8F0', fontSize: '16px', outline: 'none', marginTop: '8px', boxSizing: 'border-box', fontWeight: 500 },
};

export default App;