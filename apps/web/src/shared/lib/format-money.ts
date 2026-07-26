const currencyFormatter = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
});

export function formatMoney(amount: number): string {
  return currencyFormatter.format(amount);
}
