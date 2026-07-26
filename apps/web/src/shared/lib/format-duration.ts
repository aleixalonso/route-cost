const integerFormatter = new Intl.NumberFormat('es-ES', {
  maximumFractionDigits: 0,
});

export function formatDurationSeconds(durationSeconds: number): string {
  const minutes = Math.round(durationSeconds / 60);

  if (minutes < 60) {
    return `${integerFormatter.format(minutes)} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${integerFormatter.format(hours)} h`;
  }

  return `${integerFormatter.format(hours)} h ${integerFormatter.format(
    remainingMinutes,
  )} min`;
}
