import { request } from 'undici';
import { z } from 'zod';
import { config } from '../config/env';

// EPA fueleconomy.gov API — free, no auth required
// Docs: https://www.fueleconomy.gov/feg/ws/index.shtml

const EpaVehicleSchema = z.object({
  id:       z.union([z.number(), z.string()]),
  city08:   z.number().optional(), // city MPG (gasoline)
  highway08:z.number().optional(), // highway MPG
  comb08:   z.number().optional(), // combined MPG
  cityA08:  z.number().optional(), // city MPGe (alt fuel)
  hwyA08:   z.number().optional(),
});

const EpaSearchResultSchema = z.object({
  vehicle: z.union([
    z.array(EpaVehicleSchema),
    EpaVehicleSchema,
  ]).optional(),
});

export interface EpaMpg {
  city:    number;
  highway: number;
}

async function fetchJson(url: string): Promise<unknown> {
  try {
    const res = await request(url, {
      method:         'GET',
      headers:        { Accept: 'application/json' },
      bodyTimeout:    config.httpTimeoutMs,
      headersTimeout: config.httpTimeoutMs,
    });
    if (res.statusCode !== 200) return null;
    return res.body.json();
  } catch {
    return null;
  }
}

export async function getEpaMpg(
  make:  string,
  model: string,
  year:  number,
): Promise<EpaMpg | null> {
  // Step 1: search by make/model/year
  const searchUrl = `https://www.fueleconomy.gov/ws/rest/vehicle/menu/options?year=${year}&make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}`;
  const searchBody = await fetchJson(searchUrl);

  // The options endpoint returns trim-level IDs — grab the first
  const trimSchema = z.object({
    menuItem: z.union([
      z.array(z.object({ value: z.string() })),
      z.object({ value: z.string() }),
    ]).optional(),
  });

  const trimParsed = trimSchema.safeParse(searchBody);
  if (!trimParsed.success) return null;

  const menuItem = trimParsed.data.menuItem;
  if (!menuItem) return null;

  const firstId = Array.isArray(menuItem) ? menuItem[0]?.value : menuItem.value;
  if (!firstId) return null;

  // Step 2: fetch full vehicle data by ID
  const vehicleUrl = `https://www.fueleconomy.gov/ws/rest/vehicle/${firstId}`;
  const vehicleBody = await fetchJson(vehicleUrl);

  const vehicleParsed = EpaVehicleSchema.safeParse(vehicleBody);
  if (!vehicleParsed.success) return null;

  const v = vehicleParsed.data;
  const city    = v.city08 ?? v.cityA08 ?? 0;
  const highway = v.highway08 ?? v.hwyA08 ?? 0;

  if (!city || !highway) return null;
  return { city, highway };
}
