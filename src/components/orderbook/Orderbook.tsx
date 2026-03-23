import { useMemo } from 'react';
import { useMarketStore } from '../../stores/marketStore';
import { formatPrice, formatVolume } from '../../utils/format';

export function Orderbook() {
  const orderbook = useMarketStore((s) => s.orderbook);

  const { asks, bids, maxCumQty, spread, midPrice, totalBidVol, totalAskVol } = useMemo(() => {
    if (!orderbook) return { asks: [], bids: [], maxCumQty: 1, spread: 0, midPrice: 0, totalBidVol: 0, totalAskVol: 0 };

    const rawAsks = orderbook.asks.slice(0, 15).reverse();
    const rawBids = orderbook.bids.slice(0, 15);

    // Compute cumulative quantities for depth bars
    // Asks: cumulative from mid outward (bottom to top visually, but array is reversed)
    const asksCum: number[] = [];
    let cumAsk = 0;
    for (let i = rawAsks.length - 1; i >= 0; i--) {
      cumAsk += rawAsks[i].quantity;
      asksCum[i] = cumAsk;
    }

    const bidsCum: number[] = [];
    let cumBid = 0;
    for (let i = 0; i < rawBids.length; i++) {
      cumBid += rawBids[i].quantity;
      bidsCum[i] = cumBid;
    }

    const maxCum = Math.max(
      asksCum.length > 0 ? asksCum[0] : 0.001,
      bidsCum.length > 0 ? bidsCum[bidsCum.length - 1] : 0.001
    );

    const bestAsk = rawAsks.length > 0 ? rawAsks[rawAsks.length - 1].price : 0;
    const bestBid = rawBids.length > 0 ? rawBids[0].price : 0;
    const sp = bestAsk - bestBid;
    const mid = bestAsk > 0 && bestBid > 0 ? (bestAsk + bestBid) / 2 : 0;

    const tbv = rawBids.reduce((s, b) => s + b.quantity, 0);
    const tav = rawAsks.reduce((s, a) => s + a.quantity, 0);

    return {
      asks: rawAsks.map((a, i) => ({ ...a, cumQty: asksCum[i] })),
      bids: rawBids.map((b, i) => ({ ...b, cumQty: bidsCum[i] })),
      maxCumQty: maxCum,
      spread: sp,
      midPrice: mid,
      totalBidVol: tbv,
      totalAskVol: tav,
    };
  }, [orderbook]);

  if (!orderbook) {
    return (
      <div style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '11px', textAlign: 'center' }}>
        Connecting to orderbook...
      </div>
    );
  }

  const bidRatio = totalBidVol + totalAskVol > 0 ? (totalBidVol / (totalBidVol + totalAskVol)) * 100 : 50;

  return (
    <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', padding: '4px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 6px', color: 'var(--text-muted)', fontSize: '10px', marginBottom: '4px' }}>
        <span>Price</span><span>Qty</span><span>Depth</span>
      </div>

      {asks.map((ask, i) => {
        const depthPct = (ask.cumQty / maxCumQty) * 100;
        const levelPct = asks.length > 0 ? (i / asks.length) : 0;
        const opacity = 0.08 + levelPct * 0.15;
        return (
          <div key={`a${i}`} style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', padding: '1px 6px' }}>
            <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: `${depthPct}%`, background: `rgba(239, 83, 80, ${opacity})` }} />
            <span style={{ color: 'var(--red)', position: 'relative', flex: 1 }}>{formatPrice(ask.price)}</span>
            <span style={{ position: 'relative', flex: 1, textAlign: 'right' }}>{ask.quantity.toFixed(4)}</span>
            <span style={{ position: 'relative', flex: 1, textAlign: 'right', color: 'var(--text-muted)', fontSize: '10px' }}>{ask.cumQty.toFixed(2)}</span>
          </div>
        );
      })}

      <div style={{
        padding: '6px', textAlign: 'center',
        borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)',
        margin: '2px 0', background: 'var(--bg-secondary)',
      }}>
        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
          ${formatPrice(midPrice)}
        </div>
        <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '2px' }}>
          Spread: {formatPrice(spread)} | Bid Vol: {formatVolume(totalBidVol)} | Ask Vol: {formatVolume(totalAskVol)}
        </div>
        <div style={{ display: 'flex', height: '3px', borderRadius: '2px', overflow: 'hidden', marginTop: '4px' }}>
          <div style={{ width: `${bidRatio}%`, background: 'var(--green)' }} />
          <div style={{ width: `${100 - bidRatio}%`, background: 'var(--red)' }} />
        </div>
      </div>

      {bids.map((bid, i) => {
        const depthPct = (bid.cumQty / maxCumQty) * 100;
        const levelPct = bids.length > 0 ? (i / bids.length) : 0;
        const opacity = 0.08 + levelPct * 0.15;
        return (
          <div key={`b${i}`} style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', padding: '1px 6px' }}>
            <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: `${depthPct}%`, background: `rgba(38, 166, 91, ${opacity})` }} />
            <span style={{ color: 'var(--green)', position: 'relative', flex: 1 }}>{formatPrice(bid.price)}</span>
            <span style={{ position: 'relative', flex: 1, textAlign: 'right' }}>{bid.quantity.toFixed(4)}</span>
            <span style={{ position: 'relative', flex: 1, textAlign: 'right', color: 'var(--text-muted)', fontSize: '10px' }}>{bid.cumQty.toFixed(2)}</span>
          </div>
        );
      })}
    </div>
  );
}
