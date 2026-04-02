import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { clickTracker } from '../services/click-tracker.service';

// Only redirect to known listing-site domains — prevents open redirect abuse
const ALLOWED_HOSTS = new Set([
  'www.awin1.com',            // Awin affiliate wrapper (covers AT UK, Motors, AutoScout24 etc.)
  'www.autotrader.co.uk',
  'www.autotrader.com',
  'www.motors.co.uk',
  'www.cargurus.com',
  'www.cars.com',
  'www.marktplaats.nl',
  'www.autotrack.nl',
  'www.gaspedaal.nl',
  'www.goo-net.com',
  'www.carsensor.net',
  'carview.yahoo.co.jp',
  'www.leboncoin.fr',
  'www.lacentrale.fr',
  'www.autoscout24.fr',
  'www.ebay.co.uk',
  'www.gumtree.com',
]);

const ClickSchema = z.object({
  lid:     z.string().min(1).max(64),   // listing ID, e.g. "autotrader-uk"
  dest:    z.string().url(),             // destination URL (affiliate or direct)
  plate:   z.string().min(1).max(20).default('unknown'),
  country: z.string().length(2).transform(s => s.toUpperCase()),
});

export async function trackRoute(app: FastifyInstance): Promise<void> {
  // ── GET /track/click ─────────────────────────────────────────────────────
  app.get<{ Querystring: Record<string, string> }>('/track/click', async (request, reply) => {
    const parsed = ClickSchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({ status: 400, title: 'Bad Request', detail: 'Invalid parameters' });
    }

    const { lid, dest, plate, country } = parsed.data;

    // Validate destination host against allowlist
    let destHost: string;
    try {
      destHost = new URL(dest).hostname;
    } catch {
      return reply.status(400).send({ status: 400, title: 'Bad Request', detail: 'Invalid dest URL' });
    }

    if (!ALLOWED_HOSTS.has(destHost)) {
      return reply.status(400).send({ status: 400, title: 'Bad Request', detail: 'Destination not permitted' });
    }

    // Log the click (fire-and-forget — never block the redirect)
    const event = { listingId: lid, plate: plate.toUpperCase(), country, ts: new Date().toISOString() };
    clickTracker.record(event).catch(err => app.log.warn({ err }, 'click-tracker record failed'));
    app.log.info({ event: 'click', ...event }, 'listing click');

    return reply.redirect(302, dest);
  });

  // ── GET /track/stats ──────────────────────────────────────────────────────
  app.get('/track/stats', async (_request, reply) => {
    const stats = await clickTracker.stats();
    return reply.send(stats);
  });
}
