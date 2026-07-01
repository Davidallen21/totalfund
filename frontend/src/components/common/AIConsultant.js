import { useState, useRef, useEffect } from 'react';
import { API_BASE } from '../../utils/api';
import { formatUSD, formatIDR, renderAIText } from '../../utils/helpers';

export default function AIConsultant({ assets, hargaMap, hargaSaham, kursIdr, grandTotalUSD, grandTotalIDR, overallPnlUSD, overallPnlPersen, marketData, t }) {
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', borderRadius: '20px', border: '1px solid rgba(79,124,255,0.12)', backgroundColor: '#111C30', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid rgba(79,124,255,0.07)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: '12px', background: 'linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', boxShadow: '0 4px 14px rgba(79,124,255,0.25)', flexShrink: 0 }}>✦</div>
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
                <div style={{ maxWidth: '74%', padding: '13px 17px', borderRadius: msg.role === 'ai' ? '2px 14px 14px 14px' : '14px 2px 14px 14px', background: msg.role === 'ai' ? '#111F35' : 'linear-gradient(135deg, #0E2847, #122255)', border: msg.role === 'ai' ? '1px solid rgba(79,124,255,0.06)' : '1px solid rgba(16,185,129,0.2)', color: '#e5e5e5', fontSize: '14px', lineHeight: '1.7' }}>
                  {msg.role === 'ai' ? <div dangerouslySetInnerHTML={{ __html: renderAIText(msg.text) }} /> : <span style={{ fontWeight: 500 }}>{msg.text}</span>}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <div style={{ width: 30, height: 30, borderRadius: '9px', background: 'linear-gradient(135deg, #06B6D4, #3B82F6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', flexShrink: 0 }}>✦</div>
                <div style={{ padding: '13px 17px', borderRadius: '2px 14px 14px 14px', background: '#111F35', border: '1px solid rgba(79,124,255,0.06)', display: 'flex', gap: '5px', alignItems: 'center' }}>
                  {[0,1,2].map(j => <div key={j} style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10B981', animation: `bounce 1.2s ease-in-out ${j*0.2}s infinite` }} />)}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>
      <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(79,124,255,0.07)', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: '10px', padding: '12px 16px', background: '#111F35', border: '1px solid rgba(79,124,255,0.12)', borderRadius: '12px' }}>
          <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()} placeholder="..." disabled={loading} style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#e5e5e5', fontSize: '14px', fontFamily: 'inherit' }} />
          <button onClick={() => send()} disabled={loading || !input.trim()} style={{ width: '36px', height: '36px', borderRadius: '9px', background: input.trim() ? 'linear-gradient(135deg, #06B6D4, #3B82F6)' : 'rgba(79,124,255,0.06)', border: 'none', color: input.trim() ? '#000' : '#4b5563', fontSize: '15px', fontWeight: 700, cursor: input.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>▶</button>
        </div>
      </div>
    </div>
  );
}
