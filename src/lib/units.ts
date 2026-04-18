export type TempUnit = 'C' | 'F';

export function formatTemp(celsius: number, unit: TempUnit): string {
  const value = unit === 'C' ? celsius : (celsius * 9) / 5 + 32;
  return `${Math.round(value)}°`;
}

export function formatWind(kmh: number, unit: TempUnit): string {
  if (unit === 'C') return `${Math.round(kmh)} km/h`;
  return `${Math.round(kmh * 0.621371)} mph`;
}
