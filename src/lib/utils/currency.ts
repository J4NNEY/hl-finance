import Decimal from "decimal.js";

// Configure Decimal.js for financial calculations
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

/**
 * Format number to IDR currency string
 */
export function formatIDR(amount: number | Decimal): string {
  const num = typeof amount === "number" ? amount : amount.toNumber();
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

/**
 * Format number with thousand separators (no currency symbol)
 */
export function formatNumber(amount: number | Decimal): string {
  const num = typeof amount === "number" ? amount : amount.toNumber();
  return new Intl.NumberFormat("id-ID").format(num);
}

/**
 * Parse IDR string to number
 */
export function parseIDR(value: string): number {
  const cleaned = value.replace(/[^\d]/g, "");
  return parseInt(cleaned, 10) || 0;
}

/**
 * Create Decimal from number safely
 */
export function toDecimal(value: number | string | Decimal): Decimal {
  if (value instanceof Decimal) return value;
  return new Decimal(value);
}

/**
 * Calculate cascading discount
 * Formula: base × Π(1 − dᵢ/100)
 */
export function calculateDiscountedPrice(
  basePrice: number | Decimal,
  discountSteps: number[]
): Decimal {
  let price = toDecimal(basePrice);

  for (const discount of discountSteps) {
    const discountRate = toDecimal(discount).div(100);
    price = price.mul(toDecimal(1).minus(discountRate));
  }

  return price;
}

/**
 * Calculate line omzet (discounted price × quantity)
 */
export function calculateLineOmzet(
  discountedUnitPrice: number | Decimal,
  quantity: number
): Decimal {
  return toDecimal(discountedUnitPrice).mul(quantity);
}

/**
 * Calculate line laba ((discounted price - modal) × quantity)
 */
export function calculateLineLaba(
  discountedUnitPrice: number | Decimal,
  hargaModal: number | Decimal,
  quantity: number
): Decimal {
  const profit = toDecimal(discountedUnitPrice).minus(hargaModal);
  return profit.mul(quantity);
}

/**
 * Get effective discount percentage
 */
export function getEffectiveDiscount(discountSteps: number[]): Decimal {
  if (discountSteps.length === 0) return toDecimal(0);

  const multiplier = discountSteps.reduce((acc, discount) => {
    const discountRate = toDecimal(discount).div(100);
    return acc.mul(toDecimal(1).minus(discountRate));
  }, toDecimal(1));

  return toDecimal(1).minus(multiplier).mul(100);
}

/**
 * Round decimal to 2 decimal places for storage
 */
export function roundForStorage(value: Decimal): number {
  return value.toDecimalPlaces(2).toNumber();
}
