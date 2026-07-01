import TotalNetWorthCard from '../components/dashboard/TotalNetWorthCard';
import PnlBreakdownCard from '../components/dashboard/PnlBreakdownCard';
import { NetWorthTrendCard } from '../components/dashboard/networthtrend';
import MarketMiniCard from '../components/dashboard/MarketMiniCard';
import { AssetClassCard, PositionsCard } from '../components/dashboard/CurrentAllocationCard';
import { AssetClassPerformanceCard, MacroPulseCard, PortfolioMoversCard } from '../components/dashboard/DashboardCards';
import HoldingsSection from '../components/dashboard/HoldingsSection';
import { PERIODS } from '../utils/api';

export default function Dashboard({
  grandTotalUSD, grandTotalIDR, kursIdr, overallPnlUSD, overallPnlPersen,
  dailyPnlUSD, dailyPnlPersen, cryptoLoaded, marketLoaded, hideBalance, setHideBalance,
  isMobileViewport, scrollToHoldings, holdingsRef, pnlCryptoUSD, pnlKomoditasUSD,
  pnlSahamIDX_IDR, pnlSahamUS_USD, chartData, chartColor, chartError, period, setPeriod,
  marketData, assets, getLivePrice, hargaMap, hargaSaham, handleRowClick, setShowAddModal,
  setActivePage, t
}) {
  return (
    <>
      <div className="summary-cards">
        <TotalNetWorthCard
          grandTotalUSD={grandTotalUSD} grandTotalIDR={grandTotalIDR} kursIdr={kursIdr}
          overallPnlUSD={overallPnlUSD} overallPnlPersen={overallPnlPersen}
          dailyPnlUSD={dailyPnlUSD} dailyPnlPersen={dailyPnlPersen}
          cryptoLoaded={cryptoLoaded} isMobileViewport={isMobileViewport}
          hideBalance={hideBalance} setHideBalance={setHideBalance}
          scrollToHoldings={scrollToHoldings} t={t}
        />

        <PnlBreakdownCard
          pnlCryptoUSD={pnlCryptoUSD} pnlKomoditasUSD={pnlKomoditasUSD}
          pnlSahamIDX_IDR={pnlSahamIDX_IDR} pnlSahamUS_USD={pnlSahamUS_USD}
          kursIdr={kursIdr} cryptoLoaded={cryptoLoaded} t={t}
        />

        <NetWorthTrendCard data={chartData} color={chartColor} isError={chartError} period={period} setPeriod={setPeriod} periodsList={PERIODS} onDetailClick={() => setActivePage('networth-detail')} t={t} />
      </div>

      <div className="market-section">
        <div style={{ display: 'grid', gridTemplateColumns: isMobileViewport ? '1fr' : '1fr 0.9fr 0.9fr', gap: '14px', alignItems: 'stretch' }}>
          <div className="market-mini-grid" style={{ minWidth: 0 }}>
            <MarketMiniCard displayName="BTC"       data={marketData['BTC']}    loaded={cryptoLoaded} />
            <MarketMiniCard displayName="ETH"       data={marketData['ETH']}    loaded={cryptoLoaded} />
            <MarketMiniCard displayName="Gold XAU"  data={marketData['GOLD']}   loaded={marketLoaded} />
            <MarketMiniCard displayName="Silver XAG" data={marketData['XAG']}   loaded={marketLoaded} />
            <MarketMiniCard displayName="S&P 500"   data={marketData['SPX500']} loaded={marketLoaded} />
            <MarketMiniCard displayName="IHSG"      data={marketData['IHSG']}   loaded={marketLoaded} />
          </div>
          <AssetClassCard assets={assets} getLivePrice={getLivePrice} grandTotalUSD={grandTotalUSD} kursIdr={kursIdr} />
          <PositionsCard  assets={assets} getLivePrice={getLivePrice} grandTotalUSD={grandTotalUSD} kursIdr={kursIdr} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobileViewport ? '1fr' : '1.25fr 1fr 1fr', gap: '14px', alignItems: 'stretch' }}>
          <AssetClassPerformanceCard marketData={marketData} />
          <MacroPulseCard marketData={marketData} />
          <PortfolioMoversCard assets={assets} hargaMap={hargaMap} hargaSaham={hargaSaham} marketData={marketData} kursIdr={kursIdr} />
        </div>
      </div>

      <HoldingsSection
        assets={assets} getLivePrice={getLivePrice} grandTotalUSD={grandTotalUSD}
        kursIdr={kursIdr} handleRowClick={handleRowClick}
        setShowAddModal={setShowAddModal} holdingsRef={holdingsRef} t={t}
      />
    </>
  );
}
