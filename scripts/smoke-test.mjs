const checks = [
  ['API health', 'http://127.0.0.1:3001/api/v1/health/ready', 'route-cost-api'],
  ['Frontend', 'http://127.0.0.1:8080', 'RouteCost'],
  [
    'Nginx API proxy',
    'http://127.0.0.1:8080/api/v1/health/ready',
    'route-cost-api',
  ],
];

for (const [name, url, expectedText] of checks) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${name} returned HTTP ${response.status}`);
  }

  const body = await response.text();
  if (!body.includes(expectedText)) {
    throw new Error(`${name} did not include ${expectedText}`);
  }
}

process.stdout.write('Smoke test passed.\n');
