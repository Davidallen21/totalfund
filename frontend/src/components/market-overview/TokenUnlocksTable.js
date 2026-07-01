// To replace with real TokenUnlocks.com or Unlocks Calendar API
const C = {
  border: 'rgba(255,255,255,0.06)',
  text:   '#e5e5e5',
  text2:  '#a3a3a3',
  text3:  '#737373',
  text4:  '#3a3a3a',
  gold:   '#F3BA2F',
};

const UNLOCKS = [
  { coin:'ARB',  name:'Arbitrum',      days:2,  usd:930_000_000, pct:5.78, type:'Team'       },
  { coin:'OP',   name:'Optimism',      days:4,  usd:520_000_000, pct:2.34, type:'Investors'  },
  { coin:'APT',  name:'Aptos',         days:8,  usd:280_000_000, pct:3.12, type:'Foundation' },
  { coin:'SUI',  name:'Sui',           days:14, usd:190_000_000, pct:1.87, type:'Team'       },
  { coin:'STRK', name:'Starknet',      days:19, usd:440_000_000, pct:4.23, type:'Investors'  },
  { coin:'PYTH', name:'Pyth Network',  days:27, usd:125_000_000, pct:1.34, type:'Team'       },
  { coin:'TIA',  name:'Celestia',      days:31, usd:670_000_000, pct:6.45, type:'Foundation' },
  { coin:'JUP',  name:'Jupiter',       days:45, usd:210_000_000, pct:1.05, type:'Airdrop'    },
];

const TYPE_COLOR = {
  Team:       '#f87171',
  Investors:  '#fbbf24',
  Foundation: '#60a5fa',
  Airdrop:    '#a78bfa',
};

function urgencyColor(days) {
  if (days <= 3)  return '#f87171';
  if (days <= 7)  return '#fbbf24';
  if (days <= 14) return '#a3a3a3';
  return '#3a3a3a';
}

function urgencyBg(days) {
  if (days <= 3) return 'rgba(248,113,113,0.07)';
  if (days <= 7) return 'rgba(251,191,36,0.05)';
  return 'transparent';
}

function fmtUSD(n) {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  return `$${(n / 1e6).toFixed(0)}M`;
}

export default function TokenUnlocksTable() {
  return (
    <div style={{ overflowX:'auto' }}>
      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
        <thead>
          <tr style={{ borderBottom:`1px solid rgba(255,255,255,0.08)` }}>
            {['Token','Unlock In','Cliff Amount','% Supply','Category'].map((h, i) => (
              <th key={h} style={{
                padding:'5px 10px',
                textAlign: i === 0 ? 'left' : i >= 3 ? 'right' : 'left',
                color: C.text4, fontSize:9,
                textTransform:'uppercase', letterSpacing:'0.07em',
                fontWeight:600, whiteSpace:'nowrap',
              }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {UNLOCKS.map((row) => (
            <tr key={row.coin} style={{ background:urgencyBg(row.days), borderBottom:`1px solid ${C.border}` }}>
              {/* Token */}
              <td style={{ padding:'8px 10px' }}>
                <div style={{ color:C.text, fontWeight:700, fontSize:12 }}>{row.coin}</div>
                <div style={{ color:C.text3, fontSize:10 }}>{row.name}</div>
              </td>

              {/* Unlock In */}
              <td style={{ padding:'8px 10px', whiteSpace:'nowrap' }}>
                <span style={{ color:urgencyColor(row.days), fontWeight:800, fontFamily:'monospace', fontSize:13 }}>
                  {row.days}d
                </span>
                {row.days <= 3 && (
                  <span style={{ marginLeft:6, fontSize:8, color:'#f87171', fontWeight:700, background:'rgba(248,113,113,0.15)', padding:'1px 5px', borderRadius:3 }}>
                    SOON
                  </span>
                )}
              </td>

              {/* Amount */}
              <td style={{ padding:'8px 10px' }}>
                <span style={{ color:C.gold, fontWeight:700, fontFamily:'monospace', fontSize:12 }}>
                  {fmtUSD(row.usd)}
                </span>
              </td>

              {/* % of Supply */}
              <td style={{ padding:'8px 10px', textAlign:'right' }}>
                <div style={{ display:'flex', alignItems:'center', gap:6, justifyContent:'flex-end' }}>
                  <div style={{ width:36, height:3, background:'#1a1a1a', borderRadius:2, overflow:'hidden' }}>
                    <div style={{ width:`${Math.min(100, row.pct * 12)}%`, height:'100%', background:urgencyColor(row.days) }} />
                  </div>
                  <span style={{ color:C.text2, fontFamily:'monospace', fontSize:11, minWidth:32, textAlign:'right' }}>
                    {row.pct}%
                  </span>
                </div>
              </td>

              {/* Type */}
              <td style={{ padding:'8px 10px', textAlign:'right' }}>
                <span style={{
                  color: TYPE_COLOR[row.type] || C.text3,
                  fontSize:9, fontWeight:700,
                  background:`${TYPE_COLOR[row.type] || C.text3}15`,
                  padding:'2px 6px', borderRadius:3,
                  textTransform:'uppercase', letterSpacing:'0.05em',
                  whiteSpace:'nowrap',
                }}>
                  {row.type}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
