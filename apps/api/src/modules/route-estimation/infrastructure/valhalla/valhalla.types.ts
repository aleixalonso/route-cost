import type { ValhallaConfig } from '@route-cost/routing';

import type { Environment } from '../../../../config/environment';

export const VALHALLA_CONFIG = Symbol('VALHALLA_CONFIG');

type ValhallaEnvironment = Pick<
  Environment,
  | 'VALHALLA_BASE_URL'
  | 'VALHALLA_ROUTE_PATH'
  | 'VALHALLA_TRACE_ATTRIBUTES_PATH'
  | 'VALHALLA_API_KEY'
  | 'VALHALLA_CLIENT_ID'
  | 'VALHALLA_REQUEST_TIMEOUT_MS'
  | 'VALHALLA_MAX_ALTERNATIVES'
>;

export function toValhallaConfig(
  environment: ValhallaEnvironment,
): ValhallaConfig {
  return {
    baseUrl: environment.VALHALLA_BASE_URL,
    routePath: environment.VALHALLA_ROUTE_PATH,
    traceAttributesPath: environment.VALHALLA_TRACE_ATTRIBUTES_PATH,
    apiKey: environment.VALHALLA_API_KEY,
    clientId: environment.VALHALLA_CLIENT_ID,
    requestTimeoutMs: environment.VALHALLA_REQUEST_TIMEOUT_MS,
    maxAlternatives: environment.VALHALLA_MAX_ALTERNATIVES,
  };
}
