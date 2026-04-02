import { config } from '../config/env';

function buildAwinUrl(merchantId: number, destinationUrl: string): string | null {
  if (!config.awin.affiliateId) return null;
  const params = new URLSearchParams({
    awinmid:  String(merchantId),
    awinaffid: config.awin.affiliateId,
    ued:      destinationUrl,
  });
  return `https://www.awin1.com/cread.php?${params.toString()}`;
}

export interface ListingLink {
  id:           string;
  site:         string;
  flag:         string;
  url:          string;          // Direct search URL (always present)
  affiliateUrl: string | null;   // Affiliate tracking URL — null until programme is activated
  cta:          string;
  color:        string;
  minPrice:     string | null;
}

export function buildListings(
  make:      string,
  model:     string | null,      // null when DVSA model enrichment is pending
  year:      number | null,
  country:   string,
  postcode?: string,             // UK postcode or US zip code
): ListingLink[] {
  const makeUC   = make.toUpperCase();
  const makeLow  = make.toLowerCase();
  const modelUC  = model ? model.toUpperCase() : null;
  const modelLow = model ? model.toLowerCase().replace(/\s+/g, '-') : null;
  const yearTo   = year ? year + 2 : new Date().getFullYear() + 1;
  const yearFrom = year ? year - 2 : undefined;

  if (country === 'GB') {
    const pc = postcode ? postcode.trim().toUpperCase() : '';

    // ── AutoTrader UK ──────────────────────────────────────────────────
    const atParams = new URLSearchParams({
      channel:                'cars',
      make:                   makeUC,
      'homeDeliveryAdverts':  'exclude',
      'advertising-location': 'at_cars',
      'year-to':              String(yearTo),
      ...(modelUC    ? { model: modelUC }                : {}),
      ...(yearFrom   ? { 'year-from': String(yearFrom) } : {}),
      ...(pc         ? { postcode: pc }                  : {}),
    });

    // ── Motors.co.uk ───────────────────────────────────────────────────
    const moParams = new URLSearchParams({
      make:      makeLow,
      'year-to': String(yearTo),
      ...(modelLow ? { model: modelLow }                 : {}),
      ...(yearFrom ? { 'year-from': String(yearFrom) }   : {}),
      ...(pc       ? { postcode: pc.replace(/\s/g, ''), radius: '50' } : {}),
    });

    // ── Gumtree ────────────────────────────────────────────────────────
    const gtHash = new URLSearchParams({
      q:              model ? `${make} ${model}` : make,
      searchCategory: 'cars-vans-motorbikes',
      sort:           'PRICE_ASCENDING',
      ...(pc ? { searchLocation: pc, distance: '30' } : {}),
    });

    return [
      {
        id:           'autotrader-uk',
        site:         'AutoTrader UK',
        flag:         '🇬🇧',
        url:          `https://www.autotrader.co.uk/car-search?${atParams}`,
        affiliateUrl: buildAwinUrl(config.awin.autotraderMerchantId, `https://www.autotrader.co.uk/car-search?${atParams}`),
        cta:          'Search AutoTrader',
        color:        '#FF6B35',
        minPrice:     null,
      },
      {
        id:           'motors-uk',
        site:         'Motors.co.uk',
        flag:         '🇬🇧',
        url:          `https://www.motors.co.uk/search/car/?${moParams}`,
        affiliateUrl: buildAwinUrl(config.awin.motorsMerchantId, `https://www.motors.co.uk/search/car/?${moParams}`),
        cta:          'Search Motors',
        color:        '#005EB8',
        minPrice:     null,
      },
      {
        id:           'gumtree-uk',
        site:         'Gumtree',
        flag:         '🇬🇧',
        url:          `https://www.gumtree.com/search#${gtHash}`,
        affiliateUrl: null,  // TODO: Affiliate URL
        cta:          'Search Gumtree',
        color:        '#72BF44',
        minPrice:     null,
      },
    ];
  }

  if (country === 'US') {
    const zip = postcode ? postcode.trim() : '';

    // ── CarGurus ───────────────────────────────────────────────────────
    const cgParams = new URLSearchParams({
      sortDir:  'ASC',
      sortType: 'PRICE',
      ...(zip      ? { zip, distance: '100' }          : {}),
      ...(yearFrom ? { minYear: String(yearFrom) }      : {}),
      ...(yearTo   ? { maxYear: String(yearTo) }        : {}),
    });
    const cgPath = modelUC
      ? `/Cars/new/nl_${encodeURIComponent(make)}_${encodeURIComponent(model!)}?${cgParams}`
      : `/Cars/new/nl_${encodeURIComponent(make)}?${cgParams}`;

    // ── AutoTrader US ──────────────────────────────────────────────────
    const auParams = new URLSearchParams({
      sortBy: 'pricingLow',
      ...(zip      ? { zip, searchRadius: '100' }       : {}),
      ...(yearFrom ? { startYear: String(yearFrom) }    : {}),
      ...(yearTo   ? { endYear: String(yearTo) }        : {}),
    });
    const auPath = modelLow
      ? `/cars-for-sale/used-cars/${makeLow}/${modelLow}/?${auParams}`
      : `/cars-for-sale/used-cars/${makeLow}/?${auParams}`;

    // ── Cars.com ───────────────────────────────────────────────────────
    const ccParams = new URLSearchParams({
      'makes[]':  makeLow,
      stock_type: 'used',
      sort:       'list_price_asc',
      ...(modelLow ? { 'models[]': `${makeLow}-${modelLow}` } : {}),
      ...(zip      ? { zip }                                   : {}),
    });

    return [
      {
        id:           'cargurus-us',
        site:         'CarGurus',
        flag:         '🇺🇸',
        url:          `https://www.cargurus.com${cgPath}`,
        affiliateUrl: null,
        cta:          'Search CarGurus',
        color:        '#00A0E9',
        minPrice:     null,
      },
      {
        id:           'autotrader-us',
        site:         'AutoTrader US',
        flag:         '🇺🇸',
        url:          `https://www.autotrader.com${auPath}`,
        affiliateUrl: null,
        cta:          'Search AutoTrader',
        color:        '#E4002B',
        minPrice:     null,
      },
      {
        id:           'cars-com',
        site:         'Cars.com',
        flag:         '🇺🇸',
        url:          `https://www.cars.com/shopping/results/?${ccParams}`,
        affiliateUrl: null,
        cta:          'Search Cars.com',
        color:        '#1B3A6B',
        minPrice:     null,
      },
    ];
  }

  if (country === 'NL') {
    // ── Marktplaats ────────────────────────────────────────────────────
    const mpParams = new URLSearchParams({
      query:      model ? `${make} ${model}` : make,
      categoryId: '91',   // Auto's category
      sortBy:     'PRICE',
      sortOrder:  'INCREASING',
      ...(yearFrom ? { 'attributes[constructionYearFrom]': String(yearFrom) } : {}),
      ...(yearTo   ? { 'attributes[constructionYearTo]':   String(yearTo)   } : {}),
    });

    // ── AutoTrack ──────────────────────────────────────────────────────
    const atParams = new URLSearchParams({
      merk:  makeLow,
      sort:  'price-asc',
      ...(modelLow ? { model: modelLow }                  : {}),
      ...(yearFrom ? { bouwjaarVan: String(yearFrom) }    : {}),
      ...(yearTo   ? { bouwjaarTot: String(yearTo) }      : {}),
    });

    // ── Gaspedaal ──────────────────────────────────────────────────────
    const gpPath = model
      ? `/${makeLow}/${modelLow}/`
      : `/${makeLow}/`;
    const gpParams = new URLSearchParams({
      sorteer: 'prijs-oplopend',
      ...(yearFrom ? { bouwjaar_van: String(yearFrom) } : {}),
      ...(yearTo   ? { bouwjaar_tot: String(yearTo) }   : {}),
    });

    return [
      {
        id:           'marktplaats-nl',
        site:         'Marktplaats',
        flag:         '🇳🇱',
        url:          `https://www.marktplaats.nl/l/auto-s/?${mpParams}`,
        affiliateUrl: null,
        cta:          'Search Marktplaats',
        color:        '#CC0000',
        minPrice:     null,
      },
      {
        id:           'autotrack-nl',
        site:         'AutoTrack',
        flag:         '🇳🇱',
        url:          `https://www.autotrack.nl/aanbod/personenauto/?${atParams}`,
        affiliateUrl: null,
        cta:          'Search AutoTrack',
        color:        '#003082',
        minPrice:     null,
      },
      {
        id:           'gaspedaal-nl',
        site:         'Gaspedaal.nl',
        flag:         '🇳🇱',
        url:          `https://www.gaspedaal.nl${gpPath}?${gpParams}`,
        affiliateUrl: null,
        cta:          'Search Gaspedaal',
        color:        '#FF6600',
        minPrice:     null,
      },
    ];
  }

  if (country === 'JP') {
    // ── Goo-net Exchange ──────────────────────────────────────────────
    const gnQuery = yearFrom ? `?minYear=${yearFrom}&maxYear=${yearTo}` : '';
    const gnPath = modelUC
      ? `/usedcar/brand-${encodeURIComponent(makeUC)}/cartype-${encodeURIComponent(modelUC)}/${gnQuery}`
      : `/usedcar/brand-${encodeURIComponent(makeUC)}/${gnQuery}`;

    // ── CarSensor ─────────────────────────────────────────────────────
    const csParams = new URLSearchParams({
      MAKENAME: makeUC,
      sort:     'TP',
      ...(modelUC  ? { CARNAME: modelUC }               : {}),
      ...(yearFrom ? { MINYEAR: String(yearFrom) }      : {}),
    });

    // ── Yahoo! 中古車 ─────────────────────────────────────────────────
    const yjParams = new URLSearchParams({
      Make:  make,
      order: '4',
      ...(model ? { CarName: model } : {}),
    });

    return [
      {
        id:           'goonet-jp',
        site:         'Goo-net Exchange',
        flag:         '🇯🇵',
        url:          `https://www.goo-net.com${gnPath}`,
        affiliateUrl: null,
        cta:          'Search Goo-net',
        color:        '#E60012',
        minPrice:     null,
      },
      {
        id:           'carsensor-jp',
        site:         'CarSensor',
        flag:         '🇯🇵',
        url:          `https://www.carsensor.net/usedcar/search.php?${csParams}`,
        affiliateUrl: null,
        cta:          'Search CarSensor',
        color:        '#FF5500',
        minPrice:     null,
      },
      {
        id:           'carview-jp',
        site:         'Yahoo! 中古車',
        flag:         '🇯🇵',
        url:          `https://carview.yahoo.co.jp/usedcar/search/?${yjParams}`,
        affiliateUrl: null,
        cta:          'Search Yahoo! 中古車',
        color:        '#FF0033',
        minPrice:     null,
      },
    ];
  }

  if (country === 'FR') {
    const query = model ? `${make} ${model}` : make;

    // ── LeBonCoin ─────────────────────────────────────────────────────
    const lbcParams = new URLSearchParams({
      text:     query,
      category: '2',   // Voitures
      sort:     'price',
      order:    'asc',
      ...(yearFrom ? { regdate_min: String(yearFrom) } : {}),
      ...(yearTo   ? { regdate_max: String(yearTo) }   : {}),
    });

    // ── La Centrale ───────────────────────────────────────────────────
    const lcPath = modelLow
      ? `/voitures/${makeLow}/${modelLow}/`
      : `/voitures/${makeLow}/`;
    const lcParams = new URLSearchParams({
      ...(yearFrom ? { anneemin: String(yearFrom) } : {}),
      ...(yearTo   ? { anneemax: String(yearTo) }   : {}),
    });

    // ── AutoScout24 FR ────────────────────────────────────────────────
    const asParams = new URLSearchParams({
      'make[]':  makeLow,
      sort:      'price',
      desc:      '0',
      ...(modelLow ? { 'model[]': modelLow }          : {}),
      ...(yearFrom ? { fregfrom: String(yearFrom) }   : {}),
      ...(yearTo   ? { fregto:   String(yearTo) }     : {}),
    });

    return [
      {
        id:           'leboncoin-fr',
        site:         'LeBonCoin',
        flag:         '🇫🇷',
        url:          `https://www.leboncoin.fr/recherche?${lbcParams}`,
        affiliateUrl: null,
        cta:          'Chercher sur LeBonCoin',
        color:        '#F56B2A',
        minPrice:     null,
      },
      {
        id:           'lacentrale-fr',
        site:         'La Centrale',
        flag:         '🇫🇷',
        url:          `https://www.lacentrale.fr${lcPath}?${lcParams}`,
        affiliateUrl: null,
        cta:          'Chercher sur La Centrale',
        color:        '#C8102E',
        minPrice:     null,
      },
      {
        id:           'autoscout24-fr',
        site:         'AutoScout24',
        flag:         '🇫🇷',
        url:          `https://www.autoscout24.fr/lst?${asParams}`,
        affiliateUrl: buildAwinUrl(config.awin.autoscout24FrMerchantId, `https://www.autoscout24.fr/lst?${asParams}`),
        cta:          'Chercher sur AutoScout24',
        color:        '#003082',
        minPrice:     null,
      },
    ];
  }

  return [];
}
