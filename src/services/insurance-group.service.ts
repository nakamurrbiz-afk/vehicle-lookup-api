// Insurance group estimates by make (groups 1–50, Thatcham/ABI system)
// These are typical midpoint ranges — actual group depends on exact model/trim.
// Source: comparethemarket.com / gocompare.com / Thatcham Research 2024

const GROUP_RANGES: Record<string, [number, number]> = {
  // Economy / city cars
  DACIA: [1, 12], SUZUKI: [3, 20], CITROEN: [3, 25], PEUGEOT: [4, 28],
  RENAULT: [4, 28], FIAT: [3, 22], SEAT: [5, 30], SKODA: [5, 28],

  // Mainstream
  FORD: [5, 32], VAUXHALL: [5, 30], OPEL: [5, 30],
  VOLKSWAGEN: [8, 36], TOYOTA: [5, 30], HONDA: [6, 34],
  HYUNDAI: [5, 30], KIA: [5, 30], MAZDA: [8, 32], NISSAN: [6, 32],
  MITSUBISHI: [8, 34], SUBARU: [12, 38],

  // Premium
  VOLVO: [16, 40], AUDI: [16, 44], BMW: [18, 48],
  MERCEDES: [20, 50], 'MERCEDES-BENZ': [20, 50],
  LEXUS: [20, 44], GENESIS: [20, 42],

  // Performance / luxury
  TESLA: [38, 50], PORSCHE: [40, 50], LAMBORGHINI: [48, 50],
  FERRARI: [48, 50], MASERATI: [40, 50],
  JAGUAR: [22, 50], 'LAND ROVER': [24, 50], RANGE: [30, 50],

  // American
  JEEP: [16, 40], DODGE: [30, 50],

  // Chinese
  MG: [6, 24], BYD: [22, 40],
};

export interface InsuranceGroupEstimate {
  min: number;
  max: number;
  label: string;  // e.g. "18–48 (estimate)"
}

export function getInsuranceGroup(make: string | null | undefined): InsuranceGroupEstimate | null {
  if (!make) return null;
  const key = make.toUpperCase().trim();
  const range = GROUP_RANGES[key];
  if (!range) return null;
  return { min: range[0], max: range[1], label: `${range[0]}–${range[1]}` };
}
