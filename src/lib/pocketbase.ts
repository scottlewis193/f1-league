import PocketBase from 'pocketbase';
import { PUBLIC_PB_URL } from '$env/static/public';

let _pb: PocketBase | null = null;

function getPb(): PocketBase {
  if (!_pb) {
    const url = typeof window !== 'undefined'
      ? (window.__PB_URL__ || PUBLIC_PB_URL || '')
      : '';
    _pb = new PocketBase(url);
    _pb.autoCancellation(false);
  }
  return _pb;
}

// Lazily create PB instance on first property access
const pb = new Proxy({} as any, {
  get(_, prop) {
    return getPb()[prop as keyof PocketBase];
  },
});

export default pb;
export { getPb };
