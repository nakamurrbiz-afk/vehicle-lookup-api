export class VehicleNotFoundError extends Error {
  readonly statusCode = 404;
  constructor(plate: string, country: string) {
    super(`Vehicle not found for plate "${plate}" in country "${country}"`);
    this.name = 'VehicleNotFoundError';
  }
}

export class UnsupportedCountryError extends Error {
  readonly statusCode = 400;
  constructor(country: string) {
    super(`Plate lookup for "${country}" is not currently supported. Available: GB, US.`);
    this.name = 'UnsupportedCountryError';
  }
}

export class UpstreamError extends Error {
  readonly statusCode: number;
  readonly upstreamStatus?: number;
  constructor(source: string, upstreamStatus?: number, detail?: string) {
    super(`Upstream API error from ${source}${detail ? `: ${detail}` : ''}`);
    this.name = 'UpstreamError';
    this.statusCode = 502;
    this.upstreamStatus = upstreamStatus;
  }
}

export class UpstreamRateLimitError extends UpstreamError {
  constructor(source: string) {
    super(source, 429, 'Rate limit exceeded');
    this.name = 'UpstreamRateLimitError';
    (this as { statusCode: number }).statusCode = 429;
  }
}
