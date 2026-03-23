import { useEffect } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { Header } from './components/layout/Header';
import { TradingChart } from './components/charts/TradingChart';
import { Orderbook } from './components/orderbook/Orderbook';
import { Watchlist } from './components/watchlist/Watchlist';
import { Portfolio } from './components/portfolio/Portfolio';
import { NewsFeed } from './components/news/NewsFeed';
import { AiCoach } from './components/ai/AiCoach';
import { StrategyPanel } from './components/controls/StrategyPanel';
import { useMarketStore } from './stores/marketStore';
import { useSettingsStore } from './stores/settingsStore';
import { subscribeTicker, subscribeKline, subscribeOrderbook, subscribeTrades, fetchKlines, fetchFundingRates } from './services/api/binance';
import { fetchAndStoreMarkets } from './services/api/polymarket';
import { fetchTopCoins } from './services/api/coingecko';

const ResponsiveGridLayout = WidthProvider(Responsive);

const DEFAULT_LAYOUTS = {
  lg: [
    { i: 'chart', x: 0, y: 0, w: 8, h: 12 },
    { i: 'watchlist', x: 8, y: 0, w: 2, h: 6 },
    { i: 'ai', x: 10, y: 0, w: 2, h: 12 },
    { i: 'orderbook', x: 0, y: 12, w: 4, h: 8 },
    { i: 'portfolio', x: 4, y: 12, w: 4, h: 8 },
    { i: 'strategies', x: 8, y: 6, w: 2, h: 6 },
    { i: 'news', x: 0, y: 20, w: 12, h: 4 },
  ],
};

export default function App() {
  const activeSymbol = useMarketStore((s) => s.activeSymbol);
  const activeTimeframe = useMarketStore((s) => s.activeTimeframe);
  const theme = useSettingsStore((s) => s.theme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Subscribe to live data on mount and when active symbol changes
  useEffect(() => {
    subscribeTicker(activeSymbol);
    subscribeKline(activeSymbol, activeTimeframe);
    subscribeOrderbook(activeSymbol);
    subscribeTrades(activeSymbol);

    // Fetch initial candle history
    fetchKlines(activeSymbol, activeTimeframe).then((candles) => {
      useMarketStore.getState().setCandles(`${activeSymbol}:${activeTimeframe}`, candles);
    }).catch(console.error);

    // Fetch funding rates
    fetchFundingRates().catch(console.error);

    // Fetch prediction markets
    fetchAndStoreMarkets().catch(console.error);

    // Fetch CoinGecko data for broader coverage
    fetchTopCoins().catch(console.error);

    // Refresh prediction markets and funding rates periodically
    const interval = setInterval(() => {
      fetchAndStoreMarkets().catch(console.error);
      fetchFundingRates().catch(console.error);
      fetchTopCoins().catch(console.error);
    }, 60_000);

    return () => clearInterval(interval);
  }, [activeSymbol, activeTimeframe]);

  return (
    <div className="app">
      <Header />
      <ResponsiveGridLayout
        className="layout"
        layouts={DEFAULT_LAYOUTS}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
        rowHeight={30}
        draggableHandle=".panel-header"
        compactType="vertical"
      >
        <div key="chart" className="panel">
          <div className="panel-header">Chart — {activeSymbol} {activeTimeframe}</div>
          <div className="panel-body">
            <TradingChart />
          </div>
        </div>
        <div key="watchlist" className="panel">
          <div className="panel-header">Watchlist</div>
          <div className="panel-body">
            <Watchlist />
          </div>
        </div>
        <div key="ai" className="panel">
          <div className="panel-header">AI Coach</div>
          <div className="panel-body">
            <AiCoach />
          </div>
        </div>
        <div key="orderbook" className="panel">
          <div className="panel-header">Orderbook</div>
          <div className="panel-body">
            <Orderbook />
          </div>
        </div>
        <div key="portfolio" className="panel">
          <div className="panel-header">Portfolio</div>
          <div className="panel-body">
            <Portfolio />
          </div>
        </div>
        <div key="strategies" className="panel">
          <div className="panel-header">Strategies</div>
          <div className="panel-body">
            <StrategyPanel />
          </div>
        </div>
        <div key="news" className="panel">
          <div className="panel-header">News &amp; Alerts</div>
          <div className="panel-body">
            <NewsFeed />
          </div>
        </div>
      </ResponsiveGridLayout>
    </div>
  );
}
