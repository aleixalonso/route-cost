import { GeocodingProviderInvalidResponseError } from './geocoding-provider-errors.js';
import type {
  BoundingBox,
  Coordinate,
  LocationPrecision,
  LocationType,
} from './index.js';

export function mapProviderLayer(layer: string): LocationType {
  switch (layer) {
    case 'address':
      return 'address';
    case 'street':
      return 'street';
    case 'poi':
      return 'point-of-interest';
    case 'postalcode':
      return 'postal-code';
    case 'neighbourhood':
      return 'neighbourhood';
    case 'locality':
    case 'localadmin':
    case 'borough':
      return 'locality';
    case 'county':
    case 'macrocounty':
      return 'county';
    case 'region':
    case 'macroregion':
      return 'region';
    case 'country':
      return 'country';
    default:
      return 'other';
  }
}

export function mapProviderPrecision(
  precision: string | null | undefined,
): LocationPrecision {
  if (precision === 'point') {
    return 'point';
  }

  if (precision === 'centroid') {
    return 'centroid';
  }

  return 'unknown';
}

export function assertValidCoordinate(coordinate: Coordinate): void {
  if (
    !Number.isFinite(coordinate.latitude) ||
    coordinate.latitude < -90 ||
    coordinate.latitude > 90 ||
    !Number.isFinite(coordinate.longitude) ||
    coordinate.longitude < -180 ||
    coordinate.longitude > 180
  ) {
    throw new GeocodingProviderInvalidResponseError(
      'Invalid geocoding coordinate.',
      { providerErrorCode: 'invalid_coordinate' },
    );
  }
}

export function assertValidBoundingBox(boundingBox: BoundingBox): void {
  if (
    !Number.isFinite(boundingBox.west) ||
    !Number.isFinite(boundingBox.south) ||
    !Number.isFinite(boundingBox.east) ||
    !Number.isFinite(boundingBox.north) ||
    boundingBox.west < -180 ||
    boundingBox.east > 180 ||
    boundingBox.south < -90 ||
    boundingBox.north > 90 ||
    boundingBox.west > boundingBox.east ||
    boundingBox.south > boundingBox.north
  ) {
    throw new GeocodingProviderInvalidResponseError(
      'Invalid geocoding bounding box.',
      { providerErrorCode: 'invalid_bounding_box' },
    );
  }
}
