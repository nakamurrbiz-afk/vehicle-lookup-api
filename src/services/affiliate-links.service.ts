import { config } from '../config/env';

export interface AffiliateLink {
  platform: string;
  label: string;
  url: string;
}

// eBay UK Motors category ID for Cars
const EBAY_CARS_CATEGORY = '9801';

/**
 * Build a dynamic eBay Motors UK affiliate search URL for a given vehicle.
 * Uses eBay Partner Network (EPN) tracking parameters.
 *
 * Docs: https://partnerhelp.ebay.com/helpcenter/s/article/How-do-I-create-Custom-Links
 */
function buildEbayMotorsUrl(make: string, model: string, year: number | null): string {
  const keyword = [year, make, model].filter(Boolean).join(' ');

  const searchParams = new URLSearchParams({
    _nkw:    keyword,
    _sacat:  EBAY_CARS_CATEGORY,
    mkevt:   '1',
    mkcid:   '1',
    mkrid:   '710-53481-19255-0', // eBay UK rover ID
    campid:  config.ebay.campaignId,
    toolid:  '10001',
    customid: 'vehiclelookup',
  });

  return `https://www.ebay.co.uk/sch/i.html?${searchParams.toString()}`;
}

export function generateAffiliateLinks(
  make: string | null,
  model: string | null,
  year: number | null,
  country: string,
): AffiliateLink[] {
  // Only generate links when we have enough vehicle data
  if (!make || !model) return [];

  const links: AffiliateLink[] = [];

  // eBay Motors UK — available for all countries, but most relevant for GB
  if (config.ebay.campaignId) {
    links.push({
      platform: 'ebay_motors_uk',
      label:    `Find ${make} ${model}${year ? ` (${year})` : ''} on eBay Motors`,
      url:      buildEbayMotorsUrl(make, model, year),
    });
  }

  return links;
}
