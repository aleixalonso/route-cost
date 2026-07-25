import { Inject, Injectable } from '@nestjs/common';

import { VALHALLA_CONFIG, type ValhallaConfig } from './valhalla.types';
import { ValhallaHttpClientCore } from './valhalla-http.client-core';

@Injectable()
export class ValhallaHttpClient extends ValhallaHttpClientCore {
  public constructor(
    @Inject(VALHALLA_CONFIG)
    config: ValhallaConfig,
  ) {
    super(config);
  }
}
