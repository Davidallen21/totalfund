export default function ConfirmDeleteModal({ asset, onConfirm, onCancel, t }) {
  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
      <div style={{ backgroundColor: '#111215', border: '1px solid #1e2026', borderRadius: '18px', padding: '28px 28px 24px', width: '340px', boxShadow: '0 24px 64px rgba(0,0,0,0.8)' }}>
        <div style={{ width: '52px', height: '52px', borderRadius: '14px', backgroundColor: 'rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', fontSize: '24px' }}>🗑</div>
        <h3 style={{ color: '#ffffff', fontSize: '20px', fontWeight: 800, margin: '0 0 10px' }}>{t('delete')} {asset.ticker}?</h3>
        <p style={{ color: '#94A3B8', fontSize: '14px', margin: '0 0 6px', lineHeight: 1.6 }}>Aset <span style={{ fontWeight: 700 }}>{asset.nama}</span> akan dihapus permanen.</p>
        <div style={{ display: 'flex', gap: '8px', marginTop: '24px' }}>
          <button onClick={onCancel} style={{ flex: 1, backgroundColor: '#1a1a22', color: '#64748B', border: '1px solid #242430', borderRadius: '9px', padding: '12px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>{t('cancel')}</button>
          <button onClick={onConfirm} style={{ flex: 1, backgroundColor: '#ef4444', color: '#ffffff', border: 'none', borderRadius: '9px', padding: '12px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>{t('delete')}</button>
        </div>
      </div>
    </div>
  );
}
