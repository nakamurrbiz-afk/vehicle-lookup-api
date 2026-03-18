// UK new car MSRP ranges (2024–2025, OTR prices)
// Sources: manufacturer UK websites, What Car?, Auto Express (Jan 2025)
// Key: "MAKE:MODEL" — both uppercase, spaces preserved

export interface NewCarPrice {
  from:     number;   // £
  to:       number;   // £
  currency: 'GBP' | 'USD';
  note?:    string;   // e.g. "Discontinued 2023"
}

const PRICES: Record<string, NewCarPrice> = {
  // ── Ford ──────────────────────────────────────────────────────────
  'FORD:FIESTA':       { from: 18000, to: 24000, currency: 'GBP', note: 'Discontinued 2023' },
  'FORD:FOCUS':        { from: 24000, to: 36000, currency: 'GBP' },
  'FORD:PUMA':         { from: 23000, to: 33000, currency: 'GBP' },
  'FORD:KUGA':         { from: 30000, to: 46000, currency: 'GBP' },
  'FORD:MUSTANG MACH-E': { from: 42000, to: 60000, currency: 'GBP' },
  'FORD:EXPLORER':     { from: 44000, to: 52000, currency: 'GBP' },
  'FORD:RANGER':       { from: 30000, to: 48000, currency: 'GBP' },

  // ── Volkswagen ────────────────────────────────────────────────────
  'VOLKSWAGEN:POLO':   { from: 20000, to: 27000, currency: 'GBP' },
  'VOLKSWAGEN:GOLF':   { from: 27000, to: 45000, currency: 'GBP' },
  'VOLKSWAGEN:TIGUAN': { from: 34000, to: 52000, currency: 'GBP' },
  'VOLKSWAGEN:PASSAT': { from: 36000, to: 50000, currency: 'GBP' },
  'VOLKSWAGEN:ID.3':   { from: 33000, to: 42000, currency: 'GBP' },
  'VOLKSWAGEN:ID.4':   { from: 39000, to: 55000, currency: 'GBP' },
  'VOLKSWAGEN:TOUAREG':{ from: 58000, to: 90000, currency: 'GBP' },

  // ── BMW ───────────────────────────────────────────────────────────
  'BMW:1 SERIES':      { from: 30000, to: 42000, currency: 'GBP' },
  'BMW:2 SERIES':      { from: 33000, to: 50000, currency: 'GBP' },
  'BMW:3 SERIES':      { from: 38000, to: 58000, currency: 'GBP' },
  'BMW:4 SERIES':      { from: 43000, to: 68000, currency: 'GBP' },
  'BMW:5 SERIES':      { from: 51000, to: 75000, currency: 'GBP' },
  'BMW:X1':            { from: 37000, to: 52000, currency: 'GBP' },
  'BMW:X3':            { from: 48000, to: 72000, currency: 'GBP' },
  'BMW:X5':            { from: 65000, to: 100000, currency: 'GBP' },
  'BMW:I4':            { from: 54000, to: 72000, currency: 'GBP' },
  'BMW:IX':            { from: 75000, to: 110000, currency: 'GBP' },

  // ── Mercedes-Benz ─────────────────────────────────────────────────
  'MERCEDES:A-CLASS':  { from: 32000, to: 45000, currency: 'GBP' },
  'MERCEDES:C-CLASS':  { from: 43000, to: 65000, currency: 'GBP' },
  'MERCEDES:E-CLASS':  { from: 56000, to: 85000, currency: 'GBP' },
  'MERCEDES:S-CLASS':  { from: 95000, to: 180000, currency: 'GBP' },
  'MERCEDES:GLA':      { from: 36000, to: 52000, currency: 'GBP' },
  'MERCEDES:GLC':      { from: 52000, to: 75000, currency: 'GBP' },
  'MERCEDES:EQA':      { from: 42000, to: 55000, currency: 'GBP' },
  'MERCEDES:EQC':      { from: 65000, to: 82000, currency: 'GBP' },
  'MERCEDES-BENZ:A-CLASS':  { from: 32000, to: 45000, currency: 'GBP' },
  'MERCEDES-BENZ:C-CLASS':  { from: 43000, to: 65000, currency: 'GBP' },
  'MERCEDES-BENZ:E-CLASS':  { from: 56000, to: 85000, currency: 'GBP' },
  'MERCEDES-BENZ:GLC':      { from: 52000, to: 75000, currency: 'GBP' },

  // ── Audi ──────────────────────────────────────────────────────────
  'AUDI:A1':           { from: 23000, to: 32000, currency: 'GBP' },
  'AUDI:A3':           { from: 28000, to: 42000, currency: 'GBP' },
  'AUDI:A4':           { from: 37000, to: 55000, currency: 'GBP' },
  'AUDI:A6':           { from: 48000, to: 72000, currency: 'GBP' },
  'AUDI:Q3':           { from: 34000, to: 46000, currency: 'GBP' },
  'AUDI:Q5':           { from: 46000, to: 68000, currency: 'GBP' },
  'AUDI:Q7':           { from: 63000, to: 95000, currency: 'GBP' },
  'AUDI:E-TRON':       { from: 72000, to: 100000, currency: 'GBP' },

  // ── Toyota ────────────────────────────────────────────────────────
  'TOYOTA:YARIS':      { from: 20000, to: 26000, currency: 'GBP' },
  'TOYOTA:COROLLA':    { from: 26000, to: 38000, currency: 'GBP' },
  'TOYOTA:C-HR':       { from: 29000, to: 38000, currency: 'GBP' },
  'TOYOTA:RAV4':       { from: 33000, to: 47000, currency: 'GBP' },
  'TOYOTA:PRIUS':      { from: 30000, to: 40000, currency: 'GBP' },
  'TOYOTA:HIGHLANDER': { from: 50000, to: 62000, currency: 'GBP' },
  'TOYOTA:BZ4X':       { from: 42000, to: 52000, currency: 'GBP' },
  'TOYOTA:ALPHARD':    { from: 70000, to: 90000, currency: 'GBP' },

  // ── Honda ─────────────────────────────────────────────────────────
  'HONDA:JAZZ':        { from: 23000, to: 29000, currency: 'GBP' },
  'HONDA:CIVIC':       { from: 27000, to: 38000, currency: 'GBP' },
  'HONDA:CR-V':        { from: 36000, to: 50000, currency: 'GBP' },
  'HONDA:HR-V':        { from: 28000, to: 36000, currency: 'GBP' },
  'HONDA:E':           { from: 38000, to: 44000, currency: 'GBP' },

  // ── Hyundai ───────────────────────────────────────────────────────
  'HYUNDAI:I20':       { from: 19000, to: 26000, currency: 'GBP' },
  'HYUNDAI:I30':       { from: 24000, to: 34000, currency: 'GBP' },
  'HYUNDAI:TUCSON':    { from: 29000, to: 43000, currency: 'GBP' },
  'HYUNDAI:SANTA FE':  { from: 42000, to: 58000, currency: 'GBP' },
  'HYUNDAI:IONIQ 5':   { from: 42000, to: 56000, currency: 'GBP' },
  'HYUNDAI:IONIQ 6':   { from: 39000, to: 54000, currency: 'GBP' },

  // ── Kia ───────────────────────────────────────────────────────────
  'KIA:PICANTO':       { from: 15000, to: 19000, currency: 'GBP' },
  'KIA:CEED':          { from: 23000, to: 33000, currency: 'GBP' },
  'KIA:SPORTAGE':      { from: 28000, to: 44000, currency: 'GBP' },
  'KIA:SORENTO':       { from: 40000, to: 58000, currency: 'GBP' },
  'KIA:EV6':           { from: 41000, to: 57000, currency: 'GBP' },
  'KIA:NIRO':          { from: 30000, to: 40000, currency: 'GBP' },

  // ── Vauxhall ──────────────────────────────────────────────────────
  'VAUXHALL:CORSA':    { from: 18000, to: 28000, currency: 'GBP' },
  'VAUXHALL:ASTRA':    { from: 24000, to: 36000, currency: 'GBP' },
  'VAUXHALL:MOKKA':    { from: 24000, to: 36000, currency: 'GBP' },
  'VAUXHALL:GRANDLAND':{ from: 30000, to: 45000, currency: 'GBP' },

  // ── Tesla ─────────────────────────────────────────────────────────
  'TESLA:MODEL 3':     { from: 40000, to: 55000, currency: 'GBP' },
  'TESLA:MODEL Y':     { from: 43000, to: 58000, currency: 'GBP' },
  'TESLA:MODEL S':     { from: 90000, to: 110000, currency: 'GBP' },
  'TESLA:MODEL X':     { from: 95000, to: 120000, currency: 'GBP' },

  // ── Volvo ─────────────────────────────────────────────────────────
  'VOLVO:XC40':        { from: 38000, to: 58000, currency: 'GBP' },
  'VOLVO:XC60':        { from: 48000, to: 70000, currency: 'GBP' },
  'VOLVO:XC90':        { from: 65000, to: 95000, currency: 'GBP' },
  'VOLVO:EX30':        { from: 34000, to: 45000, currency: 'GBP' },
  'VOLVO:EX40':        { from: 45000, to: 60000, currency: 'GBP' },

  // ── Land Rover / Range Rover ──────────────────────────────────────
  'LAND ROVER:DEFENDER':    { from: 50000, to: 120000, currency: 'GBP' },
  'LAND ROVER:DISCOVERY':   { from: 57000, to: 90000, currency: 'GBP' },
  'LAND ROVER:RANGE ROVER': { from: 100000, to: 200000, currency: 'GBP' },
  'LAND ROVER:RANGE ROVER SPORT': { from: 80000, to: 140000, currency: 'GBP' },
  'LAND ROVER:RANGE ROVER EVOQUE': { from: 45000, to: 65000, currency: 'GBP' },
  'LAND ROVER:FREELANDER':  { from: 30000, to: 38000, currency: 'GBP', note: 'Discontinued' },

  // ── Jaguar ────────────────────────────────────────────────────────
  'JAGUAR:F-PACE':     { from: 53000, to: 90000, currency: 'GBP' },
  'JAGUAR:E-PACE':     { from: 40000, to: 58000, currency: 'GBP' },
  'JAGUAR:I-PACE':     { from: 70000, to: 85000, currency: 'GBP' },
  'JAGUAR:XF':         { from: 43000, to: 65000, currency: 'GBP' },

  // ── Porsche ───────────────────────────────────────────────────────
  'PORSCHE:CAYENNE':   { from: 80000, to: 180000, currency: 'GBP' },
  'PORSCHE:MACAN':     { from: 55000, to: 95000, currency: 'GBP' },
  'PORSCHE:TAYCAN':    { from: 83000, to: 180000, currency: 'GBP' },
  'PORSCHE:PANAMERA':  { from: 88000, to: 175000, currency: 'GBP' },
  'PORSCHE:911':       { from: 110000, to: 250000, currency: 'GBP' },

  // ── Peugeot ───────────────────────────────────────────────────────
  'PEUGEOT:208':       { from: 19000, to: 28000, currency: 'GBP' },
  'PEUGEOT:308':       { from: 26000, to: 38000, currency: 'GBP' },
  'PEUGEOT:3008':      { from: 33000, to: 48000, currency: 'GBP' },
  'PEUGEOT:5008':      { from: 37000, to: 52000, currency: 'GBP' },
  'PEUGEOT:E-208':     { from: 28000, to: 36000, currency: 'GBP' },

  // ── Renault ───────────────────────────────────────────────────────
  'RENAULT:CLIO':      { from: 17000, to: 26000, currency: 'GBP' },
  'RENAULT:MEGANE':    { from: 24000, to: 36000, currency: 'GBP' },
  'RENAULT:CAPTUR':    { from: 22000, to: 32000, currency: 'GBP' },
  'RENAULT:KADJAR':    { from: 26000, to: 34000, currency: 'GBP' },
  'RENAULT:ZOE':       { from: 28000, to: 35000, currency: 'GBP', note: 'Discontinued' },
};

function fmt(currency: 'GBP' | 'USD', amount: number): string {
  const symbol = currency === 'GBP' ? '£' : '$';
  return symbol + amount.toLocaleString('en-GB');
}

export interface NewCarPriceResult {
  from:     string;
  to:       string;
  note?:    string;
  currency: 'GBP' | 'USD';
  source:   string;
}

export function getNewCarPrice(
  make: string | null,
  model: string | null,
): NewCarPriceResult | null {
  if (!make) return null;
  const key = model
    ? `${make.toUpperCase()}:${model.toUpperCase()}`
    : null;
  const entry = key ? PRICES[key] : null;
  if (!entry) return null;
  return {
    from:     fmt(entry.currency, entry.from),
    to:       fmt(entry.currency, entry.to),
    note:     entry.note,
    currency: entry.currency,
    source:   'What Car? / manufacturer UK (Jan 2025)',
  };
}
