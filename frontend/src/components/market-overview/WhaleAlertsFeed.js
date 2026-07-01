import { useState, useEffect, useRef } from 'react';

const C = {
  border: 'rgba(255,255,255,0.06)',
  text:   '#e5e5e5',
  text2:  '#a3a3a3',
  text3:  '#737373',
  text4:  '#3a3a3a',
  green:  '#4ade80',
  red:    '#f87171',
  yellow: '#fbbf24',
  gold:   '#F3BA2F',
  card3:  '#1a1a1a',
};

// To replace with real Whale Alert API
const ALERT_POOL = [
  { coin:'BTC',  amount:1500,         usd:91_500_000,  from:'Unknown Wallet', to:'Binance',       type:'exchange_in'  },
  { coin:'USDT', amount:15_000_000,   usd:15_000_000,  from:'Tether Treasury',to:'OKX',           type:'mint'         },
  { coin:'ETH',  amount:12000,        usd:40_200_000,  from:'Coinbase',       to:'Unknown Wallet', type:'exchange_out' },
  { coin:'BTC',  amount:500,          usd:30_500_000,  from:'Kraken',         to:'Kraken',         type:'internal'     },
  { coin:'ETH',  amount:8900,         usd:29_835_000,  from:'Unknown Wallet', to:'Binance',        type:'exchange_in'  },
  { coin:'USDC', amount:200_000_000,  usd:200_000_000, from:'Circle',         to:'Coinbase Prime', type:'mint'         },
  { coin:'BTC',  amount:2200,         usd:134_200_000, from:'Unknown Wallet', to:'Unknown Wallet', type:'transfer'     },
  { coin:'BTC',  amount:3400,         usd:207_400_000, from:'Binance',        to:'Unknown Wallet', type:'exchange_out' },
  { coin:'SOL',  amount:250_000,      usd:42_500_000,  from:'Unknown Wallet', to:'Bybit',          type:'exchange_in'  },
  { coin:'XRP',  amount:180_000_000,  usd:54_000_000,  from:'Ripple Labs',    to:'Unknown Wallet', type:'transfer'     },
  { coin:'USDT', amount:50_000_000,   usd:50_000_000,  from:'OKX',            to:'Unknown Wallet', type:'exchange_out' },
  { coin:'ETH',  amount:5500,         usd:18_425_000,  from:'Unknown Wallet', to:'Unknown Wallet', type:'transfer'     },
  { coin:'BNB',  amount:85_000,       usd:52_530_000,  from:'Binance',        to:'Unknown Wallet', type:'exchange_out' },
  { coin:'SOL',  amount:95_000,       usd:16_150_000,  from:'Jump Trading',   to:'Unknown Wallet', type:'transfer'     },
  { coin:'BTC',  amount:800,          usd:48_800_000,  from:'Unknown Wallet', to:'Kraken',         type:'exchange_in'  },
];

// exchange_in = deposit to exchange (bearish signal), exchange_out = withdrawal (bullish)
const TYPE_META = {
  exchange_in:  { icon:'↓', label:'→ Exchange', color:'#f87171', hint:'Sell signal' },
  exchange_out: { icon:'↑', label:'← Withdraw', color:'#4ade80', hint:'Buy signal'  },
  transfer:     { icon:'→', label:'Whale Move',  color:'#fbbf24', hint:'Watch'       },
  mint:         { icon:'✦', label:'Minted',      color:'#a78bfa', hint:'Supply++'    },
  internal:     { icon:'⇄', label:'Internal',    color:'#737373', hint:''            },
};

function fmtUSD(n) {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${(n / 1e3).toFixed(0)}K`;
}

function fmtAmt(amount, coin) {
  if (['USDT','USDC','USDS'].includes(coin)) return fmtUSD(amount);
  if (amount >= 1_000_000) return `${(amount / 1e6).toFixed(1)}M`;
  if (amount >= 1_000)     return `${(amount / 1e3).toFixed(1)}K`;
  return amount.toLocaleString();
}

function fmtAgo(ms) {
  const s = Math.floor(ms / 1000);
  if (s < 60)  return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60)  return `${m}m`;
  return `${Math.floor(m / 60)}h`;
}

export default function WhaleAlertsFeed() {
  const counterRef = useRef(ALERT_POOL.length);
  const [alerts, setAlerts] = useState(() =>
    ALERT_POOL.slice(0, 10).map((a, i) => ({
      ...a, id: i,
      ts: Date.now() - i * 3 * 60 * 1000 - Math.random() * 60 * 1000,
    }))
  );

  // Simulate new on-chain alerts
  useEffect(() => {
    const id = setInterval(() => {
      const base = ALERT_POOL[Math.floor(Math.random() * ALERT_POOL.length)];
      setAlerts(prev => [{ ...base, id: counterRef.current++, ts: Date.now() }, ...prev].slice(0, 25));
    }, 10000);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:0, maxHeight:360, overflowY:'auto' }}>
      {alerts.map((a, i) => {
        const meta = TYPE_META[a.type] ?? TYPE_META.transfer;
        const isFresh = Date.now() - a.ts < 12000;
        return (
          <div key={a.id} style={{
            display:'grid', gridTemplateColumns:'16px 1fr auto',
            gap:8, padding:'8px 0',
            borderBottom:`1px solid ${C.border}`,
            background: isFresh ? `${meta.color}10` : 'transparent',
            transition:'background 1s ease',
            alignItems:'flex-start',
          }}>
            {/* Direction icon */}
            <span style={{ color:meta.color, fontSize:10, fontWeight:900, lineHeight:'18px', textAlign:'center' }}>
              {meta.icon}
            </span>

            {/* Body */}
            <div style={{ minWidth:0 }}>
              <div style={{ fontSize:11, fontWeight:700, color:C.text, lineHeight:1.5 }}>
                <span style={{ color:C.gold, fontFamily:'monospace' }}>
                  {fmtAmt(a.amount, a.coin)} {a.coin}
                </span>
                {' '}
                <span style={{ color:C.text3, fontWeight:500 }}>({fmtUSD(a.usd)})</span>
              </div>
              <div style={{ fontSize:10, color:C.text3, marginTop:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                <span style={{ color:C.text2 }}>{a.from}</span>
                <span style={{ color:C.text4, margin:'0 3px' }}>›</span>
                <span style={{ color:meta.color, fontWeight:600 }}>{a.to}</span>
              </div>
            </div>

            {/* Meta + time */}
            <div style={{ textAlign:'right', flexShrink:0 }}>
              <div style={{
                color:meta.color, fontSize:8, fontWeight:700,
                background:`${meta.color}18`, padding:'2px 5px', borderRadius:3,
                marginBottom:3, whiteSpace:'nowrap',
              }}>
                {meta.label}
              </div>
              <div style={{ color:C.text4, fontSize:9, fontFamily:'monospace' }}>
                {fmtAgo(Date.now() - a.ts)} ago
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
