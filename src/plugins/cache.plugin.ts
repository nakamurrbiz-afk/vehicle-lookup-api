import fp from 'fastify-plugin';
import { FastifyInstance } from 'fastify';
import { Redis } from 'ioredis';
import { RedisCache } from '../cache/redis.cache';
import { MemoryCache } from '../cache/memory.cache';
import { config } from '../config/env';

async function cachePlugin(app: FastifyInstance): Promise<void> {
  if (config.redisUrl) {
    try {
      const client = new Redis(config.redisUrl, {
        lazyConnect: true,
        connectTimeout: 3000,
        maxRetriesPerRequest: 1,
        retryStrategy: () => null, // no auto-retry; fall back to memory on failure
      });

      await client.connect();
      app.decorate('cache', new RedisCache(client));
      app.log.info('Cache: Redis connected');

      app.addHook('onClose', async () => {
        await client.quit();
      });
    } catch (err) {
      app.log.warn({ err }, 'Redis unavailable — falling back to in-memory cache');
      app.decorate('cache', new MemoryCache());
    }
  } else {
    app.log.info('Cache: REDIS_URL not set — using in-memory cache');
    app.decorate('cache', new MemoryCache());
  }
}

export default fp(cachePlugin, { name: 'cache' });
