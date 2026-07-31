import { describe, expect, it } from 'vitest';

import { formatFuelConsumptionRate } from './format-consumption';
import { formatDistanceMetres } from './format-distance';
import { formatDurationSeconds } from './format-duration';
import { formatFuelPrice } from './format-fuel-price';
import { formatFuelProduct } from './format-fuel-product';
import { formatLitres } from './format-litres';
import { formatMoney } from './format-money';
import { formatTimestamp } from './format-timestamp';

describe('formatters', () => {
  it('formats distance in kilometres', () => {
    expect(formatDistanceMetres(0)).toBe('0 km');
    expect(formatDistanceMetres(61_800)).toBe('61,8 km');
  });

  it('formats durations', () => {
    expect(formatDurationSeconds(54 * 60)).toBe('54 min');
    expect(formatDurationSeconds(95 * 60)).toBe('1 h 35 min');
  });

  it('formats litres and consumption', () => {
    expect(formatLitres(2.156)).toBe('2,16 L');
    expect(formatFuelConsumptionRate(3.844)).toBe('3,84 L/100 km');
  });

  it('formats EUR money in es-ES', () => {
    expect(formatMoney(0)).toBe('0,00 €');
    expect(formatMoney(1234.5)).toBe('1234,50 €');
  });

  it('formats fuel prices per litre', () => {
    expect(formatFuelPrice(1.609, 'EUR')).toBe('1,609 €/L');
    expect(formatFuelPrice(1.6, 'USD')).toBe('1,600 USD/L');
  });

  it('formats fuel product labels', () => {
    expect(formatFuelProduct('petrol-95-e5')).toBe('Petrol 95 E5');
    expect(formatFuelProduct('diesel-a')).toBe('Diesel A');
    expect(formatFuelProduct('unknown-product')).toBe('unknown-product');
  });

  it('formats timestamps in es-ES', () => {
    expect(formatTimestamp('2026-07-31T20:00:00Z')).toMatch(/31 jul 2026/u);
  });
});
