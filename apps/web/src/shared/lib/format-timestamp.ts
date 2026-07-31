const timestampFormatter = new Intl.DateTimeFormat('es-ES', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export function formatTimestamp(value: string): string {
  return timestampFormatter.format(new Date(value));
}
