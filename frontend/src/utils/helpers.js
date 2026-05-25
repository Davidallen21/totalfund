// Mengubah angka jadi format Dolar ($)
export const formatUSD = (val) => '$' + val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Mengubah angka jadi format Rupiah (Rp)
export const formatIDR = (val) => 'Rp ' + val.toLocaleString('id-ID', { maximumFractionDigits: 0 });

// Daftar warna untuk Chart
export const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#ec4899', '#8b5cf6', '#06b6d4', '#f97316', '#64748b', '#84cc16'];

// Fungsi untuk ngerapihin teks balasan dari AI
export function renderAIText(text) {
  const escaped = text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  return escaped
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // render bold
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code style="background:rgba(255,255,255,0.08);padding:2px 7px;border-radius:4px;font-size:0.88em;font-family:monospace">$1</code>')
    .replace(/^### (.*?)$/gm, '<div style="font-size:14px;font-weight:700;color:#e5e5e5;margin:10px 0 4px">$1</div>')
    .replace(/^## (.*?)$/gm, '<div style="font-size:15px;font-weight:800;color:#fff;margin:12px 0 6px">$1</div>')
    .replace(/^- (.*?)$/gm, '<div style="display:flex;gap:8px;margin:3px 0"><span style="color:#4ade80;flex-shrink:0">▸</span><span>$1</span></div>')
    .replace(/\n\n/g,'<div style="height:10px"></div>')
    .replace(/\n/g,'<br/>');
}