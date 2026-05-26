// src/networthtrend.js
// v8 — Mobile responsive fix: no offside scroll, simetris card height, proper wrapping

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  ComposedChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
  AreaChart,
} from 'recharts';
import {
  ChevronRight, ArrowLeft, TrendingUp, TrendingDown, Activity,
  DollarSign, PieChart, Info, Target, BarChart2, Zap,
} from 'lucide-react';

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
const BENCHMARK_ENDPOINTS = {
  IHSG:     'http://localhost:8000/api/market/ihsg',
  'S&P500': 'http://localhost:8000/api/market/sp500',
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

const getVolLabel = (vol) => {
  if (vol === null) return null;
  if (vol < 15)  return { label: 'Low Vol',    color: '#16a34a', bg: '#16a34a18' };
  if (vol < 30)  return { label: 'Medium Vol', color: '#f59e0b', bg: '#f59e0b18' };
  return               { label: 'High Vol',    color: '#ef4444', bg: '#ef444418' };
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

// ─────────────────────────────────────────────────────────────────────────────
// DAILY MOVERS
// ─────────────────────────────────────────────────────────────────────────────
const DailyMovers = ({ assets }) => {
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
        <p style={{ margin: 0, fontSize: 13, color: '#737373', textAlign: 'center' }}>
          Tambahkan holdings untuk melihat daily movers.
        </p>
      </div>
    );
  }

  if (!hasData) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: 160, opacity: 0.5 }}>
        <Activity size={28} color="#737373" />
        <p style={{ margin: 0, fontSize: 13, color: '#737373', textAlign: 'center' }}>
          Data harga live belum tersedia.
        </p>
      </div>
    );
  }

  const MoverRow = ({ asset, isGainer }) => {
    const c = isGainer ? '#4ade80' : '#f87171';
    const typeColor = TYPE_COLOR[asset.type] || '#737373';
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid #1a1a1a' }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: `${typeColor}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 10, fontWeight: 800, color: typeColor }}>{asset.ticker.substring(0, 4)}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#e5e5e5', letterSpacing: '-0.2px' }}>{asset.ticker}</div>
          <div style={{ fontSize: 10, color: '#555', marginTop: 1 }}>{asset.type}</div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: c }}>{isGainer ? '+' : ''}{asset.dayChangePct.toFixed(2)}%</div>
          <div style={{ fontSize: 10, color: '#555', marginTop: 1 }}>{isGainer ? '+' : ''}{formatCurrency(asset.dayUSD)}</div>
        </div>
        <div style={{ width: 22, height: 22, borderRadius: 6, backgroundColor: isGainer ? '#4ade8010' : '#f8717110', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {isGainer ? <TrendingUp size={11} color={c} /> : <TrendingDown size={11} color={c} />}
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#4ade80' }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: '#4ade80', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Top Gainers</span>
          <span style={{ fontSize: 10, color: '#555', marginLeft: 'auto' }}>1D</span>
        </div>
        {gainers.length > 0 ? (
          gainers.map((a, i) => <MoverRow key={i} asset={a} isGainer={true} />)
        ) : (
          <div style={{ padding: '20px 0', textAlign: 'center', color: '#444', fontSize: 12 }}>Tidak ada gainer hari ini</div>
        )}
      </div>
      <div style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', left: -10, top: 0, bottom: 0, width: 1, backgroundColor: '#1e1e1e' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#f87171' }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Top Losers</span>
          <span style={{ fontSize: 10, color: '#555', marginLeft: 'auto' }}>1D</span>
        </div>
        {losers.length > 0 ? (
          losers.map((a, i) => <MoverRow key={i} asset={a} isGainer={false} />)
        ) : (
          <div style={{ padding: '20px 0', textAlign: 'center', color: '#444', fontSize: 12 }}>Tidak ada loser hari ini</div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT 1: WIDGET CARD
// FIX: Hapus height:'100%' dari outer div. Tinggi dikontrol dari parent (App.js).
//      Chart height dikurangi ke 120px agar simetris dgn kolom market cards.
//      Period buttons compact, wrap jika overflow.
// ─────────────────────────────────────────────────────────────────────────────
export function NetWorthTrendCard({
  data, color, isError, period, setPeriod, periodsList, onDetailClick,
}) {
  const chartPoints = useMemo(() => {
    const all = safeChartPoints(data);
    return filterByPeriod(all, period?.days);
  }, [data, period]);

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ backgroundColor: '#141414', border: '1px solid #262626', borderRadius: 8, padding: '10px 12px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
        <p style={{ color: '#a3a3a3', fontSize: 11, margin: '0 0 4px' }}>{payload[0].payload?.date || '—'}</p>
        <p style={{ color: '#fff', fontSize: 15, fontWeight: 700, margin: 0 }}>{formatCurrency(payload[0].value)}</p>
      </div>
    );
  };

  return (
    // FIX: Hapus height:'100%' — biarkan parent mengontrol tinggi via CSS grid/align-items
    <div style={{ backgroundColor: '#141414', border: '1px solid #262626', borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column' }}>
      
      {/* Header: label + period controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <span style={{ color: '#a3a3a3', fontSize: 13, fontWeight: 600, letterSpacing: '0.5px', flexShrink: 0 }}>Net Worth Trend</span>
        
        {/* Period buttons — compact, scrollable on narrow mobile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, backgroundColor: '#1a1a1a', padding: '3px 4px', borderRadius: 8, overflowX: 'auto', flexShrink: 1, minWidth: 0 }}>
          {periodsList.map((p) => (
            <button key={p.label} onClick={() => setPeriod(p)} style={{
              backgroundColor: period.label === p.label ? '#333' : 'transparent',
              color: period.label === p.label ? '#fff' : '#737373',
              border: 'none', borderRadius: 6,
              // FIX: padding lebih kecil supaya muat di mobile
              padding: '4px 7px',
              fontSize: 11, fontWeight: 600, cursor: 'pointer',
              transition: 'all 0.15s', flexShrink: 0, whiteSpace: 'nowrap',
            }}>
              {p.label}
            </button>
          ))}
          <div style={{ width: 1, height: 14, backgroundColor: '#333', margin: '0 2px', flexShrink: 0 }} />
          <button onClick={onDetailClick} style={{ backgroundColor: 'transparent', color: '#a3a3a3', border: 'none', cursor: 'pointer', padding: '4px 4px', display: 'flex', alignItems: 'center', borderRadius: 6, flexShrink: 0 }}>
            <ChevronRight size={15} />
          </button>
        </div>
      </div>
      
      {/* FIX: Chart tinggi 120px — simetris dengan layout market cards */}
      <div style={{ height: 120, width: '100%' }}>
        {isError && chartPoints.length === 0 ? (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <span style={{ fontSize: 18 }}>📡</span>
            <span style={{ color: '#4b5563', fontSize: 12 }}>Tidak dapat memuat chart</span>
          </div>
        ) : chartPoints.length < 2 ? (
          <div style={{ height: '100%', display: 'flex', alignItems: 'flex-end', gap: 3 }}>
            {[40, 65, 50, 75, 55, 80, 60, 90, 70, 85, 65, 95, 75, 88, 72].map((h, i) => (
              <div key={i} className="skeleton" style={{ flex: 1, height: `${h}%`, borderRadius: 3 }} />
            ))}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartPoints}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#333', strokeWidth: 1, strokeDasharray: '4 4' }} />
              <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fillOpacity={1} fill="url(#colorValue)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT 2: FULL DETAIL PAGE
// FIX: padding box-sizing + overflow-x:hidden, semua grid pakai auto-fit,
//      bottom section stack di mobile.
// ─────────────────────────────────────────────────────────────────────────────
export function NetWorthDetailPage({
  onBack, chartData, currentNetWorth, overallPnlUSD, overallPnlPersen,
  assets: rawAssets, dailyPnlUSD = 0, hargaMap = {}, hargaSaham = {},
  kursIdr = 16200, marketData = {},
}) {
  const [activePeriod, setActivePeriod]     = useState(PERIODS[2]);
  const [activeCompares, setActiveCompares] = useState([]);
  const [returnMode, setReturnMode]         = useState('abs');
  const [showDrawdown, setShowDrawdown]     = useState(false);
  const [targetNW, setTargetNW]             = useState('');
  const [editingTarget, setEditingTarget]   = useState(false);
  const targetInputRef                      = useRef(null);

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
  const hasAssets = assets.length > 0;

  const volatility  = useMemo(() => calcVolatility(chartPoints), [chartPoints]);
  const volInfo     = useMemo(() => getVolLabel(volatility), [volatility]);
  const sharpe      = useMemo(() => calcSharpe(chartPoints), [chartPoints]);
  const maxDrawdown = useMemo(() => calcMaxDrawdown(chartPoints), [chartPoints]);

  const { cryptoCount, stockCount, stableCount } = useMemo(() => {
    let cc = 0, sc = 0, stc = 0;
    assets.forEach((a) => {
      if (a.type === 'crypto') cc++;
      else if (a.type === 'saham' || a.type === 'saham_us') sc++;
      else stc++;
    });
    return { cryptoCount: cc, stockCount: sc, stableCount: stc };
  }, [assets]);

  const dominantAsset = useMemo(() => {
    if (!hasAssets) return 'Kosong';
    if (cryptoCount > stockCount && cryptoCount > stableCount) return 'Crypto';
    if (stockCount  > cryptoCount && stockCount  > stableCount) return 'Saham';
    if (stableCount > 0) return 'Stable/Cash';
    return 'Beragam';
  }, [hasAssets, cryptoCount, stockCount, stableCount]);

  const targetValue    = useMemo(() => { const v = parseFloat(targetNW.replace(/[^0-9.]/g, '')); return isNaN(v) || v <= 0 ? null : v; }, [targetNW]);
  const targetProgress = useMemo(() => { if (!targetValue || safeNW <= 0) return null; return Math.min((safeNW / targetValue) * 100, 100); }, [targetValue, safeNW]);

  const metrics = useMemo(() => [
    { label: 'Current Net Worth', value: formatCurrency(safeNW), icon: DollarSign, color: '#3b82f6' },
    { label: 'Total Gain/Loss',   value: formatCurrency(safePnl), subValue: formatPct(safePct), icon: safePnl >= 0 ? TrendingUp : TrendingDown, color: safePnl >= 0 ? '#16a34a' : '#ef4444' },
    { label: '1-Day PnL',         value: formatCurrency(safeDaily), subValue: 'Live', icon: safeDaily >= 0 ? TrendingUp : TrendingDown, color: safeDaily >= 0 ? '#f59e0b' : '#ef4444' },
    { label: 'Asset Dominance',   value: dominantAsset, subValue: hasAssets ? `${assets.length} Aset` : '0 Aset', icon: PieChart, color: '#ec4899' },
  ], [safeNW, safePnl, safePct, safeDaily, dominantAsset, hasAssets, assets.length]);

  useEffect(() => { if (editingTarget && targetInputRef.current) targetInputRef.current.focus(); }, [editingTarget]);

  const historyRows = useMemo(() => {
    if (chartPoints.length < 2) return [];
    return [...chartPoints].reverse().slice(0, 7).map((pt, i, arr) => {
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
    const labelSuffix = name === 'value' ? 'Portofolio' : `${name}${isRealtime ? '' : ' (sim)'}`;
    if (returnMode === 'pct') return [`${val >= 0 ? '+' : ''}${Number(val).toFixed(2)}%`, labelSuffix];
    return [formatCurrency(val), labelSuffix];
  };

  return (
    // FIX: box-sizing + overflow-x:hidden + padding kecil agar tidak offside di mobile
    <div style={{ padding: '0 0 32px 0', maxWidth: 1200, margin: '0 auto', color: '#e5e5e5', boxSizing: 'border-box', width: '100%', overflowX: 'hidden' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <button onClick={onBack} style={{ backgroundColor: '#1a1a1a', border: '1px solid #262626', color: '#a3a3a3', borderRadius: 10, padding: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#fff' }}>Net Worth Analytics</h1>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#a3a3a3' }}>Analisis mendalam portofolio Anda</p>
        </div>
      </div>

      {/* Metrics Grid — FIX: auto-fit minmax agar stacked di mobile */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 16 }}>
        {metrics.map((m, i) => (
          <div key={i} style={{ backgroundColor: '#141414', border: '1px solid #262626', borderRadius: 14, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{ margin: 0, fontSize: 11, color: '#737373', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{m.label}</p>
                <h3 style={{ margin: '6px 0 4px', fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '-0.3px' }}>{m.value}</h3>
                {m.subValue && <span style={{ fontSize: 11, fontWeight: 600, color: m.color, backgroundColor: `${m.color}15`, padding: '2px 7px', borderRadius: 4 }}>{m.subValue}</span>}
              </div>
              <div style={{ backgroundColor: `${m.color}15`, padding: 8, borderRadius: 10, color: m.color, flexShrink: 0, marginLeft: 8 }}><m.icon size={18} /></div>
            </div>
          </div>
        ))}
      </div>

      {/* Analytics Row — FIX: auto-fit, minmax 150px */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 16 }}>
        <div style={{ backgroundColor: '#141414', border: '1px solid #262626', borderRadius: 12, padding: 14 }}>
          <p style={{ margin: '0 0 6px', fontSize: 11, color: '#737373', fontWeight: 600, textTransform: 'uppercase' }}>Volatilitas</p>
          {volInfo ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 17, fontWeight: 800, color: '#fff' }}>{volatility.toFixed(1)}%</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: volInfo.color, backgroundColor: volInfo.bg, padding: '2px 7px', borderRadius: 4 }}>{volInfo.label}</span>
            </div>
          ) : <span style={{ fontSize: 13, color: '#555' }}>Data kurang</span>}
          <p style={{ margin: '4px 0 0', fontSize: 11, color: '#555' }}>Annualized</p>
        </div>

        <div style={{ backgroundColor: '#141414', border: '1px solid #262626', borderRadius: 12, padding: 14 }}>
          <p style={{ margin: '0 0 6px', fontSize: 11, color: '#737373', fontWeight: 600, textTransform: 'uppercase' }}>Sharpe Ratio</p>
          {sharpe !== null ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 17, fontWeight: 800, color: '#fff' }}>{sharpe.toFixed(2)}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: sharpe >= 1 ? '#16a34a' : sharpe >= 0 ? '#f59e0b' : '#ef4444', backgroundColor: sharpe >= 1 ? '#16a34a18' : sharpe >= 0 ? '#f59e0b18' : '#ef444418', padding: '2px 7px', borderRadius: 4 }}>
                {sharpe >= 1 ? 'Bagus' : sharpe >= 0 ? 'Cukup' : 'Buruk'}
              </span>
            </div>
          ) : <span style={{ fontSize: 13, color: '#555' }}>Data kurang</span>}
          <p style={{ margin: '4px 0 0', fontSize: 11, color: '#555' }}>Risk-free 5.5% pa</p>
        </div>

        <div style={{ backgroundColor: '#141414', border: '1px solid #262626', borderRadius: 12, padding: 14 }}>
          <p style={{ margin: '0 0 6px', fontSize: 11, color: '#737373', fontWeight: 600, textTransform: 'uppercase' }}>Max Drawdown</p>
          <span style={{ fontSize: 17, fontWeight: 800, color: maxDrawdown > 20 ? '#ef4444' : maxDrawdown > 10 ? '#f59e0b' : '#fff' }}>
            -{maxDrawdown.toFixed(1)}%
          </span>
          <p style={{ margin: '4px 0 0', fontSize: 11, color: '#555' }}>Penurunan dari peak</p>
        </div>

        <div style={{ backgroundColor: '#141414', border: '1px solid #262626', borderRadius: 12, padding: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <p style={{ margin: 0, fontSize: 11, color: '#737373', fontWeight: 600, textTransform: 'uppercase' }}>Target</p>
            <button onClick={() => setEditingTarget((v) => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555', padding: 0 }}><Target size={14} /></button>
          </div>
          {editingTarget ? (
            <input ref={targetInputRef} type="text" placeholder="cth: 50000" value={targetNW}
              onChange={(e) => setTargetNW(e.target.value)} onBlur={() => setEditingTarget(false)}
              style={{ width: '100%', backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: 6, padding: '6px 8px', color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
            />
          ) : targetValue ? (
            <>
              <span style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>{formatCurrency(targetValue)}</span>
              <div style={{ marginTop: 8, height: 4, backgroundColor: '#262626', borderRadius: 2 }}>
                <div style={{ height: '100%', borderRadius: 2, width: `${targetProgress}%`, backgroundColor: targetProgress >= 100 ? '#16a34a' : '#3b82f6', transition: 'width 0.4s ease' }} />
              </div>
              <p style={{ margin: '4px 0 0', fontSize: 11, color: '#555' }}>{targetProgress.toFixed(1)}% tercapai</p>
            </>
          ) : (
            <span style={{ fontSize: 13, color: '#555', cursor: 'pointer' }} onClick={() => setEditingTarget(true)}>Tap untuk set target →</span>
          )}
        </div>
      </div>

      {/* ── Performance Chart ── */}
      <div style={{ backgroundColor: '#141414', border: '1px solid #262626', borderRadius: 16, padding: '20px 16px', marginBottom: 16, overflowX: 'hidden' }}>
        
        {/* Chart controls — FIX: wrap semua, jangan overflow */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#fff' }}>Performance History</h2>
            {/* Mode + Drawdown toggle */}
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: 1, backgroundColor: '#1a1a1a', padding: 3, borderRadius: 8 }}>
                {[{ v: 'abs', lbl: '$' }, { v: 'pct', lbl: '%' }].map(({ v, lbl }) => (
                  <button key={v} onClick={() => setReturnMode(v)} style={{ backgroundColor: returnMode === v ? '#2a2a2a' : 'transparent', color: returnMode === v ? '#fff' : '#737373', border: returnMode === v ? '1px solid #3a3a3a' : '1px solid transparent', borderRadius: 6, padding: '4px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    {lbl}
                  </button>
                ))}
              </div>
              <button onClick={() => setShowDrawdown((v) => !v)} style={{ backgroundColor: showDrawdown ? '#ef444418' : 'transparent', color: showDrawdown ? '#f87171' : '#737373', border: `1px solid ${showDrawdown ? '#ef4444' : '#333'}`, borderRadius: 6, padding: '4px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                <BarChart2 size={13} />DD
              </button>
            </div>
          </div>

          {/* Period + Compare — satu baris, scrollable */}
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
                    <span style={{ fontSize: 9, fontWeight: 700, color: status === 'realtime' ? '#4ade80' : '#f59e0b', backgroundColor: status === 'realtime' ? '#4ade8018' : '#f59e0b18', padding: '1px 4px', borderRadius: 3 }}>
                      {status === 'realtime' ? 'LIVE' : 'SIM'}
                    </span>
                  )}
                  {active && status === 'loading' && <span style={{ fontSize: 9, color: '#555' }}>...</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        {(activeCompares.length > 0 || showDrawdown) && (
          <div style={{ display: 'flex', gap: 14, marginBottom: 10, fontSize: 11, color: '#a3a3a3', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ display: 'inline-block', width: 20, height: 2, backgroundColor: '#3b82f6' }} />Portofolio
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

        {/* FIX: Chart height 300px (sedikit dikurangi untuk mobile) */}
        <div style={{ height: 300, width: '100%' }}>
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
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                <XAxis dataKey="date" stroke="#555" tick={{ fill: '#737373', fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis yAxisId="main" domain={['auto', 'auto']} stroke="#555" tick={{ fill: '#737373', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={yFormatter} width={returnMode === 'pct' ? 50 : 75} />
                {showDrawdown && <YAxis yAxisId="dd" orientation="right" domain={['auto', 0]} tick={{ fill: '#ef4444', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v.toFixed(0)}%`} width={36} />}
                <Tooltip contentStyle={{ backgroundColor: '#141414', border: '1px solid #262626', borderRadius: 8, fontSize: 12 }} itemStyle={{ fontWeight: 'bold' }} formatter={tooltipFormatter} />
                {targetValue && returnMode === 'abs' && (
                  <ReferenceLine yAxisId="main" y={targetValue} stroke="#3b82f6" strokeDasharray="8 4" strokeWidth={1.5} label={{ value: 'Target', fill: '#3b82f6', fontSize: 10, position: 'insideTopRight' }} />
                )}
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
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '1px dashed #262626', borderRadius: 12, gap: 8 }}>
              <Info color="#737373" size={22} />
              <p style={{ color: '#737373', margin: 0, fontSize: 13, textAlign: 'center', padding: '0 16px' }}>Data historis sedang dimuat atau belum cukup tersedia.</p>
            </div>
          )}
        </div>
      </div>

      {/* FIX: Daily Movers + History — stack di mobile pakai auto-fit */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 16 }}>
        <div style={{ backgroundColor: '#141414', border: '1px solid #262626', borderRadius: 16, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: '#f59e0b' }}><Zap size={16} /></span>Daily Movers
            </h2>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b', backgroundColor: '#f59e0b12', padding: '2px 8px', borderRadius: 4, border: '1px solid #f59e0b22' }}>1D</span>
          </div>
          <DailyMovers assets={assets} />
        </div>

        <div style={{ backgroundColor: '#141414', border: '1px solid #262626', borderRadius: 16, padding: 20 }}>
          <h2 style={{ margin: '0 0 18px', fontSize: 15, fontWeight: 700, color: '#fff' }}>Recent History</h2>
          {historyRows.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #262626' }}>
                  {['Tanggal', 'Net Worth', 'Change'].map((h) => (
                    <th key={h} style={{ textAlign: h === 'Tanggal' ? 'left' : 'right', paddingBottom: 10, color: '#737373', fontSize: 10, fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {historyRows.map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #1f1f1f' }}>
                    <td style={{ padding: '10px 0', fontSize: 12, color: '#d4d4d8' }}>{i === 0 ? 'Terbaru' : row.date}</td>
                    <td style={{ padding: '10px 0', fontSize: 12, color: '#fff', fontWeight: 600, textAlign: 'right' }}>{formatCurrency(row.nw)}</td>
                    <td style={{ padding: '10px 0', fontSize: 12, textAlign: 'right' }}>
                      {i === historyRows.length - 1 ? (
                        <span style={{ color: '#737373' }}>—</span>
                      ) : (
                        <>
                          <div style={{ color: row.chg >= 0 ? '#4ade80' : '#f87171', fontWeight: 700 }}>{row.chg >= 0 ? '+' : ''}{formatCurrency(row.chg)}</div>
                          <div style={{ color: '#555', fontSize: 10, marginTop: 2 }}>{row.pct >= 0 ? '+' : ''}{row.pct.toFixed(2)}%</div>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ padding: 16, textAlign: 'center', color: '#555', fontSize: 13, border: '1px dashed #262626', borderRadius: 8 }}>
              Belum ada riwayat data yang cukup.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}