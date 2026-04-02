import { Redis } from 'ioredis';
import { config } from '../config/env';
import { readStore, writeStore } from './file-store.service';

interface ClickFileStore {
  total:    Record<string, number>;
  daily:    Record<string, Record<string, number>>;
}

// Keys
const KEY_TOTAL  = 'clicks:total';                              // Hash: listingId → count
const KEY_EVENTS = 'clicks:events';                             // List of JSON events (capped)
const KEY_DAILY  = (date: string) => `clicks:daily:${date}`;   // Hash per day (TTL 90 days)
const EVENTS_CAP = 50_000;
const DAILY_TTL  = 90 * 86_400;

export interface ClickEvent {
  listingId: string;
  plate:     string;
  country:   string;
  ts:        string;
}

export interface ClickStats {
  total: Record<string, number>;
  today: Record<string, number>;
}

export interface ClickDailyRow {
  date:   string;
  bySite: Record<string, number>;
  total:  number;
}

class ClickTracker {
  private redis:    Redis | null = null;
  private mem:      Record<string, number> = {};
  private memDaily: Record<string, Record<string, number>> = {};

  async init(): Promise<void> {
    if (config.redisUrl) {
      try {
        const client = new Redis(config.redisUrl, {
          lazyConnect:          true,
          connectTimeout:       3_000,
          maxRetriesPerRequest: 1,
          retryStrategy:        () => null,
        });
        await client.connect();
        this.redis = client;
        return;
      } catch { /* fall through to file store */ }
    }
    // No Redis — load persisted data from file
    const stored = readStore<ClickFileStore>('clicks', { total: {}, daily: {} });
    this.mem      = stored.total;
    this.memDaily = stored.daily;
  }

  async record(event: ClickEvent): Promise<void> {
    const today = event.ts.slice(0, 10);

    if (this.redis) {
      await Promise.allSettled([
        this.redis.hincrby(KEY_TOTAL, event.listingId, 1),
        this.redis.hincrby(KEY_DAILY(today), event.listingId, 1),
        this.redis.expire(KEY_DAILY(today), DAILY_TTL),
        this.redis.lpush(KEY_EVENTS, JSON.stringify(event)),
        this.redis.ltrim(KEY_EVENTS, 0, EVENTS_CAP - 1),
      ]);
    } else {
      this.mem[event.listingId] = (this.mem[event.listingId] ?? 0) + 1;
      if (!this.memDaily[today]) this.memDaily[today] = {};
      this.memDaily[today][event.listingId] = (this.memDaily[today][event.listingId] ?? 0) + 1;
      writeStore<ClickFileStore>('clicks', { total: this.mem, daily: this.memDaily });
    }
  }

  async stats(): Promise<ClickStats> {
    if (!this.redis) {
      return { total: { ...this.mem }, today: {} };
    }
    const today = new Date().toISOString().slice(0, 10);
    const [totalRaw, todayRaw] = await Promise.all([
      this.redis.hgetall(KEY_TOTAL),
      this.redis.hgetall(KEY_DAILY(today)),
    ]);
    const toNum = (obj: Record<string, string> | null): Record<string, number> =>
      Object.fromEntries(
        Object.entries(obj ?? {}).map(([k, v]) => [k, parseInt(v, 10)]),
      );
    return { total: toNum(totalRaw), today: toNum(todayRaw) };
  }

  /** Returns per-site click breakdown for each of the last `days` days. */
  async dailyHistory(days: number): Promise<ClickDailyRow[]> {
    const dates = Array.from({ length: days }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (days - 1 - i));
      return d.toISOString().slice(0, 10);
    });
    if (!this.redis) {
      return dates.map(date => {
        const bySite = { ...(this.memDaily[date] ?? {}) };
        const total  = Object.values(bySite).reduce((s, v) => s + v, 0);
        return { date, bySite, total };
      });
    }

    const hashes = await Promise.all(dates.map(d => this.redis!.hgetall(KEY_DAILY(d))));
    return dates.map((date, i) => {
      const raw    = hashes[i] ?? {};
      const bySite = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, parseInt(v, 10)]));
      const total  = Object.values(bySite).reduce((s, v) => s + v, 0);
      return { date, bySite, total };
    });
  }

  async quit(): Promise<void> {
    await this.redis?.quit();
  }
}

export const clickTracker = new ClickTracker();
