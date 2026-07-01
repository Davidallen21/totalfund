export default function EditAssetModal({ editingAsset, editForm, setEditForm, onSave, onClose, t }) {
  const modalInput = { width: '100%', backgroundColor: '#111C30', border: '1px solid rgba(79,124,255,0.16)', borderRadius: '10px', padding: '12px 16px', color: '#F8FAFC', fontSize: '16px', outline: 'none', marginTop: '8px', boxSizing: 'border-box', fontWeight: 500 };
  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ backgroundColor: '#111C30', border: '1px solid rgba(79,124,255,0.16)', borderRadius: '16px', padding: '32px', width: '360px', boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}>
        <h2 style={{ color: '#F8FAFC', fontSize: '20px', fontWeight: 700, margin: '0 0 8px' }}>{t('top_up')} {editingAsset.ticker}</h2>
        <p style={{ color: '#CBD5E1', fontSize: '13px', margin: '0 0 24px' }}>{t('your_current_avg')} <b style={{ color: '#F8FAFC' }}>{editingAsset.type === 'saham' ? 'Rp' : '$'}{editingAsset.avg}</b></p>
        {editingAsset.type !== 'cash_idr' && (
          <>
            <label style={{ color: '#CBD5E1', fontSize: '13px', fontWeight: 500 }}>{t('new_buy_price')} ({editingAsset.type === 'saham' ? 'IDR' : 'USD'})</label>
            <input type="number" placeholder="0" value={editForm.harga} onChange={e => setEditForm(p => ({ ...p, harga: e.target.value }))} style={modalInput} />
          </>
        )}
        <label style={{ color: '#CBD5E1', fontSize: '13px', fontWeight: 500, marginTop: '16px', display: 'block' }}>
          {t('amount_added')} ({editingAsset.type === 'saham' ? t('sheet') : editingAsset.type === 'cash_idr' ? t('rupiah') : t('coin')})
        </label>
        <input type="number" placeholder="0" value={editForm.jumlah} onChange={e => setEditForm(p => ({ ...p, jumlah: e.target.value }))} style={modalInput} />
        <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
          <button onClick={onClose} style={{ flex: 1, backgroundColor: 'rgba(79,124,255,0.06)', color: '#CBD5E1', border: '1px solid rgba(79,124,255,0.12)', borderRadius: '8px', padding: '12px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>{t('cancel')}</button>
          <button onClick={() => onSave(parseFloat(editForm.harga || 0), parseFloat(editForm.jumlah || 0))} style={{ flex: 1, background: 'linear-gradient(135deg,#06B6D4,#3B82F6)', color: 'white', border: 'none', borderRadius: '8px', padding: '12px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>{t('save')}</button>
        </div>
      </div>
    </div>
  );
}
