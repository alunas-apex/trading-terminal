export function formatPrice(price: number, decimals?: number): string {
  if (price >= 1000) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: decimals ?? 2 });
  if (price >= 1) return price.toFixed(decimals ?? 2);
  if (price >= 0.01) return price.toFixed(decimals ?? 4);
  return price.toFixed(decimals ?? 6);
}

export function formatPercent(pct: number): string {
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(2)}%`;
}

export function formatVolume(vol: number): string {
  if (vol >= 1_000_000_000) return `${(vol / 1_000_000_000).toFixed(2)}B`;
  if (vol >= 1_000_000) return `${(vol / 1_000_000).toFixed(2)}M`;
  if (vol >= 1_000) return `${(vol / 1_000).toFixed(2)}K`;
  return vol.toFixed(2);
}

export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('en-US', { hour12: false });
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
