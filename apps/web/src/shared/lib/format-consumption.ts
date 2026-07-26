const consumptionFormatter = new Intl.NumberFormat('es-ES', {
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

export function formatFuelConsumptionRate(litresPer100Km: number): string {
  return `${consumptionFormatter.format(litresPer100Km)} L/100 km`;
}
