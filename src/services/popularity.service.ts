import { ICache } from '../cache/cache.interface';

const KEY_PREFIX = 'popularity:';
const TTL = 60 * 60 * 24 * 30; // 30 days

export async function incrementAndGet(
  cache: ICache,
  plate: string,
  country: string,
): Promise<number> {
  const key = `${KEY_PREFIX}${country.toUpperCase()}:${plate.toUpperCase()}`;
  const existing = await cache.get(key);
  const count = (existing ? parseInt(existing, 10) : 0) + 1;
  await cache.set(key, String(count), TTL);
  return count;
}
