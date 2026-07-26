export interface SelectedLocation {
  readonly id: string;
  readonly label: string;
  readonly coordinate: {
    readonly latitude: number;
    readonly longitude: number;
  };
}
