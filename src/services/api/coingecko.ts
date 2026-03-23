import { normalizeCoinGeckoTicker } from '../dataAggregator';
import { useMarketStore } from '../../stores/marketStore';

const CG_API = 'https://api.coingecko.com/api/v3';

const COIN_MAP: Record<string, string> = {
  bitcoin: 'BTCUSDT',
  ethereum: 'ETHUSDT',
  solana: 'SOLUSDT',
  binancecoin: 'BNBUSDT',
  ripple: 'XRPUSDT',
  dogecoin: 'DOGEUSDT',
  cardano: 'ADAUSDT',
};

export async function fetchTopCoins(): Promise<void> {
  const ids = Object.keys(COIN_MAP).join(',');
  const url = `${CG_API}/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc`;
  const res = await fetch(url);
  const data = (await res.json()) as Record<string, unknown>[];

  const store = useMarketStore.getState();
  for (const coin of data) {
    const symbol = COIN_MAP[coin.id as string];
    if (symbol) {
      const ticker = normalizeCoinGeckoTicker(symbol, coin);
      store.updateTicker(ticker);
    }
  }
}
