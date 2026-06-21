import React, { useEffect, useRef, memo, Component, useState } from 'react';

// ─── Error Boundary ───
class TradingViewErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.warn('TradingView widget error (diabaikan):', error?.message);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          height: '100%', minHeight: '500px', width: '100%',
          borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)',
          backgroundColor: '#141414', display: 'flex',
          flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: '12px'
        }}>
          <span style={{ fontSize: '32px' }}>📉</span>
          <span style={{ color: '#a3a3a3', fontSize: '14px', fontWeight: 600 }}>
            Chart tidak bisa dimuat
          </span>
          <button
            onClick={() => this.setState({ hasError: false })}
            style={{
              backgroundColor: '#1e1e1e', color: '#4ade80',
              border: '1px solid rgba(74,222,128,0.3)', borderRadius: '8px',
              padding: '8px 16px', fontSize: '13px', cursor: 'pointer', fontWeight: 600
            }}
          >
            Coba Lagi
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Widget utama ───
function TradingViewWidget({ symbol = "BINANCE:BTCUSDT", theme = "dark" }) {
  const container = useRef();
  const wrapperRef = useRef(); // Ref baru untuk mengatur layar penuh
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Menangani injeksi script TradingView
  useEffect(() => {
    if (!container.current) return;
    const node = container.current;
    node.innerHTML = '';

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: symbol,
      interval: "D",
      timezone: "Etc/UTC",
      theme: theme,
      style: "1",
      locale: "en",
      enable_publishing: false,
      backgroundColor: "rgba(20, 20, 20, 1)",
      gridColor: "rgba(255, 255, 255, 0.06)",
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: false,
      container_id: "tradingview_widget"
    });

    node.appendChild(script);

    return () => { node.innerHTML = ''; };
  }, [symbol, theme]);

  // Mendengarkan perubahan status fullscreen (misal user pencet tombol ESC di keyboard)
  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  // Fungsi untuk memicu layar penuh dan rotasi landscape di HP
  const toggleFullscreen = async () => {
    if (!wrapperRef.current) return;

    if (!document.fullscreenElement) {
      try {
        await wrapperRef.current.requestFullscreen();
        // Mencoba memaksa HP masuk ke mode mendatar (landscape)
        if (window.screen && window.screen.orientation && window.screen.orientation.lock) {
          await window.screen.orientation.lock('landscape').catch(() => {
            // Error diabaikan karena beberapa browser HP (seperti iOS Safari) melarang auto-rotate
          });
        }
      } catch (err) {
        console.warn("Gagal mengaktifkan mode fullscreen:", err);
      }
    } else {
      try {
        await document.exitFullscreen();
        // Mengembalikan orientasi layar seperti semula saat keluar fullscreen
        if (window.screen && window.screen.orientation && window.screen.orientation.unlock) {
          window.screen.orientation.unlock();
        }
      } catch (err) {
        console.warn("Gagal keluar dari mode fullscreen:", err);
      }
    }
  };

  return (
    <div 
      ref={wrapperRef} 
      style={{ 
        position: 'relative', 
        width: '100%', 
        height: isFullscreen ? '100vh' : '100%', 
        minHeight: '500px', 
        borderRadius: isFullscreen ? '0' : '16px', 
        overflow: 'hidden', 
        backgroundColor: '#141414',
        border: isFullscreen ? 'none' : '1px solid rgba(255,255,255,0.08)'
      }}
    >
      {/* Tombol Fullscreen Melayang */}
      <button
        onClick={toggleFullscreen}
        style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          zIndex: 10,
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
          backdropFilter: 'blur(6px)',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(40, 40, 40, 0.9)'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(20, 20, 20, 0.75)'}
      >
        {isFullscreen ? 'Keluar ⤓' : 'Perluas ⛶'}
      </button>

      {/* Kontainer asli TradingView */}
      <div
        className="tradingview-widget-container"
        ref={container}
        style={{
          height: "100%", width: "100%"
        }}
      >
        <div
          className="tradingview-widget-container__widget"
          style={{ height: "calc(100% - 32px)", width: "100%" }}
        />
      </div>
    </div>
  );
}

const MemoWidget = memo(TradingViewWidget);

export default function TradingViewWidgetSafe(props) {
  return (
    <TradingViewErrorBoundary>
      <MemoWidget {...props} />
    </TradingViewErrorBoundary>
  );
}