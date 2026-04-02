import { Redis } from 'ioredis';
import { config } from '../config/env';

const KEY_TOTAL        = 'searches:total';
const KEY_DAILY        = (d: string) => `searches:daily:${d}`;
const KEY_EVENTS       = 'searches:events';
const EVENTS_CAP       = 50_000;
const DAILY_TTL        = 90 * 86_400;

export interface SearchEvent {
  make:    string;
  model:   string | null;
  country: string;
  plate:   string;
  ts:      string;
}

export interface SearchDailyRow {
  date:    string;
  total:   number;
}

export interface TopVehicle {
  key:     string;   // "TOYOTA|YARIS|GB"
  make:    string;
  model:   string;
  country: string;
  count:   number;
}

class SearchTracker {
  private redis: Redis | null = null;
  private mem:   Record<string, number> = {};

  async init(): Promise<void> {
    if (!config.redisUrl) return;
    try {
      const client = new Redis(config.redisUrl, {
        lazyConnect:          true,
        connectTimeout:       3_000,
        maxRetriesPerRequest: 1,
        retryStrategy:        () => null,
      });
      await client.connect();
      this.redis = client;
    } catch { /* fall back to in-memory */ }
  }

  async record(event: SearchEvent): Promise<void> {
    if (!event.make) return;
    const hashKey = `${event.make.toUpperCase()}|${(event.model ?? 'UNKNOWN').toUpperCase()}|${event.country}`;
    const today   = event.ts.slice(0, 10);

    if (this.redis) {
      await Promise.allSettled([
        this.redis.hincrby(KEY_TOTAL, hashKey, 1),
        this.redis.hincrby(KEY_DAILY(today), hashKey, 1),
        this.redis.expire(KEY_DAILY(today), DAILY_TTL),
        this.redis.lpush(KEY_EVENTS, JSON.stringify(event)),
        this.redis.ltrim(KEY_EVENTS, 0, EVENTS_CAP - 1),
      ]);
    } else {
      this.mem[hashKey] = (this.mem[hashKey] ?? 0) + 1;
    }
  }

  /** Returns total search count per day for the last `days` days. */
  async dailyHistory(days: number): Promise<SearchDailyRow[]> {
    const dates = pastDates(days);
    if (!this.redis) return dates.map(date => ({ date, total: 0 }));

    const hashes = await Promise.all(dates.map(d => this.redis!.hgetall(KEY_DAILY(d))));
    return dates.map((date, i) => ({
      date,
      total: Object.values(hashes[i] ?? {}).reduce((s, v) => s + parseInt(v, 10), 0),
    }));
  }

  /** Returns top N vehicles by total search count. */
  async topVehicles(n = 15): Promise<TopVehicle[]> {
    if (!this.redis) {
      return Object.entries(this.mem)
        .sort((a, b) => b[1] - a[1])
        .slice(0, n)
        .map(([key, count]) => parseVehicleKey(key, count));
    }
    const raw = await this.redis.hgetall(KEY_TOTAL);
    return Object.entries(raw ?? {})
      .map(([key, v]) => parseVehicleKey(key, parseInt(v, 10)))
      .sort((a, b) => b.count - a.count)
      .slice(0, n);
  }

  /** Total searches across all time. */
  async totalAllTime(): Promise<number> {
    if (!this.redis) return Object.values(this.mem).reduce((s, v) => s + v, 0);
    const raw = await this.redis.hgetall(KEY_TOTAL);
    return Object.values(raw ?? {}).reduce((s, v) => s + parseInt(v, 10), 0);
  }

  async quit(): Promise<void> { await this.redis?.quit(); }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function pastDates(n: number): string[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (n - 1 - i));
    return d.toISOString().slice(0, 10);
  });
}

function parseVehicleKey(key: string, count: number): TopVehicle {
  const [make = '', model = '', country = ''] = key.split('|');
  return { key, make, model, country, count };
}

export const searchTracker = new SearchTracker();
