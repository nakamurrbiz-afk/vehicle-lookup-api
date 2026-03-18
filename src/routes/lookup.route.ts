import { FastifyInstance } from 'fastify';
import { LookupQuerySchema, VehicleResponse } from '../schemas/lookup.schema';
import { adapterRegistry } from '../adapters/adapter.registry';
import { normalize } from '../normalizer/vehicle.normalizer';
import { findSample } from '../mocks/sample-vehicles';
import { config } from '../config/env';

export async function lookupRoute(app: FastifyInstance): Promise<void> {
  // GET /v1/lookup?plate=AB12CDE&country=GB
  app.get<{ Querystring: { plate: string; country: string } }>('/lookup', async (request, reply) => {
    const queryParsed = LookupQuerySchema.safeParse(request.query);
    if (!queryParsed.success) {
      return reply.status(400).send({
        status: 400,
        title: 'Bad Request',
        detail: queryParsed.error.issues.map((i) => i.message).join(', '),
      });
    }

    const { plate, country } = queryParsed.data;
    const cacheKey = `vehicle:${country}:${plate}`;

    // Cache HIT
    const cached = await app.cache.get(cacheKey);
    if (cached) {
      const result: VehicleResponse = JSON.parse(cached);
      result.cachedAt = result.cachedAt ?? new Date().toISOString();
      return reply.send(result);
    }

    // Cache MISS — check sample data first, then delegate to adapter
    const sampleResult = findSample(plate, country);
    const adapterResult = sampleResult ?? await adapterRegistry.get(country).lookup(plate);
    const vehicleResponse = normalize(adapterResult, null);

    await app.cache.set(cacheKey, JSON.stringify(vehicleResponse), config.cacheTtlSeconds);

    return reply.send(vehicleResponse);
  });

  // GET /v1/supported-countries
  app.get('/supported-countries', async (_request, reply) => {
    return reply.send({ countries: adapterRegistry.supportedCountries() });
  });
}
