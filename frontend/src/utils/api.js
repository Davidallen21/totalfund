export const API_BASE = process.env.REACT_APP_API_URL ?? '';

export const PERIODS = [
  { label: '1D', days: 1 }, { label: '7D', days: 7 }, { label: '1M', days: 30 },
  { label: '6M', days: 180 }, { label: '1Y', days: 365 }, { label: '5Y', days: 1825 },
  { label: 'All', days: null },
];

export async function fetchWithRetry(url, opts = {}, retries = 2, timeout = 6000) {
  for (let i = 0; i <= retries; i++) {
    const ctrl = new AbortController();
    const tid  = setTimeout(() => ctrl.abort(), timeout);
    try {
      const res = await fetch(url, { ...opts, signal: ctrl.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res;
    } catch (err) {
      if (i === retries) throw err;
      await new Promise(r => setTimeout(r, 400 * (i + 1)));
    } finally {
      clearTimeout(tid);
    }
  }
}
