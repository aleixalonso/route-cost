const kilometreFormatter = new Intl.NumberFormat('es-ES', {
  maximumFractionDigits: 1,
  minimumFractionDigits: 0,
});

export function formatDistanceMetres(distanceMetres: number): string {
  return `${kilometreFormatter.format(distanceMetres / 1000)} km`;
}
