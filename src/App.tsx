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
import { wsManager } from './services/websocket';

const ResponsiveGridLayout = WidthProvider(Responsive);

const LAYOUTS = {
  lg: [
    { i: 'chart', x: 0, y: 0, w: 8, h: 14, minH: 8, minW: 4 },
    { i: 'watchlist', x: 8, y: 0, w: 2, h: 7, minH: 4, minW: 2 },
    { i: 'ai', x: 10, y: 0, w: 2, h: 14, minH: 6, minW: 2 },
    { i: 'orderbook', x: 0, y: 14, w: 4, h: 10, minH: 6, minW: 2 },
    { i: 'portfolio', x: 4, y: 14, w: 4, h: 10, minH: 6, minW: 2 },
    { i: 'strategies', x: 8, y: 7, w: 2, h: 7, minH: 4, minW: 2 },
    { i: 'news', x: 0, y: 24, w: 12, h: 3, minH: 2, minW: 4 },
  ],
  md: [
    { i: 'chart', x: 0, y: 0, w: 7, h: 12 },
    { i: 'watchlist', x: 7, y: 0, w: 3, h: 6 },
    { i: 'ai', x: 7, y: 6, w: 3, h: 6 },
    { i: 'orderbook', x: 0, y: 12, w: 5, h: 8 },
    { i: 'portfolio', x: 5, y: 12, w: 5, h: 8 },
    { i: 'strategies', x: 0, y: 20, w: 5, h: 6 },
    { i: 'news', x: 0, y: 26, w: 10, h: 3 },
  ],
  sm: [
    { i: 'chart', x: 0, y: 0, w: 6, h: 10 },
    { i: 'watchlist', x: 0, y: 10, w: 3, h: 6 },
    { i: 'orderbook', x: 3, y: 10, w: 3, h: 6 },
    { i: 'portfolio', x: 0, y: 16, w: 6, h: 6 },
    { i: 'ai', x: 0, y: 22, w: 6, h: 6 },
    { i: 'strategies', x: 0, y: 28, w: 6, h: 5 },
    { i: 'news', x: 0, y: 33, w: 6, h: 3 },
  ],
};

export default function App() {
  const activeSymbol = useMarketStore((s) => s.activeSymbol);
  const activeTimeframe = useMarketStore((s) => s.activeTimeframe);
  const theme = useSettingsStore((s) => s.theme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    console.log(`[App] Init data for ${activeSymbol} ${activeTimeframe}`);

    // Clean up any previous WS connections
    wsManager.closeAll();

    // 1. Fetch historical candles via REST (most important for chart)
    fetchKlines(activeSymbol, activeTimeframe)
      .then((candles) => {
        console.log(`[App] Loaded ${candles.length} candles`);
        useMarketStore.getState().setCandles(`${activeSymbol}:${activeTimeframe}`, candles);
      })
      .catch((err) => console.error('[App] Klines failed:', err));

    // 2. Start WebSocket streams for live updates
    try {
      subscribeTicker(activeSymbol);
      subscribeKline(activeSymbol, activeTimeframe);
      subscribeOrderbook(activeSymbol);
      subscribeTrades(activeSymbol);
    } catch (err) {
      console.error('[App] WS subscription error:', err);
    }

    // 3. Fetch supplementary data
    fetchFundingRates();
    fetchAndStoreMarkets();
    fetchTopCoins();

    // 4. Periodic refresh for REST data
    const interval = setInterval(() => {
      fetchFundingRates();
      fetchAndStoreMarkets();
      fetchTopCoins();
    }, 60_000);

    return () => {
      clearInterval(interval);
      wsManager.closeAll();
    };
  }, [activeSymbol, activeTimeframe]);

  return (
    <div className="app">
      <Header />
      <div className="grid-container">
        <ResponsiveGridLayout
          className="layout"
          layouts={LAYOUTS}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
          rowHeight={28}
          draggableHandle=".panel-header"
          compactType="vertical"
          margin={[6, 6]}
        >
          <div key="chart" className="panel">
            <div className="panel-header">Chart — {activeSymbol} {activeTimeframe}</div>
            <div className="panel-body panel-body--chart">
              <TradingChart />
            </div>
          </div>
          <div key="watchlist" className="panel">
            <div className="panel-header">Watchlist</div>
            <div className="panel-body"><Watchlist /></div>
          </div>
          <div key="ai" className="panel">
            <div className="panel-header">AI Coach</div>
            <div className="panel-body"><AiCoach /></div>
          </div>
          <div key="orderbook" className="panel">
            <div className="panel-header">Orderbook</div>
            <div className="panel-body"><Orderbook /></div>
          </div>
          <div key="portfolio" className="panel">
            <div className="panel-header">Portfolio</div>
            <div className="panel-body"><Portfolio /></div>
          </div>
          <div key="strategies" className="panel">
            <div className="panel-header">Strategies</div>
            <div className="panel-body"><StrategyPanel /></div>
          </div>
          <div key="news" className="panel">
            <div className="panel-header">News & Alerts</div>
            <div className="panel-body"><NewsFeed /></div>
          </div>
        </ResponsiveGridLayout>
      </div>
    </div>
  );
}
