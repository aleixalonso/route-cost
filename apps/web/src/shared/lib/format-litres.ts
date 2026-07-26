const litresFormatter = new Intl.NumberFormat('es-ES', {
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

export function formatLitres(litres: number): string {
  return `${litresFormatter.format(litres)} L`;
}
