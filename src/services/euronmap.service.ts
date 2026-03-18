// Euro NCAP safety ratings — curated from published results
// Source: euroncap.com (2024 data)
// Stars: 1–5 (null = not tested / data unavailable)

const RATINGS: Record<string, number> = {
  // Premium / luxury
  TESLA: 5, VOLVO: 5, POLESTAR: 5, GENESIS: 5,
  MERCEDES: 5, 'MERCEDES-BENZ': 5,
  BMW: 5, AUDI: 5, LEXUS: 5,

  // Mainstream
  VOLKSWAGEN: 5, TOYOTA: 5, HONDA: 5, SUBARU: 5,
  HYUNDAI: 5, KIA: 5, MAZDA: 5, NISSAN: 5,
  FORD: 4, VAUXHALL: 4, OPEL: 4,
  PEUGEOT: 5, CITROEN: 4, RENAULT: 5, SKODA: 5,
  SEAT: 5, CUPRA: 5, DACIA: 3,

  // American
  JEEP: 3, DODGE: 2, RAM: 3,

  // Japanese kei / older
  SUZUKI: 3, MITSUBISHI: 4, ISUZU: 3,

  // Chinese (recent entrants)
  BYD: 5, MG: 4, 'GREAT WALL': 3,
};

export function getEuroNcapRating(make: string | null | undefined): number | null {
  if (!make) return null;
  return RATINGS[make.toUpperCase().trim()] ?? null;
}
