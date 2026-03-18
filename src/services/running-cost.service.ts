// Annual running cost estimates for UK vehicles (~10,000 miles/yr)
// Sources: RAC Cost of Motoring 2024, AA Motoring Costs 2024, Which? 2024

export interface RunningCost {
  fuelPerYear: string;   // e.g. "£1,400–£1,800"
  totalPerYear: string;  // fuel + servicing + insurance estimate
  perMile: string;       // pence per mile
  source: string;
}

const COST_MAP: Record<string, RunningCost> = {
  PETROL: {
    fuelPerYear:  '£1,400–£1,800',
    totalPerYear: '£2,500–£3,500',
    perMile:      '25–35p',
    source: 'RAC / AA Cost of Motoring 2024',
  },
  DIESEL: {
    fuelPerYear:  '£1,200–£1,600',
    totalPerYear: '£2,400–£3,200',
    perMile:      '24–32p',
    source: 'RAC / AA Cost of Motoring 2024',
  },
  'HYBRID ELECTRIC': {
    fuelPerYear:  '£800–£1,200',
    totalPerYear: '£1,800–£2,800',
    perMile:      '18–28p',
    source: 'Which? Running Costs 2024',
  },
  ELECTRICITY: {
    fuelPerYear:  '£400–£700',
    totalPerYear: '£1,200–£2,000',
    perMile:      '12–20p',
    source: 'Zapmap / Pod Point 2024',
  },
  'PLUG-IN HYBRID': {
    fuelPerYear:  '£700–£1,100',
    totalPerYear: '£1,700–£2,600',
    perMile:      '17–26p',
    source: 'Which? Running Costs 2024',
  },
};

export function getRunningCost(fuelType: string | null | undefined): RunningCost | null {
  if (!fuelType) return null;
  return COST_MAP[fuelType.toUpperCase().trim()] ?? null;
}
