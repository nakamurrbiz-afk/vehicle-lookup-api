// Wikipedia article titles to try when only make is known (no model from DVLA yet).
// Ordered by preference — most visually representative model first.
// Keys must match DVLA make strings (uppercase).
export const MAKE_WIKI_FALLBACKS: Record<string, string[]> = {
  // Luxury / ultra-luxury
  'ROLLS ROYCE':   ['Rolls-Royce_Ghost', 'Rolls-Royce_Phantom', 'Rolls-Royce_Cullinan', 'Rolls-Royce_Motor_Cars'],
  'BENTLEY':       ['Bentley_Continental_GT', 'Bentley_Flying_Spur', 'Bentley_Bentayga', 'Bentley_Motors'],
  'ASTON MARTIN':  ['Aston_Martin_DB12', 'Aston_Martin_Vantage', 'Aston_Martin_DBX', 'Aston_Martin'],
  'MCLAREN':       ['McLaren_Artura', 'McLaren_720S', 'McLaren_GT', 'McLaren_Automotive'],
  'FERRARI':       ['Ferrari_Roma', 'Ferrari_F8_Tributo', 'Ferrari_Purosangue', 'Ferrari'],
  'LAMBORGHINI':   ['Lamborghini_Urus', 'Lamborghini_Huracán', 'Lamborghini_Revuelto', 'Lamborghini'],
  'BUGATTI':       ['Bugatti_Chiron', 'Bugatti'],
  'KOENIGSEGG':    ['Koenigsegg_Jesko', 'Koenigsegg'],
  'PAGANI':        ['Pagani_Huayra', 'Pagani'],

  // Premium European
  'PORSCHE':       ['Porsche_Cayenne', 'Porsche_Panamera', 'Porsche_Taycan', 'Porsche'],
  'BMW':           ['BMW_5_Series', 'BMW_3_Series', 'BMW_X5', 'BMW'],
  'MERCEDES':      ['Mercedes-Benz_E-Class', 'Mercedes-Benz_C-Class', 'Mercedes-Benz_GLE', 'Mercedes-Benz'],
  'MERCEDES BENZ': ['Mercedes-Benz_E-Class', 'Mercedes-Benz_C-Class', 'Mercedes-Benz_GLE', 'Mercedes-Benz'],
  'AUDI':          ['Audi_A6', 'Audi_Q5', 'Audi_A4', 'Audi'],
  'JAGUAR':        ['Jaguar_F-Pace', 'Jaguar_F-Type', 'Jaguar_XF', 'Jaguar_Cars'],
  'LAND ROVER':    ['Range_Rover', 'Land_Rover_Defender', 'Land_Rover_Discovery', 'Land_Rover'],
  'VOLVO':         ['Volvo_XC60', 'Volvo_XC90', 'Volvo_V90', 'Volvo_Cars'],
  'ALFA ROMEO':    ['Alfa_Romeo_Giulia', 'Alfa_Romeo_Stelvio', 'Alfa_Romeo'],
  'MASERATI':      ['Maserati_Ghibli', 'Maserati_Levante', 'Maserati'],

  // Mainstream European
  'VOLKSWAGEN':    ['Volkswagen_Golf', 'Volkswagen_Tiguan', 'Volkswagen_Passat', 'Volkswagen'],
  'FORD':          ['Ford_Focus', 'Ford_Puma', 'Ford_Kuga', 'Ford_Motor_Company'],
  'VAUXHALL':      ['Vauxhall_Astra', 'Vauxhall_Corsa', 'Vauxhall_Mokka', 'Vauxhall'],
  'PEUGEOT':       ['Peugeot_3008', 'Peugeot_208', 'Peugeot_308', 'Peugeot'],
  'RENAULT':       ['Renault_Clio', 'Renault_Megane', 'Renault_Captur', 'Renault'],
  'CITROEN':       ['Citroën_C3', 'Citroën_C5_X', 'Citroën'],
  'SKODA':         ['Škoda_Octavia', 'Škoda_Kodiaq', 'Škoda_Auto'],
  'SEAT':          ['SEAT_Leon', 'SEAT_Ateca', 'SEAT'],
  'FIAT':          ['Fiat_500', 'Fiat_Panda', 'Fiat'],
  'MINI':          ['Mini_Hatch', 'Mini_(marque)'],
  'SMART':         ['Smart_#1', 'Smart_fortwo', 'Smart_(automobile)'],

  // Japanese
  'TOYOTA':        ['Toyota_Corolla', 'Toyota_RAV4', 'Toyota_Yaris', 'Toyota'],
  'HONDA':         ['Honda_Civic', 'Honda_CR-V', 'Honda_Jazz', 'Honda'],
  'NISSAN':        ['Nissan_Qashqai', 'Nissan_Juke', 'Nissan_Leaf', 'Nissan'],
  'MAZDA':         ['Mazda_CX-5', 'Mazda3', 'Mazda_MX-5', 'Mazda'],
  'MITSUBISHI':    ['Mitsubishi_Outlander', 'Mitsubishi_Eclipse_Cross', 'Mitsubishi'],
  'SUBARU':        ['Subaru_Forester', 'Subaru_Outback', 'Subaru'],
  'LEXUS':         ['Lexus_RX', 'Lexus_UX', 'Lexus_NX', 'Lexus'],
  'INFINITI':      ['Infiniti_QX50', 'Infiniti'],

  // Korean
  'HYUNDAI':       ['Hyundai_Tucson', 'Hyundai_i30', 'Hyundai_Ioniq', 'Hyundai'],
  'KIA':           ['Kia_Sportage', 'Kia_Ceed', 'Kia_Niro', 'Kia'],
  'GENESIS':       ['Genesis_GV80', 'Genesis_(car)', 'Genesis_Motor'],

  // American
  'TESLA':         ['Tesla_Model_3', 'Tesla_Model_Y', 'Tesla_Model_S', 'Tesla,_Inc.'],
  'JEEP':          ['Jeep_Wrangler', 'Jeep_Cherokee', 'Jeep'],
  'CHRYSLER':      ['Chrysler_300', 'Chrysler'],
  'DODGE':         ['Dodge_Challenger', 'Dodge_Charger', 'Dodge'],
  'CADILLAC':      ['Cadillac_Escalade', 'Cadillac'],
  'LINCOLN':       ['Lincoln_Navigator', 'Lincoln_Motor_Company'],

  // Other
  'CUPRA':         ['Cupra_Formentor', 'Cupra_(automobile)'],
  'DS':            ['DS_3', 'DS_Automobiles'],
  'MG':            ['MG_ZS_EV', 'MG_Motor'],
  'DACIA':         ['Dacia_Sandero', 'Dacia_Duster', 'Dacia'],
  'SUZUKI':        ['Suzuki_Swift', 'Suzuki_Vitara', 'Suzuki'],
};
