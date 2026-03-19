import { request } from 'undici';
import { config } from '../config/env';

export interface ScrapeResult {
  minPrice: string | null;   // e.g. "£45,000" or "$12,500"
  count:    number | null;
}

const BROWSER_HEADERS = {
  'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-GB,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Cache-Control':   'no-cache',
};

async function fetchPage(url: string): Promise<string | null> {
  try {
    const res = await request(url, {
      method: 'GET',
      headers: BROWSER_HEADERS,
      bodyTimeout: config.httpTimeoutMs,
      headersTimeout: config.httpTimeoutMs,
      maxRedirections: 3,
    });
    if (res.statusCode !== 200) return null;
    const buf = await res.body.arrayBuffer();
    return Buffer.from(buf).toString('utf-8');
  } catch {
    return null;
  }
}

// Extract __NEXT_DATA__ JSON from Next.js pages
function extractNextData(html: string): unknown | null {
  const m = html.match(/<script[^>]+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) return null;
  try { return JSON.parse(m[1]); } catch { return null; }
}

// Collect all price-like numbers from JSON or HTML
function collectGBPPrices(html: string): number[] {
  const prices: number[] = [];

  // JSON fields: "price":45000 / "priceGBP":45000 / "salePrice":45000
  const jsonRe = /"(?:price|priceGbp|salePrice|askingPrice|retailPrice)"\s*:\s*(\d{3,7})/gi;
  let m: RegExpExecArray | null;
  while ((m = jsonRe.exec(html)) !== null) {
    const v = parseInt(m[1], 10);
    if (v >= 500 && v <= 300000) prices.push(v);
  }

  // Text like £12,500 or £12500
  const textRe = /£\s*(\d{1,3}(?:,\d{3})*)/g;
  while ((m = textRe.exec(html)) !== null) {
    const v = parseInt(m[1].replace(/,/g, ''), 10);
    if (v >= 500 && v <= 300000) prices.push(v);
  }

  return prices;
}

function collectUSDPrices(html: string): number[] {
  const prices: number[] = [];
  const jsonRe = /"(?:price|salePrice|askingPrice|listPrice)"\s*:\s*(\d{3,7})/gi;
  let m: RegExpExecArray | null;
  while ((m = jsonRe.exec(html)) !== null) {
    const v = parseInt(m[1], 10);
    if (v >= 500 && v <= 500000) prices.push(v);
  }
  const textRe = /\$\s*(\d{1,3}(?:,\d{3})*)/g;
  while ((m = textRe.exec(html)) !== null) {
    const v = parseInt(m[1].replace(/,/g, ''), 10);
    if (v >= 500 && v <= 500000) prices.push(v);
  }
  return prices;
}

function fmtGBP(p: number): string { return '£' + p.toLocaleString('en-GB'); }
function fmtUSD(p: number): string { return '$' + p.toLocaleString('en-US'); }
function fmtJPY(p: number): string {
  const man = Math.round(p / 10000);
  return man >= 1 ? `¥${man}万` : `¥${p.toLocaleString('ja-JP')}`;
}
function fmtEUR(p: number): string { return '€' + p.toLocaleString('nl-NL'); }

function collectJPYPrices(html: string): number[] {
  const prices: number[] = [];
  let m: RegExpExecArray | null;
  // 58.0万円 / 58万円
  const manRe = /(\d+(?:\.\d+)?)万円/g;
  while ((m = manRe.exec(html)) !== null) {
    const v = Math.round(parseFloat(m[1]) * 10000);
    if (v >= 50000 && v <= 100_000_000) prices.push(v);
  }
  // 580,000円
  const yenRe = /(\d{1,3}(?:,\d{3})+)円/g;
  while ((m = yenRe.exec(html)) !== null) {
    const v = parseInt(m[1].replace(/,/g, ''), 10);
    if (v >= 50000 && v <= 100_000_000) prices.push(v);
  }
  return prices;
}

function collectEURPrices(html: string): number[] {
  const prices: number[] = [];
  let m: RegExpExecArray | null;
  // €12.500 (Dutch dot-separator) or €12,500
  const euRe = /€\s*(\d{1,3}(?:[.,]\d{3})*)/g;
  while ((m = euRe.exec(html)) !== null) {
    const v = parseInt(m[1].replace(/[.,]/g, ''), 10);
    if (v >= 100 && v <= 500_000) prices.push(v);
  }
  // JSON: "price":12500
  const jsonRe = /"(?:price|askingPrice|salePrice|priceRaw)"\s*:\s*(\d{3,7})/gi;
  while ((m = jsonRe.exec(html)) !== null) {
    const v = parseInt(m[1], 10);
    if (v >= 100 && v <= 500_000) prices.push(v);
  }
  return prices;
}

// ── AutoTrader UK ────────────────────────────────────────
export async function scrapeAutoTraderUK(
  make: string, model: string, yearFrom?: number
): Promise<ScrapeResult> {
  const params = new URLSearchParams({
    make:  make.toUpperCase(),
    model: model.toUpperCase(),
    sort:  'price-asc',
    ...(yearFrom ? { 'year-from': String(yearFrom) } : {}),
  });
  const url  = `https://www.autotrader.co.uk/car-search?${params}`;
  const html = await fetchPage(url);
  if (!html) return { minPrice: null, count: null };

  // Try __NEXT_DATA__ first
  const next = extractNextData(html) as Record<string, unknown> | null;
  if (next) {
    const str = JSON.stringify(next);
    const prices = collectGBPPrices(str);
    if (prices.length > 0) {
      return { minPrice: fmtGBP(Math.min(...prices)), count: null };
    }
  }

  const prices = collectGBPPrices(html);
  if (prices.length === 0) return { minPrice: null, count: null };
  return { minPrice: fmtGBP(Math.min(...prices)), count: null };
}

// ── Motors.co.uk ─────────────────────────────────────────
export async function scrapeMotorsUK(
  make: string, model: string
): Promise<ScrapeResult> {
  const url  = `https://www.motors.co.uk/search/car/make-${make.toLowerCase()}/model-${model.toLowerCase()}/?sort=price_asc`;
  const html = await fetchPage(url);
  if (!html) return { minPrice: null, count: null };

  const prices = collectGBPPrices(html);
  if (prices.length === 0) return { minPrice: null, count: null };
  return { minPrice: fmtGBP(Math.min(...prices)), count: null };
}

// ── CarGurus US ───────────────────────────────────────────
export async function scrapeCarGurusUS(
  make: string, model: string
): Promise<ScrapeResult> {
  const url  = `https://www.cargurus.com/Cars/new/nl_${encodeURIComponent(make)}_${encodeURIComponent(model)}?sortDir=ASC&sortType=PRICE`;
  const html = await fetchPage(url);
  if (!html) return { minPrice: null, count: null };

  const prices = collectUSDPrices(html);
  if (prices.length === 0) return { minPrice: null, count: null };
  return { minPrice: fmtUSD(Math.min(...prices)), count: null };
}

// ── AutoTrader US ─────────────────────────────────────────
export async function scrapeAutoTraderUS(
  make: string, model: string
): Promise<ScrapeResult> {
  const url  = `https://www.autotrader.com/cars-for-sale/used-cars/${make.toLowerCase()}/${model.toLowerCase()}/?sortBy=pricingLow`;
  const html = await fetchPage(url);
  if (!html) return { minPrice: null, count: null };

  const prices = collectUSDPrices(html);
  if (prices.length === 0) return { minPrice: null, count: null };
  return { minPrice: fmtUSD(Math.min(...prices)), count: null };
}

// ── CarSensor JP ──────────────────────────────────────────
export async function scrapeCarSensorJP(
  make: string, model: string
): Promise<ScrapeResult> {
  const params = new URLSearchParams({
    MAKENAME: make.toUpperCase(),
    CARNAME:  model.toUpperCase(),
    sort:     'TP',  // price ascending
  });
  const html = await fetchPage(`https://www.carsensor.net/usedcar/search.php?${params}`);
  if (!html) return { minPrice: null, count: null };
  const prices = collectJPYPrices(html);
  if (prices.length === 0) return { minPrice: null, count: null };
  return { minPrice: fmtJPY(Math.min(...prices)), count: null };
}

// ── Goo-net JP ────────────────────────────────────────────
export async function scrapeGoonetJP(
  make: string, model: string
): Promise<ScrapeResult> {
  const url  = `https://www.goo-net.com/usedcar/brand-${encodeURIComponent(make.toUpperCase())}/cartype-${encodeURIComponent(model.toUpperCase())}/?sort=3`;
  const html = await fetchPage(url);
  if (!html) return { minPrice: null, count: null };
  const prices = collectJPYPrices(html);
  if (prices.length === 0) return { minPrice: null, count: null };
  return { minPrice: fmtJPY(Math.min(...prices)), count: null };
}

// ── Marktplaats NL ────────────────────────────────────────
export async function scrapeMarktplaatsNL(
  make: string, model: string
): Promise<ScrapeResult> {
  const params = new URLSearchParams({
    query:      `${make} ${model}`,
    categoryId: '91',
    sortBy:     'PRICE',
    sortOrder:  'INCREASING',
  });
  const html = await fetchPage(`https://www.marktplaats.nl/l/auto-s/?${params}`);
  if (!html) return { minPrice: null, count: null };
  const prices = collectEURPrices(html);
  if (prices.length === 0) return { minPrice: null, count: null };
  return { minPrice: fmtEUR(Math.min(...prices)), count: null };
}
