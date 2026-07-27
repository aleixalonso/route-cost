import type { RouteCoordinate } from '../model/route-map-model';
import { assertValidRouteCoordinate } from './validate-coordinate';

const VALHALLA_POLYLINE_PRECISION = 1_000_000;
const ASCII_OFFSET = 63;
const CHUNK_MASK = 0x1f;
const CONTINUATION_BIT = 0x20;
const MAX_SHIFT = 30;

export function decodeRouteGeometry(
  encodedGeometry: string,
): readonly RouteCoordinate[] {
  if (encodedGeometry.length === 0) {
    throw new Error('Route geometry is empty.');
  }

  const coordinates: RouteCoordinate[] = [];
  let index = 0;
  let latitude = 0;
  let longitude = 0;

  while (index < encodedGeometry.length) {
    const latitudeResult = decodeValue(encodedGeometry, index);
    index = latitudeResult.nextIndex;
    const longitudeResult = decodeValue(encodedGeometry, index);
    index = longitudeResult.nextIndex;

    latitude += latitudeResult.value;
    longitude += longitudeResult.value;

    const coordinate = {
      latitude: latitude / VALHALLA_POLYLINE_PRECISION,
      longitude: longitude / VALHALLA_POLYLINE_PRECISION,
    };
    assertValidRouteCoordinate(coordinate);
    coordinates.push(coordinate);
  }

  return coordinates;
}

function decodeValue(
  encodedGeometry: string,
  startIndex: number,
): { readonly value: number; readonly nextIndex: number } {
  let index = startIndex;
  let result = 0;
  let shift = 0;

  while (index < encodedGeometry.length) {
    const byte = encodedGeometry.charCodeAt(index) - ASCII_OFFSET;

    if (byte < 0 || byte > 63) {
      throw new Error('Route geometry contains an invalid character.');
    }

    index += 1;
    result |= (byte & CHUNK_MASK) << shift;

    if (byte < CONTINUATION_BIT) {
      const value = result & 1 ? ~(result >> 1) : result >> 1;
      return { value, nextIndex: index };
    }

    shift += 5;
    if (shift > MAX_SHIFT) {
      throw new Error('Route geometry value is too large.');
    }
  }

  throw new Error('Route geometry is truncated.');
}
