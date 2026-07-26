export const vehicleQueryKeys = {
  root: ['vehicles'] as const,
  list: () => [...vehicleQueryKeys.root, 'list'] as const,
};
