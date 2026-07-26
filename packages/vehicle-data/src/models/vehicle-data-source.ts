export type ConsumptionDataStatus =
  'estimated' | 'partially-verified' | 'verified';

export type ConsumptionDataConfidence = 'low' | 'medium' | 'high';

export type VehicleDataSourceType =
  'manufacturer' | 'official-document' | 'independent-test' | 'derived';

export interface VehicleDataSource {
  readonly type: VehicleDataSourceType;
  readonly title: string;
  readonly publisher: string;
  readonly url: string;
  readonly accessedAt: string;
  readonly notes?: string;
}

export interface ConsumptionDataMetadata {
  readonly status: ConsumptionDataStatus;
  readonly confidence: ConsumptionDataConfidence;
  readonly officialCombinedLitresPer100Km?: number;
  readonly methodology: string;
  readonly sources: readonly VehicleDataSource[];
}
