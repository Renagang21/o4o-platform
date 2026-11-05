export function toKstInput(value: string): string {
  const time = Date.parse(value);
  return Number.isFinite(time) ? new Date(time + 9 * 3600000).toISOString().slice(0, 16) : '';
}
export function fromKstInput(value: string): string {
  return new Date(`${value}:00+09:00`).toISOString();
}
