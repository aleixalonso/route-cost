import { expect, it } from 'vitest';

import { parseConfig } from '../src/config.js';

it('prefers the canonical Stadia key when both names are set', () => {
  const config = parseConfig({
    STADIA_GEOCODING_API_KEY: 'canonical',
    STADIA_API_KEY: 'legacy',
  });
  expect(config.STADIA_GEOCODING_API_KEY).toBe('canonical');
  expect(config.STADIA_API_KEY).toBe('canonical');
});

it('resolves the legacy Stadia key as an alias', () => {
  const config = parseConfig({ STADIA_API_KEY: 'legacy' });
  expect(config.STADIA_GEOCODING_API_KEY).toBe('legacy');
  expect(config.STADIA_API_KEY).toBe('legacy');
});

it('falls back to the alias when the canonical key is whitespace only', () => {
  const config = parseConfig({
    STADIA_GEOCODING_API_KEY: '  ',
    STADIA_API_KEY: 'legacy',
  });
  expect(config.STADIA_GEOCODING_API_KEY).toBe('legacy');
  expect(config.STADIA_API_KEY).toBe('legacy');
});

it('uses an empty resolved Stadia key when neither name is set', () => {
  const config = parseConfig({});
  expect(config.STADIA_GEOCODING_API_KEY).toBe('');
  expect(config.STADIA_API_KEY).toBe('');
});
