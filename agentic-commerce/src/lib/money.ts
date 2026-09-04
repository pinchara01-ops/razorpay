export function formatINR(amountInPaise: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(amountInPaise / 100);
}

export function parseBudgetFromText(text: string, fallback = 100000) {
  const lower = text.toLowerCase();
  const match = lower.match(/(?:under|below|within|less than|max|maximum|budget)\s*(?:inr|rs|rupees|₹)?\s*([0-9,]+)/);
  if (!match) return fallback;
  return Number(match[1].replaceAll(",", "")) * 100;
}
