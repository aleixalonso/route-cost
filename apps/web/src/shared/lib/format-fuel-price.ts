const fuelPriceFormatter = new Intl.NumberFormat('es-ES', {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
});

export function formatFuelPrice(amount: number, currency: string): string {
  return `${fuelPriceFormatter.format(amount)} ${
    currency === 'EUR' ? '€' : currency
  }/L`;
}
