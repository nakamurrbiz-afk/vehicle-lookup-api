import { ICache } from '../cache/cache.interface';

declare module 'fastify' {
  interface FastifyInstance {
    cache: ICache;
  }
}
