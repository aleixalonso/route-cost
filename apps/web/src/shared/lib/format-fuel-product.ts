export function formatFuelProduct(fuelProduct: string): string {
  switch (fuelProduct) {
    case 'petrol-95-e5':
      return 'Petrol 95 E5';
    case 'diesel-a':
      return 'Diesel A';
    default:
      return fuelProduct;
  }
}
