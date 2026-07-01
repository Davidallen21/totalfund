import { useState, useRef } from 'react';

export default function AccountSettingsModal({ username, profilePic, email, onSave, onClose, t }) {
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

  const labelStyle = { color: '#94A3B8', fontSize: '11px', fontWeight: 700, display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.6px' };
  const inputStyle = { width: '100%', backgroundColor: '#0d0d0d', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '12px 16px', color: '#e5e5e5', fontSize: '14px', outline: 'none', boxSizing: 'border-box', fontWeight: 500 };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ backgroundColor: '#111C30', border: '1px solid #262626', borderRadius: '20px', width: '420px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 32px 80px rgba(0,0,0,0.8)' }}>
        <div style={{ padding: '24px 28px 20px', borderBottom: '1px solid #1f1f1f', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ color: '#fff', fontSize: '19px', fontWeight: 800, margin: 0, letterSpacing: '-0.3px' }}>{t('account_settings')}</h2>
          <button onClick={onClose} style={{ width: '34px', height: '34px', borderRadius: '10px', backgroundColor: 'rgba(15,25,41,0.8)', border: '1px solid #2a2a2a', color: '#94A3B8', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              onClick={handleImageClick}
              style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'rgba(79,124,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', border: '2px solid #333', flexShrink: 0 }}
              title={t('change_profile_pic')}
            >
              {picDraft ? (
                <img src={picDraft} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ color: '#CBD5E1', fontSize: '22px', fontWeight: 'bold' }}>{nameDraft ? nameDraft[0].toUpperCase() : 'U'}</span>
              )}
            </div>
            <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" style={{ display: 'none' }} />
            <div>
              <button onClick={handleImageClick} style={{ backgroundColor: 'rgba(15,25,41,0.8)', border: '1px solid #2a2a2a', borderRadius: '8px', padding: '8px 14px', color: '#CBD5E1', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>{t('change_profile_pic')}</button>
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
          <button onClick={onClose} style={{ flex: 1, backgroundColor: '#111F35', color: '#CBD5E1', border: '1px solid #262626', borderRadius: '10px', padding: '13px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>{t('cancel')}</button>
          <button onClick={handleSubmit} style={{ flex: 2, backgroundColor: '#16a34a', color: '#ffffff', border: 'none', borderRadius: '10px', padding: '13px', fontSize: '14px', fontWeight: 800, cursor: 'pointer' }}>{t('save')}</button>
        </div>
      </div>
    </div>
  );
}
