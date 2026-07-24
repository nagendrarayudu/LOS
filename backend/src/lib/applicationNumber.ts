export function generateApplicationNumber(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(10000 + Math.random() * 90000);
  return `LN-${year}-${rand}`;
}
