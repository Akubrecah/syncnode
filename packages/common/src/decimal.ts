import BigNumber from 'bignumber.js';

// Configure BigNumber for strict financial calculations
BigNumber.config({
  DECIMAL_PLACES: 20,
  ROUNDING_MODE: BigNumber.ROUND_HALF_UP,
  EXPONENTIAL_AT: [-30, 30]
});

export type DecimalValue = string | number | BigNumber | Decimal;

/**
 * Strict Decimal wrapper to ensure no floating point errors occur in financial computations.
 */
export class Decimal {
  private readonly value: BigNumber;

  constructor(val: DecimalValue) {
    if (val instanceof Decimal) {
      this.value = val.value;
    } else if (val instanceof BigNumber) {
      this.value = val;
    } else if (typeof val === 'number') {
      if (!Number.isFinite(val)) {
        throw new Error(`Invalid number for Decimal: ${val}`);
      }
      this.value = new BigNumber(val.toString());
    } else if (typeof val === 'string') {
      const trimmed = val.trim();
      if (!trimmed || isNaN(Number(trimmed))) {
        throw new Error(`Invalid string for Decimal: "${val}"`);
      }
      this.value = new BigNumber(trimmed);
    } else {
      throw new Error(`Unsupported type for Decimal: ${typeof val}`);
    }
  }

  public static ZERO = new Decimal(0);
  public static ONE = new Decimal(1);

  public static from(val: DecimalValue): Decimal {
    if (val instanceof Decimal) return val;
    return new Decimal(val);
  }

  public plus(other: DecimalValue): Decimal {
    return new Decimal(this.value.plus(Decimal.from(other).value));
  }

  public minus(other: DecimalValue): Decimal {
    return new Decimal(this.value.minus(Decimal.from(other).value));
  }

  public times(other: DecimalValue): Decimal {
    return new Decimal(this.value.times(Decimal.from(other).value));
  }

  public dividedBy(other: DecimalValue): Decimal {
    const divisor = Decimal.from(other).value;
    if (divisor.isZero()) {
      throw new Error('Division by zero in Decimal calculation');
    }
    return new Decimal(this.value.dividedBy(divisor));
  }

  public eq(other: DecimalValue): boolean {
    return this.value.isEqualTo(Decimal.from(other).value);
  }

  public gt(other: DecimalValue): boolean {
    return this.value.isGreaterThan(Decimal.from(other).value);
  }

  public gte(other: DecimalValue): boolean {
    return this.value.isGreaterThanOrEqualTo(Decimal.from(other).value);
  }

  public lt(other: DecimalValue): boolean {
    return this.value.isLessThan(Decimal.from(other).value);
  }

  public lte(other: DecimalValue): boolean {
    return this.value.isLessThanOrEqualTo(Decimal.from(other).value);
  }

  public isZero(): boolean {
    return this.value.isZero();
  }

  public isPositive(): boolean {
    return this.value.isPositive() && !this.value.isZero();
  }

  public isNegative(): boolean {
    return this.value.isNegative();
  }

  public abs(): Decimal {
    return new Decimal(this.value.abs());
  }

  public toFixed(decimals: number, roundingMode: BigNumber.RoundingMode = BigNumber.ROUND_DOWN): string {
    return this.value.toFixed(decimals, roundingMode);
  }

  public toString(): string {
    return this.value.toString();
  }

  public toNumber(): number {
    return this.value.toNumber();
  }

  public toJSON(): string {
    return this.toString();
  }

  /**
   * Convert from base unit (e.g. satoshis) using the asset's decimal places.
   */
  public static fromBaseUnits(amount: string | bigint | number, decimals: number): Decimal {
    const scale = new BigNumber(10).pow(decimals);
    return new Decimal(new BigNumber(amount.toString()).dividedBy(scale));
  }

  /**
   * Convert to base units as an integer string.
   */
  public toBaseUnits(decimals: number): string {
    const scale = new BigNumber(10).pow(decimals);
    return this.value.times(scale).integerValue(BigNumber.ROUND_DOWN).toString();
  }
}
