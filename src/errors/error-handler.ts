import { FastifyInstance } from 'fastify';
import {
  VehicleNotFoundError,
  UnsupportedCountryError,
  UpstreamError,
  UpstreamRateLimitError,
} from './app.errors';

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof UpstreamRateLimitError) {
      app.log.warn({ err: error }, 'Rate limit from upstream');
      reply.status(429).send({
        status: 429,
        title: 'Too Many Requests',
        detail: error.message,
      });
      return;
    }

    if (error instanceof UpstreamError) {
      app.log.error({ err: error, upstreamStatus: error.upstreamStatus }, 'Upstream API error');
      reply.status(502).send({
        status: 502,
        title: 'Bad Gateway',
        detail: error.message,
      });
      return;
    }

    if (error instanceof VehicleNotFoundError) {
      app.log.info({ err: error }, 'Vehicle not found');
      reply.status(404).send({
        status: 404,
        title: 'Not Found',
        detail: error.message,
      });
      return;
    }

    if (error instanceof UnsupportedCountryError) {
      app.log.warn({ err: error }, 'Unsupported country');
      reply.status(400).send({
        status: 400,
        title: 'Bad Request',
        detail: error.message,
      });
      return;
    }

    // Fastify validation errors
    if (error.statusCode === 400) {
      reply.status(400).send({
        status: 400,
        title: 'Bad Request',
        detail: error.message,
      });
      return;
    }

    // Unexpected
    app.log.error({ err: error }, 'Unexpected error');
    reply.status(500).send({
      status: 500,
      title: 'Internal Server Error',
      detail: 'An unexpected error occurred',
    });
  });
}
