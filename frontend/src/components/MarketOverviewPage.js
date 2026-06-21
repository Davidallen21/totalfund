import React from 'react';

export default function MarketOverviewPage({ t }) {
  // Fungsi fallback untuk teks judul biar tetap mendukung ganti bahasa
  const getText = (key) => {
    const fallbacks = {
      market_overview: 'Market Overview',
    };
    return (t && t(key) !== key) ? t(key) : fallbacks[key] || key;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '30px' }}>
      
      {/* HEADER UTAMA */}
      <div>
        <h2 style={{ color: '#fff', fontSize: '22px', fontWeight: 800, margin: '0 0 4px', letterSpacing: '-0.5px' }}>
          {getText('market_overview')}
        </h2>
      </div>

      {/* TAMPILAN DALAM PENGEMBANGAN */}
      <div style={{ padding: '80px 20px', textAlign: 'center', backgroundColor: '#141414', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', marginTop: '20px', boxShadow: '0 12px 40px rgba(0,0,0,0.4)' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚧</div>
        <div style={{ color: '#fff', fontSize: '20px', fontWeight: 700, marginBottom: '8px', letterSpacing: '-0.3px' }}>
          Fitur Sedang Dalam Pengembangan
        </div>
        <div style={{ color: '#a3a3a3', fontSize: '15px', fontWeight: 500, lineHeight: '1.6' }}>
          Halaman ini sedang dibangun. Kami sedang menyiapkan data pasar <br /> 
          yang lengkap untuk kamu. Ditunggu ya!
        </div>
      </div>

    </div>
  );
}