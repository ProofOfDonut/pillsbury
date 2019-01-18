import {ensure} from '../ensure';

export function formatNumber(n: number): string {
  const s = String(n);
  ensure(/^\d+$/.test(s), `Cannot format number ({n}).`);
  let out = [];
  for (let i = 0; i < s.length; i += 3) {
    const p0 = Math.max(0, s.length - i - 3);
    const p1 = s.length - i;
    out.unshift(s.slice(p0, p1));
  }
  return out.join(',');
}
