export interface LineStringGeometry {
  readonly type: 'LineString';
  readonly coordinates: ReadonlyArray<readonly [number, number]>;
}

export interface LineStringFeature<
  TProperties extends object = Record<string, never>,
> {
  readonly type: 'Feature';
  readonly geometry: LineStringGeometry;
  readonly properties: TProperties;
}

export interface LineStringFeatureCollection<TProperties extends object> {
  readonly type: 'FeatureCollection';
  readonly features: ReadonlyArray<LineStringFeature<TProperties>>;
}
