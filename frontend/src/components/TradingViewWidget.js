import React, { useEffect, useRef, memo, Component } from 'react';

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

  return (
    <div
      className="tradingview-widget-container"
      ref={container}
      style={{
        height: "100%", width: "100%", minHeight: "500px",
        borderRadius: "16px", overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.08)"
      }}
    >
      <div
        className="tradingview-widget-container__widget"
        style={{ height: "calc(100% - 32px)", width: "100%" }}
      />
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