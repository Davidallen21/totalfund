// src/networthtrend.js
// v11 — Fixed Duplicate Export Bug, Added Stroke & Grid, Fullscreen Support

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  ComposedChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Treemap,
} from 'recharts';
import {
  ChevronRight, TrendingUp, TrendingDown, Activity,
  DollarSign, Info, BarChart2, Zap,
} from 'lucide-react';

// ==========================================
// KAMUS MINI LOKAL (KHUSUS HALAMAN ANALYTICS)
// ==========================================
const LOCAL_DICT = {
  id: {
    nw_trend: 'Trend Kekayaan', failed_chart: 'Gagal memuat chart', detail: 'Detail',
    analytics_title: 'Portfolio Analytics', analytics_desc: 'Performa & metrik detail aset lu',
    curr_nw: 'Current Net Worth', tot_gain: 'Total Gain/Loss', day_pnl: '1-Day PnL',
    asset_dom: 'Asset Dominance', volatility: 'Volatilitas', annualized: 'Annualized',
    not_enough_data: 'Data kurang', sharpe: 'Sharpe Ratio', good: 'Bagus', fair: 'Cukup',
    bad: 'Buruk', risk_free: 'Risk-free 5.5% pa', max_dd: 'Max Drawdown', drop_from_peak: 'Penurunan dari peak',
    target: 'Target', reached: 'tercapai', set_target: 'Tap untuk set target →',
    perf_history: 'Performance History', portfolio: 'Portofolio', loading_hist: 'Data historis sedang dimuat atau belum cukup tersedia.',
    daily_movers: 'Daily Movers', top_gainers: 'Top Gainers', top_losers: 'Top Losers',
    no_gainer: 'Tidak ada gainer hari ini', no_loser: 'Tidak ada loser hari ini',
    add_holdings_movers: 'Tambahkan holdings untuk melihat daily movers.', no_live_data: 'Data harga live belum tersedia.',
    recent_hist: 'Recent History', date: 'Tanggal', change: 'Change', latest: 'Terbaru',
    no_hist: 'Belum ada riwayat data yang cukup.', assets_count: 'Aset', empty: 'Kosong',
    diverse: 'Beragam', stock: 'Saham', stable_cash: 'Stable/Cash',
    low_vol: 'Vol Rendah', med_vol: 'Vol Sedang', high_vol: 'Vol Tinggi'
  },
  en: {
    nw_trend: 'Net Worth Trend', failed_chart: 'Failed to load chart', detail: 'Detail',
    analytics_title: 'Portfolio Analytics', analytics_desc: 'Your asset performance & detailed metrics',
    curr_nw: 'Current Net Worth', tot_gain: 'Total Gain/Loss', day_pnl: '1-Day PnL',
    asset_dom: 'Asset Dominance', volatility: 'Volatility', annualized: 'Annualized',
    not_enough_data: 'Not enough data', sharpe: 'Sharpe Ratio', good: 'Good', fair: 'Fair',
    bad: 'Bad', risk_free: 'Risk-free 5.5% pa', max_dd: 'Max Drawdown', drop_from_peak: 'Drop from peak',
    target: 'Target', reached: 'reached', set_target: 'Tap to set target →',
    perf_history: 'Performance History', portfolio: 'Portfolio', loading_hist: 'Historical data is loading or insufficient.',
    daily_movers: 'Daily Movers', top_gainers: 'Top Gainers', top_losers: 'Top Losers',
    no_gainer: 'No gainers today', no_loser: 'No losers today',
    add_holdings_movers: 'Add holdings to see daily movers.', no_live_data: 'Live price data is unavailable.',
    recent_hist: 'Recent History', date: 'Date', change: 'Change', latest: 'Latest',
    no_hist: 'Not enough history data yet.', assets_count: 'Assets', empty: 'Empty',
    diverse: 'Diverse', stock: 'Stock', stable_cash: 'Stable/Cash',
    low_vol: 'Low Vol', med_vol: 'Med Vol', high_vol: 'High Vol'
  },
  zh: {
    nw_trend: '净资产趋势', failed_chart: '无法加载图表', detail: '详情',
    analytics_title: '投资组合分析', analytics_desc: '您的资产表现和详细指标',
    curr_nw: '当前净资产', tot_gain: '总盈亏', day_pnl: '单日盈亏',
    asset_dom: '主要资产', volatility: '波动率', annualized: '年化',
    not_enough_data: '数据不足', sharpe: '夏普比率', good: '好', fair: '一般',
    bad: '差', risk_free: '无风险利率 5.5%', max_dd: '最大回撤', drop_from_peak: '从高点回落',
    target: '目标', reached: '已达成', set_target: '点击设置目标 →',
    perf_history: '历史表现', portfolio: '投资组合', loading_hist: '历史数据正在加载或数据不足。',
    daily_movers: '今日动向', top_gainers: '涨幅榜', top_losers: '跌幅榜',
    no_gainer: '今日无上涨资产', no_loser: '今日无下跌资产',
    add_holdings_movers: '添加持仓以查看今日动向。', no_live_data: '无法获取实时价格数据。',
    recent_hist: '最近历史', date: '日期', change: '变动', latest: '最新',
    no_hist: '历史数据不足。', assets_count: '资产', empty: '空',
    diverse: '多样化', stock: '股票', stable_cash: '稳定币/现金',
    low_vol: '低波动', med_vol: '中波动', high_vol: '高波动'
  }
};

const getLocalT = (key, globalT) => {
  try {
    let rawLang = window.localStorage.getItem('totalfund_lang') || '';
    let lang = rawLang.replace(/[^a-zA-Z]/g, '').toLowerCase();

    if (!['id', 'en', 'zh'].includes(lang)) {
      const bLang = (navigator.language || '').toLowerCase();
      lang = bLang.includes('id') ? 'id' : bLang.includes('zh') ? 'zh' : 'en';
    }

    return LOCAL_DICT[lang]?.[key] || (globalT && globalT(key)) || key;
  } catch (e) {
    return (globalT && globalT(key)) || key;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────────────────────────────────────────
const formatCurrency = (val) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(val) || 0);

const formatPct = (val) =>
  `${Number(val) >= 0 ? '+' : ''}${(Number(val) || 0).toFixed(2)}%`;

const normalizeDate = (raw) => {
  if (raw === null || raw === undefined) return null;
  if (raw instanceof Date) return isNaN(raw.getTime()) ? null : raw;

  if (typeof raw === 'number') {
    const d = raw < 1e10 ? new Date(raw * 1000) : new Date(raw);
    return isNaN(d.getTime()) ? null : d;
  }

  if (typeof raw === 'string') {
    let d = new Date(raw);
    if (!isNaN(d.getTime())) return d;

    const m = raw.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
    if (m) {
      d = new Date(`${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`);
      if (!isNaN(d.getTime())) return d;
    }

    const m2 = raw.match(/^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})$/);
    if (m2) {
      d = new Date(`${m2[1]}-${m2[2].padStart(2, '0')}-${m2[3].padStart(2, '0')}`);
      if (!isNaN(d.getTime())) return d;
    }

    return null;
  }

  return null;
};

const enrichAssets = (rawAssets, hargaMap = {}, hargaSaham = {}, kursIdr = 16200, marketData = {}) => {
  if (!Array.isArray(rawAssets)) return [];
  const safeKurs = kursIdr > 0 ? kursIdr : 16200;

  return rawAssets.map((a) => {
    if (!a || typeof a !== 'object') return null;

    const type   = a.type   || 'aset';
    const avg    = Number(a.avg    || 0);
    const jumlah = Number(a.jumlah || 0);
    const ticker = (a.ticker || a.simbol || 'UNKNOWN').toUpperCase();

    let livePrice    = null;
    let dayChangePct = 0;

    if (type === 'crypto' && a.simbol) {
      livePrice    = hargaMap?.[a.simbol]?.usd   ?? null;
      dayChangePct = hargaMap?.[a.simbol]?.change ?? 0;
    } else if (type === 'saham') {
      livePrice    = hargaSaham?.[a.ticker] ?? null;
      dayChangePct = marketData?.IHSG?.change   ?? 0;
    } else if (type === 'saham_us') {
      livePrice    = hargaSaham?.[a.simbol || a.ticker] ?? null;
      dayChangePct = marketData?.SPX500?.change ?? 0;
    } else if (type === 'komoditas') {
      livePrice    = hargaSaham?.[a.simbol || a.ticker] ?? null;
      const komTicker = (a.simbol || a.ticker || '').toUpperCase();
      if (komTicker.includes('GC') || komTicker === 'GOLD')  dayChangePct = marketData?.GOLD?.change  ?? 0;
      else if (komTicker.includes('SI') || komTicker === 'XAG') dayChangePct = marketData?.XAG?.change ?? 0;
      else if (komTicker.includes('BZ') || komTicker === 'BRENT') dayChangePct = marketData?.BRENT?.change ?? 0;
    } else if (type === 'stable') {
      livePrice = avg;
    }

    let valueUSD = 0, costUSD = 0;

    if (type === 'cash_idr') {
      valueUSD = jumlah / safeKurs;
      costUSD  = valueUSD;
    } else if (type === 'stable') {
      valueUSD = avg * jumlah;
      costUSD  = valueUSD;
    } else if (livePrice !== null) {
      const rawVal  = livePrice * jumlah;
      const rawCost = avg * jumlah;
      if (type === 'saham') {
        valueUSD = rawVal  / safeKurs;
        costUSD  = rawCost / safeKurs;
      } else {
        valueUSD = rawVal;
        costUSD  = rawCost;
      }
    } else {
      const rawFallback = avg * jumlah;
      valueUSD = type === 'saham' ? rawFallback / safeKurs : rawFallback;
      costUSD  = valueUSD;
    }

    const canPnl      = !['stable', 'cash_idr'].includes(type) && livePrice !== null;
    const gainLoss    = canPnl ? valueUSD - costUSD : null;
    const gainLossPct = canPnl && costUSD > 0 ? (gainLoss / costUSD) * 100 : null;

    return { ticker, name: a.nama || a.ticker || 'Unknown', type, value: valueUSD, costBasis: costUSD, gainLoss, gainLossPct, dayChangePct };
  }).filter(Boolean);
};

const isValidChartPoint = (pt) => {
  if (!Array.isArray(pt) || pt.length < 2) return false;
  const d = normalizeDate(pt[0]);
  if (!d) return false;
  const v = Number(pt[1]);
  return !isNaN(v);
};

const safeChartPoints = (raw) => {
  const arr = Array.isArray(raw) ? raw : (raw?.prices || []);
  return arr
    .filter(isValidChartPoint)
    .map((pt) => {
      const d = normalizeDate(pt[0]);
      return {
        date:    d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
        rawDate: d,
        value:   Number(pt[1]),
      };
    })
    .sort((a, b) => a.rawDate - b.rawDate);
};

// ─────────────────────────────────────────────────────────────────────────────
// PERIOD CONFIG
// ─────────────────────────────────────────────────────────────────────────────
const PERIODS = [
  { label: '1D',  days: 1    },
  { label: '7D',  days: 7    },
  { label: '1M',  days: 30   },
  { label: '6M',  days: 180  },
  { label: '1Y',  days: 365  },
  { label: '5Y',  days: 1825 },
  { label: 'All', days: null },
];

const filterByPeriod = (points, periodDays) => {
  if (!periodDays || points.length === 0) return points;

  const now = new Date();
  const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate() - periodDays);

  return points.filter((pt) => {
    const d = pt.rawDate instanceof Date ? pt.rawDate : normalizeDate(pt.rawDate);
    return d && d >= cutoff;
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// BENCHMARK
// ─────────────────────────────────────────────────────────────────────────────
const BENCHMARK_RETURNS = {
  IHSG:     { annual: 0.065, volatility: 0.14 },
  'S&P500': { annual: 0.105, volatility: 0.18 },
};
const COMPARE_COLORS  = { IHSG: '#f59e0b', 'S&P500': '#a855f7' };
const API_BASE_NW = process.env.REACT_APP_API_URL ?? '';
const BENCHMARK_ENDPOINTS = {
  IHSG:     `${API_BASE_NW}/api/market/ihsg`,
  'S&P500': `${API_BASE_NW}/api/market/sp500`,
};

const generateBenchmarkSim = (points, key, returnMode) => {
  if (points.length < 2) return [];
  const params = BENCHMARK_RETURNS[key];
  const baseValue  = points[0].value;
  const dailyRet   = params.annual / 252;
  const dailyVol   = params.volatility / Math.sqrt(252);
  let seed = key === 'IHSG' ? 42 : 137;
  const rand  = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const randn = () => Math.sqrt(-2 * Math.log(rand() + 1e-10)) * Math.cos(2 * Math.PI * rand());
  let cum = baseValue;
  return points.map((pt, i) => {
    if (i === 0) return { date: pt.date, [key]: returnMode === 'pct' ? 0 : Math.round(baseValue) };
    cum *= (1 + dailyRet + dailyVol * randn());
    const val = returnMode === 'pct'
      ? parseFloat(((cum - baseValue) / baseValue * 100).toFixed(2))
      : Math.round(cum);
    return { date: pt.date, [key]: val };
  });
};

const alignRealtimeBenchmark = (portfolioPoints, rawBenchData, key, returnMode) => {
  const arr = Array.isArray(rawBenchData)
    ? rawBenchData
    : rawBenchData?.prices || rawBenchData?.data || [];

  if (!arr.length || portfolioPoints.length < 2) return null;

  const benchParsed = arr
    .map((pt) => {
      const d = normalizeDate(Array.isArray(pt) ? pt[0] : pt.timestamp || pt.date);
      const v = Number(Array.isArray(pt) ? pt[1] : pt.value || pt.close || pt.price);
      return d && !isNaN(v) ? { d, v } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.d - b.d);

  if (!benchParsed.length) return null;

  const nearest = (targetDate) => {
    let best = benchParsed[0], bestDiff = Math.abs(targetDate - best.d);
    for (const bp of benchParsed) {
      const diff = Math.abs(targetDate - bp.d);
      if (diff < bestDiff) { bestDiff = diff; best = bp; }
    }
    return best.v;
  };

  const basePortfolio = portfolioPoints[0].value;
  const baseBench     = nearest(portfolioPoints[0].rawDate);

  return portfolioPoints.map((pt) => {
    const bRaw = nearest(pt.rawDate);
    const bVal = baseBench > 0 ? basePortfolio * (bRaw / baseBench) : bRaw;
    const val  = returnMode === 'pct'
      ? parseFloat(((bVal - basePortfolio) / basePortfolio * 100).toFixed(2))
      : Math.round(bVal);
    return { date: pt.date, [key]: val };
  });
};

const useBenchmarkData = (portfolioPoints, activeCompares, returnMode) => {
  const [rtData, setRtData]     = useState({});
  const [rtStatus, setRtStatus] = useState({});

  useEffect(() => {
    if (!activeCompares.length || portfolioPoints.length < 2) return;

    activeCompares.forEach(async (key) => {
      if (rtData[key]) return;
      setRtStatus((prev) => ({ ...prev, [key]: 'loading' }));

      try {
        const controller = new AbortController();
        const timeout    = setTimeout(() => controller.abort(), 4000);

        const res = await fetch(BENCHMARK_ENDPOINTS[key], {
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();

        const aligned = alignRealtimeBenchmark(portfolioPoints, json, key, returnMode);
        if (!aligned) throw new Error('Format tidak cocok');

        setRtData((prev) => ({ ...prev, [key]: aligned }));
        setRtStatus((prev) => ({ ...prev, [key]: 'realtime' }));
      } catch (err) {
        const sim = generateBenchmarkSim(portfolioPoints, key, returnMode);
        setRtData((prev) => ({ ...prev, [key]: sim }));
        setRtStatus((prev) => ({ ...prev, [key]: 'sim' }));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCompares.join(','), portfolioPoints.length, returnMode]);

  useEffect(() => {
    setRtData({});
    setRtStatus({});
  }, [portfolioPoints.length, returnMode]);

  return { rtData, rtStatus };
};

const mergeWithBenchmarks = (points, activeCompares, returnMode, rtData) => {
  const base = points.map((pt, i) => ({
    date:     pt.date,
    value:    returnMode === 'pct'
      ? (i === 0 ? 0 : parseFloat(((pt.value - points[0].value) / points[0].value * 100).toFixed(2)))
      : pt.value,
    rawValue: pt.value,
  }));

  if (!activeCompares.length) return base;

  return base.map((row, i) => {
    const merged = { ...row };
    activeCompares.forEach((key) => {
      const series = rtData[key];
      merged[key] = series?.[i]?.[key] ?? null;
    });
    return merged;
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// ANALYTICS
// ─────────────────────────────────────────────────────────────────────────────
const calcVolatility = (points) => {
  if (points.length < 10) return null;
  const returns = [];
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1].value;
    if (prev === 0) continue;
    returns.push((points[i].value - prev) / prev);
  }
  if (returns.length < 5) return null;
  const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
  const variance = returns.reduce((s, r) => s + (r - mean) ** 2, 0) / returns.length;
  return Math.sqrt(variance) * Math.sqrt(252) * 100;
};

const getVolLabel = (vol, tL) => {
  if (vol === null) return null;
  if (vol < 15)  return { label: tL('low_vol'),    color: '#10B981', bg: '#16a34a18' };
  if (vol < 30)  return { label: tL('med_vol'),    color: '#f59e0b', bg: '#f59e0b18' };
  return               { label: tL('high_vol'),    color: '#ef4444', bg: '#ef444418' };
};

const calcSharpe = (points, riskFreeRate = 0.055) => {
  if (points.length < 10) return null;
  const first = points[0].value, last = points[points.length - 1].value;
  if (first === 0) return null;
  const days = (points[points.length - 1].rawDate - points[0].rawDate) / 86400000;
  if (days < 7) return null;
  const annualReturn = ((last - first) / first) * (365 / days);
  const vol = calcVolatility(points);
  if (!vol || vol === 0) return null;
  return (annualReturn - riskFreeRate) / (vol / 100);
};

const calcMaxDrawdown = (points) => {
  if (points.length < 2) return 0;
  let peak = points[0].value, maxDD = 0;
  for (const pt of points) {
    if (pt.value > peak) peak = pt.value;
    const dd = peak > 0 ? (peak - pt.value) / peak * 100 : 0;
    if (dd > maxDD) maxDD = dd;
  }
  return maxDD;
};

const calcDrawdownSeries = (points) => {
  if (points.length < 2) return [];
  let peak = points[0].value;
  return points.map((pt) => {
    if (pt.value > peak) peak = pt.value;
    return { date: pt.date, drawdown: peak > 0 ? parseFloat(-((peak - pt.value) / peak * 100).toFixed(2)) : 0 };
  });
};

const calcCAGR = (points) => {
  if (points.length < 10) return null;
  const first = points[0].value, last = points[points.length - 1].value;
  if (first <= 0) return null;
  const days = (points[points.length - 1].rawDate - points[0].rawDate) / 86400000;
  if (days < 14) return null;
  const years = days / 365;
  return (Math.pow(last / first, 1 / years) - 1) * 100;
};

const calcWinRate = (points) => {
  if (points.length < 5) return null;
  let wins = 0, total = 0;
  for (let i = 1; i < points.length; i++) {
    if (points[i].value > points[i - 1].value) wins++;
    total++;
  }
  return total > 0 ? (wins / total) * 100 : null;
};

const calcBestWorstDay = (points) => {
  if (points.length < 2) return { best: null, worst: null };
  let best = -Infinity, worst = Infinity;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1].value;
    if (prev === 0) continue;
    const pct = ((points[i].value - prev) / prev) * 100;
    if (pct > best)  best  = pct;
    if (pct < worst) worst = pct;
  }
  return {
    best:  best  > -Infinity ? best  : null,
    worst: worst <  Infinity ? worst : null,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// DAILY MOVERS
// ─────────────────────────────────────────────────────────────────────────────
const DailyMovers = ({ assets, t }) => {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const tL = useCallback((key) => getLocalT(key, t), [t]);

  const TYPE_COLOR = {
    crypto:   '#f59e0b',
    saham:    '#3b82f6',
    saham_us: '#ec4899',
    komoditas:'#eab308',
    stable:   '#10b981',
    cash_idr: '#8b5cf6',
  };

  const { gainers, losers, hasData } = useMemo(() => {
    const tradeable = assets.filter(a =>
      !['stable', 'cash_idr'].includes(a.type) && a.value > 0
    );
    const withDay = tradeable.map(a => ({
      ...a,
      dayUSD: a.value * (a.dayChangePct / 100),
    }));

    const sorted   = [...withDay].sort((a, b) => b.dayChangePct - a.dayChangePct);
    const gainers  = sorted.filter(a => a.dayChangePct > 0).slice(0, 4);
    const losers   = [...withDay].sort((a, b) => a.dayChangePct - b.dayChangePct).filter(a => a.dayChangePct < 0).slice(0, 4);
    const hasData  = withDay.some(a => a.dayChangePct !== 0);

    return { gainers, losers, hasData };
  }, [assets]);

  if (!assets.length) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: 160, opacity: 0.5 }}>
        <TrendingUp size={28} color="#3b82f6" />
        <p style={{ margin: 0, fontSize: 13, color: '#94A3B8', textAlign: 'center' }}>
          {tL('add_holdings_movers')}
        </p>
      </div>
    );
  }

  if (!hasData) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: 160, opacity: 0.5 }}>
        <Activity size={28} color="#737373" />
        <p style={{ margin: 0, fontSize: 13, color: '#94A3B8', textAlign: 'center' }}>
          {tL('no_live_data')}
        </p>
      </div>
    );
  }

  const MoverRow = ({ asset, isGainer }) => {
    const c = isGainer ? '#10B981' : '#EF4444';
    const typeColor = TYPE_COLOR[asset.type] || '#737373';

    const typeLabel = asset.type === 'crypto' ? (t ? t('cat_crypto') : 'Crypto') :
                      asset.type === 'saham' ? (t ? t('cat_saham_idx') : 'Saham IDX') :
                      asset.type === 'saham_us' ? (t ? t('cat_saham_us') : 'Saham US') :
                      asset.type === 'komoditas' ? (t ? t('cat_komoditas') : 'Komoditas') :
                      asset.type === 'stable' ? (t ? t('stablecoin') : 'Stablecoin') :
                      asset.type === 'cash_idr' ? (t ? t('cash_idr') : 'Cash IDR') : asset.type;

    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '7px 10px', borderRadius: 8,
        borderBottom: '1px solid rgba(79,124,255,0.07)',
        transition: 'background 0.15s', cursor: 'default',
      }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(79,124,255,0.05)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <div style={{ width: 26, height: 26, borderRadius: 7, backgroundColor: `${typeColor}18`, border: `1px solid ${typeColor}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 9, fontWeight: 800, color: typeColor }}>{asset.ticker.substring(0, 4)}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#F8FAFC', letterSpacing: '-0.1px' }}>{asset.ticker}</div>
          <div style={{ fontSize: 10, color: '#4A5568', marginTop: 1 }}>{typeLabel}</div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center',
            padding: '2px 8px', borderRadius: 6,
            background: isGainer ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
            border: `1px solid ${isGainer ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
            color: c, fontWeight: 700, fontSize: 11.5,
          }}>{isGainer ? '+' : ''}{asset.dayChangePct.toFixed(2)}%</span>
          <div style={{ fontSize: 10, color: '#4A5568', marginTop: 3, textAlign: 'right' }}>{isGainer ? '+' : ''}{formatCurrency(asset.dayUSD)}</div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, padding: '0 2px' }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: '#22C55E' }} />
          <span style={{ fontSize: 10, fontWeight: 700, color: '#22C55E', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{tL('top_gainers')}</span>
          <span style={{ fontSize: 9.5, color: '#4A5568', marginLeft: 'auto', fontWeight: 600 }}>1D</span>
        </div>
        {gainers.length > 0 ? (
          gainers.map((a, i) => <MoverRow key={i} asset={a} isGainer={true} />)
        ) : (
          <div style={{ padding: '16px 0', textAlign: 'center', color: '#4A5568', fontSize: 12 }}>{tL('no_gainer')}</div>
        )}
      </div>
      <div style={{ position: 'relative', paddingLeft: 14 }}>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 1, background: 'rgba(79,124,255,0.1)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, padding: '0 2px' }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: '#EF4444' }} />
          <span style={{ fontSize: 10, fontWeight: 700, color: '#EF4444', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{tL('top_losers')}</span>
          <span style={{ fontSize: 9.5, color: '#4A5568', marginLeft: 'auto', fontWeight: 600 }}>1D</span>
        </div>
        {losers.length > 0 ? (
          losers.map((a, i) => <MoverRow key={i} asset={a} isGainer={false} />)
        ) : (
          <div style={{ padding: '16px 0', textAlign: 'center', color: '#4A5568', fontSize: 12 }}>{tL('no_loser')}</div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT 1: WIDGET CARD
// ─────────────────────────────────────────────────────────────────────────────
export function NetWorthTrendCard({
  data, color, isError, period, setPeriod, periodsList, onDetailClick, t
}) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const tL = useCallback((key) => getLocalT(key, t), [t]);

  const chartPoints = useMemo(() => {
    const all = safeChartPoints(data);
    return filterByPeriod(all, period?.days);
  }, [data, period]);

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ backgroundColor: '#111C30', border: "1px solid rgba(79,124,255,0.1)", borderRadius: 8, padding: '10px 12px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
        <p style={{ color: '#94A3B8', fontSize: 11, margin: '0 0 4px' }}>{payload[0].payload?.date || '—'}</p>
        <p style={{ color: '#fff', fontSize: 15, fontWeight: 700, margin: 0 }}>{formatCurrency(payload[0].value)}</p>
      </div>
    );
  };

  return (
    <div style={{ backgroundColor: '#111C30', border: "1px solid rgba(79,124,255,0.1)", borderRadius: 16, padding: '14px 20px', display: 'flex', flexDirection: 'column' }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        <span style={{ color: '#94A3B8', fontSize: 13, fontWeight: 600, letterSpacing: '0.5px', flexShrink: 0 }}>{tL('nw_trend')}</span>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, backgroundColor: '#1a1a1a', padding: '3px 4px', borderRadius: 8, overflowX: 'auto', flexShrink: 1, minWidth: 0 }}>
          {periodsList.map((p) => (
            <button key={p.label} onClick={() => setPeriod(p)} style={{
              backgroundColor: period.label === p.label ? '#333' : 'transparent',
              color: period.label === p.label ? '#fff' : '#737373',
              border: 'none', borderRadius: 6,
              padding: '4px 7px',
              fontSize: 11, fontWeight: 600, cursor: 'pointer',
              transition: 'all 0.15s', flexShrink: 0, whiteSpace: 'nowrap',
            }}>
              {p.label}
            </button>
          ))}
          <div style={{ width: 1, height: 14, backgroundColor: '#333', margin: '0 2px', flexShrink: 0 }} />
          <button onClick={onDetailClick} style={{ backgroundColor: 'transparent', color: '#94A3B8', border: 'none', cursor: 'pointer', padding: '4px 4px', display: 'flex', alignItems: 'center', borderRadius: 6, flexShrink: 0 }}>
            <span style={{ marginRight: '4px', fontSize: '11px', fontWeight: 'bold' }}>{tL('detail')}</span>
            <ChevronRight size={15} />
          </button>
        </div>
      </div>
      
      <div style={{ height: 100, width: '100%' }}>
        {isError && chartPoints.length === 0 ? (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <span style={{ fontSize: 18 }}>📡</span>
            <span style={{ color: '#4b5563', fontSize: 12 }}>{tL('failed_chart')}</span>
          </div>
        ) : chartPoints.length < 2 ? (
          <div style={{ height: '100%', display: 'flex', alignItems: 'flex-end', gap: 3 }}>
            {[40, 65, 50, 75, 55, 80, 60, 90, 70, 85, 65, 95, 75, 88, 72].map((h, i) => (
              <div key={i} className="skeleton" style={{ flex: 1, height: `${h}%`, borderRadius: 3 }} />
            ))}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartPoints} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={color} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="rgba(255, 255, 255, 0.08)" />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#555', strokeWidth: 1, strokeDasharray: '4 4' }} />
              <Area type="monotone" dataKey="value" stroke={color} strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT 2: FULL DETAIL PAGE
// ─────────────────────────────────────────────────────────────────────────────
export function NetWorthDetailPage({
  onBack, chartData, currentNetWorth, overallPnlUSD, overallPnlPersen,
  assets: rawAssets, dailyPnlUSD = 0, hargaMap = {}, hargaSaham = {},
  kursIdr = 16200, marketData = {}, t
}) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const tL = useCallback((key) => getLocalT(key, t), [t]);

  const [activePeriod, setActivePeriod]     = useState(PERIODS[2]);
  const [activeCompares, setActiveCompares] = useState([]);
  const [returnMode, setReturnMode]         = useState('abs');
  const [showDrawdown, setShowDrawdown]     = useState(false);
  const [isFullscreen, setIsFullscreen]     = useState(false);

  const chartWrapperRef                     = useRef(null);

  const allChartPoints  = useMemo(() => safeChartPoints(chartData), [chartData]);
  const chartPoints     = useMemo(() => filterByPeriod(allChartPoints, activePeriod.days), [allChartPoints, activePeriod]);
  const drawdownSeries  = useMemo(() => calcDrawdownSeries(chartPoints), [chartPoints]);

  const { rtData, rtStatus } = useBenchmarkData(chartPoints, activeCompares, returnMode);
  const mergedChartData = useMemo(
    () => mergeWithBenchmarks(chartPoints, activeCompares, returnMode, rtData),
    [chartPoints, activeCompares, returnMode, rtData],
  );

  const assets    = useMemo(() => enrichAssets(rawAssets, hargaMap, hargaSaham, kursIdr, marketData), [rawAssets, hargaMap, hargaSaham, kursIdr, marketData]);
  const safeNW    = Number(currentNetWorth) || 0;
  const safePnl   = Number(overallPnlUSD)   || 0;
  const safePct   = Number(overallPnlPersen) || 0;
  const safeDaily = Number(dailyPnlUSD)     || 0;
  const volatility  = useMemo(() => calcVolatility(chartPoints), [chartPoints]);
  const volInfo     = useMemo(() => getVolLabel(volatility, tL), [volatility, tL]);
  const sharpe      = useMemo(() => calcSharpe(chartPoints), [chartPoints]);
  const maxDrawdown = useMemo(() => calcMaxDrawdown(chartPoints), [chartPoints]);
  const cagr        = useMemo(() => calcCAGR(chartPoints), [chartPoints]);
  const winRate     = useMemo(() => calcWinRate(chartPoints), [chartPoints]);
  const bestWorst   = useMemo(() => calcBestWorstDay(chartPoints), [chartPoints]);



  const metrics = useMemo(() => [
    { label: tL('curr_nw'), value: formatCurrency(safeNW), icon: DollarSign, color: '#3b82f6' },
    { label: tL('tot_gain'), value: formatCurrency(safePnl), subValue: formatPct(safePct), icon: safePnl >= 0 ? TrendingUp : TrendingDown, color: safePnl >= 0 ? '#10B981' : '#ef4444' },
    { label: tL('day_pnl'), value: formatCurrency(safeDaily), subValue: 'Live', icon: safeDaily >= 0 ? TrendingUp : TrendingDown, color: safeDaily >= 0 ? '#f59e0b' : '#ef4444' },
    {
      label: 'CAGR',
      value: cagr !== null ? `${cagr >= 0 ? '+' : ''}${cagr.toFixed(1)}%` : '—',
      subValue: 'Annualized Return',
      icon: Activity,
      color: cagr === null ? '#737373' : cagr >= 0 ? '#10b981' : '#ef4444',
    },
  ], [safeNW, safePnl, safePct, safeDaily, cagr, tL]);

  const historyRows = useMemo(() => {
    if (chartPoints.length < 2) return [];
    return [...chartPoints].reverse().slice(0, 14).map((pt, i, arr) => {
      const prev = arr[i + 1];
      const chg = prev ? pt.value - prev.value : 0;
      const pct = prev && prev.value !== 0 ? (chg / prev.value) * 100 : 0;
      return { date: pt.date, nw: pt.value, chg, pct };
    });
  }, [chartPoints]);

  const toggleCompare = useCallback((key) => {
    setActiveCompares((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);
  }, []);

  const yFormatter = returnMode === 'pct'
    ? (v) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`
    : (v) => `$${v.toLocaleString()}`;

  const tooltipFormatter = (val, name) => {
    const isRealtime  = rtStatus[name] === 'realtime';
    const labelSuffix = name === 'value' ? tL('portfolio') : `${name}${isRealtime ? '' : ' (sim)'}`;
    if (returnMode === 'pct') return [`${val >= 0 ? '+' : ''}${Number(val).toFixed(2)}%`, labelSuffix];
    return [formatCurrency(val), labelSuffix];
  };

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    if (!chartWrapperRef.current) return;

    if (!document.fullscreenElement) {
      try {
        await chartWrapperRef.current.requestFullscreen();
        if (window.screen && window.screen.orientation && window.screen.orientation.lock) {
          await window.screen.orientation.lock('landscape').catch(() => {});
        }
      } catch (err) {
        console.warn("Gagal masuk fullscreen:", err);
      }
    } else {
      try {
        await document.exitFullscreen();
        if (window.screen && window.screen.orientation && window.screen.orientation.unlock) {
          window.screen.orientation.unlock();
        }
      } catch (err) {
        console.warn("Gagal keluar fullscreen:", err);
      }
    }
  };

  const heatmapData = useMemo(() => assets
    .filter(a => a.value > 0)
    .map(a => ({ name: a.ticker, size: a.value, pct: a.gainLossPct, pnl: a.gainLoss })),
  [assets]);

  const heatColor = (pct) => {
    if (pct == null) return '#1e1e1e';
    if (pct >  20) return '#14532d';
    if (pct >  10) return '#15803d';
    if (pct >   5) return '#10B981';
    if (pct >   0) return '#22c55e';
    if (pct > - 5) return '#EF4444';
    if (pct > -10) return '#ef4444';
    if (pct > -20) return '#dc2626';
    return '#7f1d1d';
  };

  const HeatCell = ({ x, y, width, height, name, pct, pnl }) => {
    const c = heatColor(pct);
    const showText = width > 32 && height > 26;
    return (
      <g>
        <rect x={x + 1} y={y + 1} width={width - 2} height={height - 2} fill={c} rx={3} opacity={0.88} />
        {showText && (
          <>
            <text x={x + width / 2} y={y + height / 2 - (height > 44 ? 7 : 0)} textAnchor="middle" fill="#fff" fontSize={Math.min(11, Math.max(8, width / 5))} fontWeight={800} style={{ pointerEvents: 'none' }}>{name}</text>
            {height > 44 && <text x={x + width / 2} y={y + height / 2 + 9} textAnchor="middle" fill="rgba(255,255,255,0.75)" fontSize={8} style={{ pointerEvents: 'none' }}>{pct != null ? `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%` : '—'}</text>}
          </>
        )}
      </g>
    );
  };

  return (
    <div style={{ padding: '0 0 32px 0', maxWidth: 1200, margin: '0 auto', color: '#e5e5e5', boxSizing: 'border-box', width: '100%', overflowX: 'hidden' }}>

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-0.3px' }}>{tL('analytics_title')}</h1>
        <p style={{ margin: '2px 0 0', fontSize: 12, color: '#94A3B8', fontWeight: 500 }}>{tL('analytics_desc')}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 16 }}>
        {metrics.map((m, i) => (
          <div key={i} style={{ backgroundColor: '#111C30', border: "1px solid rgba(79,124,255,0.1)", borderRadius: 14, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{ margin: 0, fontSize: 11, color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{m.label}</p>
                <h3 style={{ margin: '6px 0 4px', fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '-0.3px' }}>{m.value}</h3>
                {m.subValue && <span style={{ fontSize: 11, fontWeight: 600, color: m.color, backgroundColor: `${m.color}15`, padding: '2px 7px', borderRadius: 4 }}>{m.subValue}</span>}
              </div>
              <div style={{ backgroundColor: `${m.color}15`, padding: 8, borderRadius: 10, color: m.color, flexShrink: 0, marginLeft: 8 }}><m.icon size={18} /></div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Risk Metrics ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 16 }}>
        {/* Volatility */}
        <div style={{ backgroundColor: '#111C30', border: "1px solid rgba(79,124,255,0.1)", borderRadius: 12, padding: 14 }}>
          <p style={{ margin: '0 0 6px', fontSize: 11, color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{tL('volatility')}</p>
          {volInfo ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: '#fff', fontFamily: 'monospace' }}>{volatility.toFixed(1)}%</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: volInfo.color, backgroundColor: volInfo.bg, padding: '2px 7px', borderRadius: 4 }}>{volInfo.label}</span>
            </div>
          ) : <span style={{ fontSize: 13, color: '#555' }}>{tL('not_enough_data')}</span>}
          <p style={{ margin: '6px 0 0', fontSize: 10, color: '#555' }}>{tL('annualized')}</p>
        </div>

        {/* Sharpe */}
        <div style={{ backgroundColor: '#111C30', border: "1px solid rgba(79,124,255,0.1)", borderRadius: 12, padding: 14 }}>
          <p style={{ margin: '0 0 6px', fontSize: 11, color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{tL('sharpe')}</p>
          {sharpe !== null ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: '#fff', fontFamily: 'monospace' }}>{sharpe.toFixed(2)}</span>
              <span style={{ fontSize: 10, fontWeight: 700,
                color: sharpe >= 1 ? '#10B981' : sharpe >= 0 ? '#f59e0b' : '#ef4444',
                backgroundColor: sharpe >= 1 ? '#16a34a18' : sharpe >= 0 ? '#f59e0b18' : '#ef444418',
                padding: '2px 7px', borderRadius: 4 }}>
                {sharpe >= 1 ? tL('good') : sharpe >= 0 ? tL('fair') : tL('bad')}
              </span>
            </div>
          ) : <span style={{ fontSize: 13, color: '#555' }}>{tL('not_enough_data')}</span>}
          <p style={{ margin: '6px 0 0', fontSize: 10, color: '#555' }}>{tL('risk_free')}</p>
        </div>

        {/* Max Drawdown */}
        <div style={{ backgroundColor: '#111C30', border: "1px solid rgba(79,124,255,0.1)", borderRadius: 12, padding: 14 }}>
          <p style={{ margin: '0 0 6px', fontSize: 11, color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{tL('max_dd')}</p>
          <span style={{ fontSize: 18, fontWeight: 800, fontFamily: 'monospace', color: maxDrawdown > 20 ? '#ef4444' : maxDrawdown > 10 ? '#f59e0b' : '#fff' }}>
            -{maxDrawdown.toFixed(1)}%
          </span>
          <p style={{ margin: '6px 0 0', fontSize: 10, color: '#555' }}>{tL('drop_from_peak')}</p>
        </div>

        {/* Win Rate */}
        <div style={{ backgroundColor: '#111C30', border: "1px solid rgba(79,124,255,0.1)", borderRadius: 12, padding: 14 }}>
          <p style={{ margin: '0 0 6px', fontSize: 11, color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Win Rate</p>
          {winRate !== null ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 18, fontWeight: 800, color: '#fff', fontFamily: 'monospace' }}>{winRate.toFixed(0)}%</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: winRate >= 55 ? '#10B981' : winRate >= 45 ? '#f59e0b' : '#ef4444', backgroundColor: winRate >= 55 ? '#16a34a18' : winRate >= 45 ? '#f59e0b18' : '#ef444418', padding: '2px 7px', borderRadius: 4 }}>
                  {winRate >= 55 ? 'Solid' : winRate >= 45 ? 'Neutral' : 'Weak'}
                </span>
              </div>
              <div style={{ marginTop: 8, height: 4, backgroundColor: 'rgba(79,124,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${winRate}%`, borderRadius: 2, background: 'linear-gradient(90deg, #16a34a, #10B981)', transition: 'width 0.4s' }} />
              </div>
              <p style={{ margin: '6px 0 0', fontSize: 10, color: '#555' }}>% hari portofolio naik</p>
            </>
          ) : <span style={{ fontSize: 13, color: '#555' }}>{tL('not_enough_data')}</span>}
        </div>

        {/* Best Day */}
        <div style={{ backgroundColor: '#111C30', border: "1px solid rgba(79,124,255,0.1)", borderRadius: 12, padding: 14 }}>
          <p style={{ margin: '0 0 6px', fontSize: 11, color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Best Day</p>
          {bestWorst.best !== null
            ? <span style={{ fontSize: 18, fontWeight: 800, color: '#10B981', fontFamily: 'monospace' }}>+{bestWorst.best.toFixed(2)}%</span>
            : <span style={{ fontSize: 13, color: '#555' }}>{tL('not_enough_data')}</span>}
          <p style={{ margin: '6px 0 0', fontSize: 10, color: '#555' }}>hari terbaik (1D)</p>
        </div>

        {/* Worst Day */}
        <div style={{ backgroundColor: '#111C30', border: "1px solid rgba(79,124,255,0.1)", borderRadius: 12, padding: 14 }}>
          <p style={{ margin: '0 0 6px', fontSize: 11, color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Worst Day</p>
          {bestWorst.worst !== null
            ? <span style={{ fontSize: 18, fontWeight: 800, color: '#EF4444', fontFamily: 'monospace' }}>{bestWorst.worst.toFixed(2)}%</span>
            : <span style={{ fontSize: 13, color: '#555' }}>{tL('not_enough_data')}</span>}
          <p style={{ margin: '6px 0 0', fontSize: 10, color: '#555' }}>hari terburuk (1D)</p>
        </div>
      </div>

      <div
        ref={chartWrapperRef}
        style={{
          backgroundColor: '#111C30',
          border: isFullscreen ? 'none' : '1px solid rgba(79,124,255,0.1)',
          borderRadius: isFullscreen ? '0' : 16, 
          padding: '20px 16px', 
          marginBottom: 16, 
          overflowX: 'hidden',
          width: '100%',
          height: isFullscreen ? '100vh' : 'auto',
          position: 'relative'
        }}
      >
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#fff' }}>{tL('perf_history')}</h2>
            
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: 1, backgroundColor: '#1a1a1a', padding: 3, borderRadius: 8 }}>
                {[{ v: 'abs', lbl: '$' }, { v: 'pct', lbl: '%' }].map(({ v, lbl }) => (
                  <button key={v} onClick={() => setReturnMode(v)} style={{ backgroundColor: returnMode === v ? '#2a2a2a' : 'transparent', color: returnMode === v ? '#fff' : '#737373', border: returnMode === v ? '1px solid #3a3a3a' : '1px solid transparent', borderRadius: 6, padding: '4px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    {lbl}
                  </button>
                ))}
              </div>
              <button onClick={() => setShowDrawdown((v) => !v)} style={{ backgroundColor: showDrawdown ? '#ef444418' : 'transparent', color: showDrawdown ? '#EF4444' : '#737373', border: `1px solid ${showDrawdown ? '#ef4444' : '#333'}`, borderRadius: 6, padding: '4px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                <BarChart2 size={13} />DD
              </button>

              <button
                onClick={toggleFullscreen}
                style={{
                  backgroundColor: 'rgba(20, 20, 20, 0.75)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#e5e5e5',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '12px',
                  fontWeight: 700,
                  transition: 'all 0.2s ease',
                  marginLeft: '4px'
                }}
              >
                {isFullscreen ? 'Keluar ⤓' : 'Perluas ⛶'}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 6, alignItems: 'center', overflowX: 'auto', paddingBottom: 2 }}>
            <div style={{ display: 'flex', gap: 1, backgroundColor: '#1a1a1a', padding: 3, borderRadius: 8, flexShrink: 0 }}>
              {PERIODS.map((p) => (
                <button key={p.label} onClick={() => setActivePeriod(p)} style={{ backgroundColor: activePeriod.label === p.label ? '#2a2a2a' : 'transparent', color: activePeriod.label === p.label ? '#fff' : '#737373', border: activePeriod.label === p.label ? '1px solid #3a3a3a' : '1px solid transparent', borderRadius: 6, padding: '4px 8px', fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {p.label}
                </button>
              ))}
            </div>
            <div style={{ width: 1, height: 18, backgroundColor: '#2a2a2a', flexShrink: 0 }} />
            {['IHSG', 'S&P500'].map((key) => {
              const active = activeCompares.includes(key);
              const c      = COMPARE_COLORS[key];
              const status = rtStatus[key];
              return (
                <button key={key} onClick={() => toggleCompare(key)} style={{ backgroundColor: active ? `${c}18` : 'transparent', color: active ? c : '#737373', border: `1px solid ${active ? c : '#333'}`, borderRadius: 6, padding: '4px 8px', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap', flexShrink: 0 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: active ? c : '#555', flexShrink: 0 }} />
                  vs {key}
                  {active && status && status !== 'loading' && (
                    <span style={{ fontSize: 9, fontWeight: 700, color: status === 'realtime' ? '#10B981' : '#f59e0b', backgroundColor: status === 'realtime' ? '#10B98118' : '#f59e0b18', padding: '1px 4px', borderRadius: 3 }}>
                      {status === 'realtime' ? 'LIVE' : 'SIM'}
                    </span>
                  )}
                  {active && status === 'loading' && <span style={{ fontSize: 9, color: '#555' }}>...</span>}
                </button>
              );
            })}
          </div>
        </div>

        {(activeCompares.length > 0 || showDrawdown) && (
          <div style={{ display: 'flex', gap: 14, marginBottom: 10, fontSize: 11, color: '#94A3B8', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ display: 'inline-block', width: 20, height: 2, backgroundColor: '#3b82f6' }} />{tL('portfolio')}
            </span>
            {activeCompares.map((key) => (
              <span key={key} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ display: 'inline-block', width: 20, height: 0, borderTop: `2px dashed ${COMPARE_COLORS[key]}` }} />
                {key}
              </span>
            ))}
            {showDrawdown && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, backgroundColor: '#ef444430' }} />Drawdown
              </span>
            )}
          </div>
        )}

        <div style={{ height: isFullscreen ? 'calc(100vh - 140px)' : 300, width: '100%', transition: 'height 0.3s ease' }}>
          {chartPoints.length >= 2 ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={mergedChartData}>
                <defs>
                  <linearGradient id="gradMain" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  {activeCompares.map((key) => (
                    <linearGradient key={key} id={`gradBench_${key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={COMPARE_COLORS[key]} stopOpacity={0.12} />
                      <stop offset="95%" stopColor={COMPARE_COLORS[key]} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(79,124,255,0.1)" vertical={false} />
                <XAxis dataKey="date" stroke="#555" tick={{ fill: '#737373', fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis yAxisId="main" domain={['auto', 'auto']} stroke="#555" tick={{ fill: '#737373', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={yFormatter} width={returnMode === 'pct' ? 50 : 75} />
                {showDrawdown && <YAxis yAxisId="dd" orientation="right" domain={['auto', 0]} tick={{ fill: '#ef4444', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v.toFixed(0)}%`} width={36} />}
                <Tooltip contentStyle={{ backgroundColor: '#111C30', border: "1px solid rgba(79,124,255,0.1)", borderRadius: 8, fontSize: 12 }} itemStyle={{ fontWeight: 'bold' }} formatter={tooltipFormatter} />
                <Area yAxisId="main" type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#gradMain)" dot={false} />
                {activeCompares.map((key) => (
                  <Area key={key} yAxisId="main" type="monotone" dataKey={key} stroke={COMPARE_COLORS[key]} strokeWidth={2} strokeDasharray="6 3" fillOpacity={1} fill={`url(#gradBench_${key})`} dot={false} activeDot={{ r: 4 }} />
                ))}
                {showDrawdown && drawdownSeries.length > 0 && (
                  <Area yAxisId="dd" data={drawdownSeries} type="monotone" dataKey="drawdown" stroke="#ef4444" strokeWidth={1} fill="#ef444420" fillOpacity={1} dot={false} />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '1px dashed rgba(79,124,255,0.1)', borderRadius: 12, gap: 8 }}>
              <Info color="#737373" size={22} />
              <p style={{ color: '#94A3B8', margin: 0, fontSize: 13, textAlign: 'center', padding: '0 16px' }}>{tL('loading_hist')}</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Portfolio Heatmap ── */}
      {heatmapData.length > 0 && (
        <div style={{ backgroundColor: '#111C30', border: "1px solid rgba(79,124,255,0.1)", borderRadius: 14, padding: 18, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: '#f59e0b', fontSize: 15 }}>▦</span> Portfolio Heatmap
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {[{ v: '< -10%', c: '#dc2626' }, { v: '< 0%', c: '#EF4444' }, { v: '> 0%', c: '#22c55e' }, { v: '> 10%', c: '#15803d' }].map(s => (
                <div key={s.v} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: s.c }} />
                  <span style={{ color: '#555', fontSize: 9, fontFamily: 'monospace' }}>{s.v}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <Treemap data={heatmapData} dataKey="size" content={<HeatCell />} isAnimationActive={false} />
            </ResponsiveContainer>
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 10, color: '#3a3a3a', textAlign: 'center' }}>Block size = portfolio weight · Color = Unrealized PnL %</p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 16 }}>
        <div style={{ backgroundColor: '#111C30', border: "1px solid rgba(79,124,255,0.1)", borderRadius: 16, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: '#f59e0b' }}><Zap size={16} /></span>{tL('daily_movers')}
            </h2>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b', backgroundColor: '#f59e0b12', padding: '2px 8px', borderRadius: 4, border: '1px solid #f59e0b22' }}>1D</span>
          </div>
          <DailyMovers assets={assets} t={t} />
        </div>

        <div style={{ backgroundColor: '#111C30', border: "1px solid rgba(79,124,255,0.1)", borderRadius: 16, padding: 20 }}>
          <h2 style={{ margin: '0 0 18px', fontSize: 15, fontWeight: 700, color: '#fff' }}>{tL('recent_hist')}</h2>
          {historyRows.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(79,124,255,0.12)' }}>
                  {[tL('date'), 'Net Worth', tL('change')].map((h, hi) => (
                    <th key={h} style={{
                      textAlign: hi === 0 ? 'left' : 'right',
                      paddingBottom: 7,
                      color: '#64748B',
                      fontSize: 9.5,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.07em',
                      width: hi === 0 ? '30%' : hi === 1 ? '38%' : '32%',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {historyRows.map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(79,124,255,0.06)', transition: 'background 0.15s', cursor: 'default' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(79,124,255,0.04)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '6px 0', fontSize: 11, color: '#CBD5E1' }}>{i === 0 ? tL('latest') : row.date}</td>
                    <td style={{ padding: '6px 0', fontSize: 11, color: '#F8FAFC', fontWeight: 600, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(row.nw)}</td>
                    <td style={{ padding: '6px 0', textAlign: 'right' }}>
                      {i === historyRows.length - 1 ? (
                        <span style={{ color: '#4A5568', fontSize: 11 }}>—</span>
                      ) : (
                        <span style={{
                          display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1,
                        }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', padding: '1px 7px',
                            borderRadius: 5, fontSize: 10.5, fontWeight: 700,
                            background: row.chg >= 0 ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                            color: row.chg >= 0 ? '#22C55E' : '#EF4444',
                            border: `1px solid ${row.chg >= 0 ? 'rgba(34,197,94,0.18)' : 'rgba(239,68,68,0.18)'}`,
                          }}>{row.pct >= 0 ? '+' : ''}{row.pct.toFixed(2)}%</span>
                          <span style={{ color: '#4A5568', fontSize: 9.5, fontVariantNumeric: 'tabular-nums' }}>{row.chg >= 0 ? '+' : ''}{formatCurrency(row.chg)}</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ padding: 16, textAlign: 'center', color: '#4A5568', fontSize: 13, border: '1px dashed rgba(79,124,255,0.1)', borderRadius: 8 }}>
              {tL('no_hist')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}