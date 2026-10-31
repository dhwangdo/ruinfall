export const AMPLIFICATION_NAME = "증폭";

export function statusLabel(kind: "resistance" | "amplification", value: number) {
  const name = kind === "resistance" ? value < 0 ? "취약" : "저항" : value < 0 ? "약화" : AMPLIFICATION_NAME;
  return `${name} ${Math.abs(value)}`;
}

/** Signed values describe duration, never the strength of the modifier. */
export function decayStatus(value = 0) {
  return value - Math.sign(value);
}

export function addResistance(value = 0, amount: number, gainBlocked = false) {
  return value + (gainBlocked && amount > 0 ? 0 : amount);
}

export type AttackModifiers = {
  amplification?: number;
  resistance?: number;
  ignoreNegativeResistance?: boolean;
  multiplier?: number;
};

/** Integer tenths avoid intermediate rounding and floating-point errors at integer boundaries. */
export function calculateAttackDamage(damage: number, {
  amplification = 0, resistance = 0, ignoreNegativeResistance = false, multiplier = 1,
}: AttackModifiers = {}) {
  const outgoing = amplification > 0 ? 13 : amplification < 0 ? 7 : 10;
  const incoming = resistance > 0 ? 7 : resistance < 0 && !ignoreNegativeResistance ? 13 : 10;
  return Math.max(0, Math.floor(damage * outgoing * incoming * multiplier / 100));
}
