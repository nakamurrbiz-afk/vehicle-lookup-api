import Fastify, { FastifyInstance } from 'fastify';
import sensible from '@fastify/sensible';
import cors from '@fastify/cors';
import cachePlugin from './plugins/cache.plugin';
import { lookupRoute } from './routes/lookup.route';
import { mediaRoute } from './routes/media.route';
import { trackRoute } from './routes/track.route';
import { registerErrorHandler } from './errors/error-handler';
import { clickTracker } from './services/click-tracker.service';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: process.env.NODE_ENV === 'test' ? 'silent' : 'info',
      transport:
        process.env.NODE_ENV === 'development'
          ? { target: 'pino-pretty', options: { colorize: true } }
          : undefined,
    },
  });

  await app.register(sensible);
  await app.register(cors, { origin: true }); // allow all origins (incl. file://)
  await app.register(cachePlugin);
  await clickTracker.init();

  registerErrorHandler(app);

  // Health check
  app.get('/health', async () => ({ status: 'ok', ts: new Date().toISOString() }));

  await app.register(lookupRoute, { prefix: '/v1' });
  await app.register(mediaRoute,  { prefix: '/v1' });
  await app.register(trackRoute,  { prefix: '/v1' });

  app.addHook('onClose', async () => { await clickTracker.quit(); });

  return app;
}
