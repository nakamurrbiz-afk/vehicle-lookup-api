export interface ListingLink {
  id:       string;
  site:     string;
  flag:     string;
  url:      string;
  cta:      string;
  color:    string;
  minPrice: string | null;
}

export function buildListings(
  make:     string,
  model:    string,
  year:     number | null,
  country:  string,
  postcode?: string,          // UK postcode or US zip code
): ListingLink[] {
  const makeUC   = make.toUpperCase();
  const modelUC  = model.toUpperCase();
  const makeLow  = make.toLowerCase();
  const modelLow = model.toLowerCase().replace(/\s+/g, '-');
  const yearTo   = year ? year + 2 : new Date().getFullYear() + 1;
  const yearFrom = year ? year - 2 : undefined;

  if (country === 'GB') {
    // Postcode formatted as "W1K 3JP" → URL uses "W1K+3JP"
    const pc = postcode ? postcode.trim().toUpperCase() : '';

    // ── AutoTrader UK ──────────────────────────────────────────────────
    // Reference: https://www.autotrader.co.uk/car-search?channel=cars
    //   &postcode=W1K+3JP&make=Toyota&model=Alphard
    //   &homeDeliveryAdverts=exclude&advertising-location=at_cars&year-to=2026
    const atParams = new URLSearchParams({
      channel:                'cars',
      make:                   makeUC,
      model:                  modelUC,
      'homeDeliveryAdverts':  'exclude',
      'advertising-location': 'at_cars',
      'year-to':              String(yearTo),
      ...(yearFrom ? { 'year-from': String(yearFrom) } : {}),
      ...(pc       ? { postcode: pc } : {}),
    });

    // ── Motors.co.uk ───────────────────────────────────────────────────
    // Pattern: /search/car/?make=toyota&model=alphard&postcode=W1K3JP
    //   &radius=50&year-to=2026
    const moParams = new URLSearchParams({
      make:      makeLow,
      model:     modelLow,
      'year-to': String(yearTo),
      ...(yearFrom ? { 'year-from': String(yearFrom) } : {}),
      ...(pc       ? { postcode: pc.replace(/\s/g, ''), radius: '50' } : {}),
    });

    // ── Gumtree ────────────────────────────────────────────────────────
    // Pattern: /search#q=Toyota+Alphard&searchCategory=cars-vans-motorbikes
    //   &searchLocation=W1K+3JP&distance=30&sort=PRICE_ASCENDING
    const gtBase   = 'https://www.gumtree.com/search';
    const gtHash   = new URLSearchParams({
      q:              `${make} ${model}`,
      searchCategory: 'cars-vans-motorbikes',
      sort:           'PRICE_ASCENDING',
      ...(pc ? { searchLocation: pc, distance: '30' } : {}),
    });

    return [
      {
        id:       'autotrader-uk',
        site:     'AutoTrader UK',
        flag:     '🇬🇧',
        url:      `https://www.autotrader.co.uk/car-search?${atParams}`,
        cta:      'Search AutoTrader',
        color:    '#FF6B35',
        minPrice: null,
      },
      {
        id:       'motors-uk',
        site:     'Motors.co.uk',
        flag:     '🇬🇧',
        url:      `https://www.motors.co.uk/search/car/?${moParams}`,
        cta:      'Search Motors',
        color:    '#005EB8',
        minPrice: null,
      },
      {
        id:       'gumtree-uk',
        site:     'Gumtree',
        flag:     '🇬🇧',
        url:      `${gtBase}#${gtHash}`,
        cta:      'Search Gumtree',
        color:    '#72BF44',
        minPrice: null,
      },
    ];
  }

  if (country === 'US') {
    const zip = postcode ? postcode.trim() : '';

    // ── CarGurus ───────────────────────────────────────────────────────
    // Pattern: /Cars/new/nl_Toyota_Alphard?zip=10001&distance=100
    //   &sortDir=ASC&sortType=PRICE
    const cgParams = new URLSearchParams({
      sortDir:  'ASC',
      sortType: 'PRICE',
      ...(zip ? { zip, distance: '100' } : {}),
      ...(yearFrom ? { minYear: String(yearFrom) } : {}),
      ...(yearTo   ? { maxYear: String(yearTo)   } : {}),
    });

    // ── AutoTrader US ──────────────────────────────────────────────────
    // Pattern: /cars-for-sale/used-cars/toyota/alphard/
    //   ?zip=10001&searchRadius=100&sortBy=pricingLow
    const auParams = new URLSearchParams({
      sortBy: 'pricingLow',
      ...(zip      ? { zip, searchRadius: '100' } : {}),
      ...(yearFrom ? { startYear: String(yearFrom) } : {}),
      ...(yearTo   ? { endYear:   String(yearTo)   } : {}),
    });

    // ── Cars.com ───────────────────────────────────────────────────────
    // Pattern: /shopping/results/?makes[]=toyota&models[]=toyota-alphard
    //   &stock_type=used&zip=10001&sort=list_price_asc
    const ccParams = new URLSearchParams({
      'makes[]':  makeLow,
      'models[]': `${makeLow}-${modelLow}`,
      stock_type: 'used',
      sort:       'list_price_asc',
      ...(zip ? { zip } : {}),
    });

    return [
      {
        id:       'cargurus-us',
        site:     'CarGurus',
        flag:     '🇺🇸',
        url:      `https://www.cargurus.com/Cars/new/nl_${encodeURIComponent(make)}_${encodeURIComponent(model)}?${cgParams}`,
        cta:      'Search CarGurus',
        color:    '#00A0E9',
        minPrice: null,
      },
      {
        id:       'autotrader-us',
        site:     'AutoTrader US',
        flag:     '🇺🇸',
        url:      `https://www.autotrader.com/cars-for-sale/used-cars/${makeLow}/${modelLow}/?${auParams}`,
        cta:      'Search AutoTrader',
        color:    '#E4002B',
        minPrice: null,
      },
      {
        id:       'cars-com',
        site:     'Cars.com',
        flag:     '🇺🇸',
        url:      `https://www.cars.com/shopping/results/?${ccParams}`,
        cta:      'Search Cars.com',
        color:    '#1B3A6B',
        minPrice: null,
      },
    ];
  }

  if (country === 'JP') {
    const makeUC  = make.toUpperCase();
    const modelUC = model.toUpperCase();

    // ── Goo-net Exchange ──────────────────────────────────────────────
    // Pattern: /usedcar/brand-TOYOTA/cartype-ALPHARD/
    const gnParams = new URLSearchParams({
      ...(yearFrom ? { minYear: String(yearFrom) } : {}),
      ...(yearTo   ? { maxYear: String(yearTo)   } : {}),
    });
    const gnQuery = gnParams.toString() ? `?${gnParams}` : '';

    // ── CarSensor ─────────────────────────────────────────────────────
    // Pattern: /usedcar/search.php?MAKENAME=TOYOTA&CARNAME=ALPHARD&sort=TP
    const csParams = new URLSearchParams({
      MAKENAME: makeUC,
      CARNAME:  modelUC,
      sort:     'TP',
      ...(yearFrom ? { MINYEAR: String(yearFrom) } : {}),
    });

    // ── Yahoo! 中古車 (carview) ───────────────────────────────────────
    // Pattern: /usedcar/search/?Make=Toyota&CarName=Alphard&order=4
    const yjParams = new URLSearchParams({
      Make:    make,
      CarName: model,
      order:   '4',
    });

    return [
      {
        id:       'goonet-jp',
        site:     'Goo-net Exchange',
        flag:     '🇯🇵',
        url:      `https://www.goo-net.com/usedcar/brand-${encodeURIComponent(makeUC)}/cartype-${encodeURIComponent(modelUC)}/${gnQuery}`,
        cta:      'Search Goo-net',
        color:    '#E60012',
        minPrice: null,
      },
      {
        id:       'carsensor-jp',
        site:     'CarSensor',
        flag:     '🇯🇵',
        url:      `https://www.carsensor.net/usedcar/search.php?${csParams}`,
        cta:      'Search CarSensor',
        color:    '#FF5500',
        minPrice: null,
      },
      {
        id:       'carview-jp',
        site:     'Yahoo! 中古車',
        flag:     '🇯🇵',
        url:      `https://carview.yahoo.co.jp/usedcar/search/?${yjParams}`,
        cta:      'Search Yahoo! 中古車',
        color:    '#FF0033',
        minPrice: null,
      },
    ];
  }

  return [];
}
