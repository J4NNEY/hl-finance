import Decimal from "decimal.js";
import { toDecimal } from "./currency";

/**
 * Calculate bonuses available for a customer
 * Formula: floor(accumulated_omzet / threshold) - bonuses_already_granted
 */
export function calculateBonusesAvailable(
  accumulatedOmtzLunas: number | Decimal,
  threshold: number | Decimal,
  bonusesAlreadyGranted: number
): number {
  const omtz = toDecimal(accumulatedOmtzLunas);
  const thresh = toDecimal(threshold);

  if (thresh.isZero()) return 0;

  const totalBonuses = omtz.div(thresh).floor();
  const available = totalBonuses.minus(bonusesAlreadyGranted);

  return Math.max(0, available.toNumber());
}

/**
 * Calculate remaining accumulation after bonus grant
 * Formula: accumulated_omzet mod threshold
 */
export function calculateCarryOver(
  accumulatedOmtzLunas: number | Decimal,
  threshold: number | Decimal,
  bonusesToGrant: number
): Decimal {
  const omtz = toDecimal(accumulatedOmtzLunas);
  const thresh = toDecimal(threshold);
  const consumed = thresh.mul(bonusesToGrant);

  return omtz.minus(consumed);
}

/**
 * Validate if bonus grant is allowed
 */
export function validateBonusGrant(
  accumulatedOmtzLunas: number,
  threshold: number,
  bonusesAlreadyGranted: number,
  bonusesToGrant: number
): { valid: boolean; error?: string } {
  const available = calculateBonusesAvailable(
    accumulatedOmtzLunas,
    threshold,
    bonusesAlreadyGranted
  );

  if (bonusesToGrant <= 0) {
    return { valid: false, error: "Jumlah bonus harus lebih dari 0" };
  }

  if (bonusesToGrant > available) {
    return {
      valid: false,
      error: `Bonus tersedia hanya ${available}, tidak bisa memberikan ${bonusesToGrant}`,
    };
  }

  return { valid: true };
}
