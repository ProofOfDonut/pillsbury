import {ensure} from '../ensure';

export function formatNumber(n: number): string {
  const m = ensure(
      /^(-)?(\d+)$/.exec(String(n)),
      `Cannot format number (${n}).`);
  const sign = m[1] || '';
  const numStr = m[2];
  let out = [];
  for (let i = 0; i < numStr.length; i += 3) {
    const p0 = Math.max(0, numStr.length - i - 3);
    const p1 = numStr.length - i;
    out.unshift(numStr.slice(p0, p1));
  }
  return sign + out.join(',');
}
