import BigNumber from 'bignumber.js';
export type DecimalValue = string | number | BigNumber | Decimal;
/**
 * Strict Decimal wrapper to ensure no floating point errors occur in financial computations.
 */
export declare class Decimal {
    private readonly value;
    constructor(val: DecimalValue);
    static ZERO: Decimal;
    static ONE: Decimal;
    static from(val: DecimalValue): Decimal;
    plus(other: DecimalValue): Decimal;
    minus(other: DecimalValue): Decimal;
    times(other: DecimalValue): Decimal;
    dividedBy(other: DecimalValue): Decimal;
    eq(other: DecimalValue): boolean;
    gt(other: DecimalValue): boolean;
    gte(other: DecimalValue): boolean;
    lt(other: DecimalValue): boolean;
    lte(other: DecimalValue): boolean;
    isZero(): boolean;
    isPositive(): boolean;
    isNegative(): boolean;
    abs(): Decimal;
    toFixed(decimals: number, roundingMode?: BigNumber.RoundingMode): string;
    toString(): string;
    toNumber(): number;
    toJSON(): string;
    /**
     * Convert from base unit (e.g. satoshis) using the asset's decimal places.
     */
    static fromBaseUnits(amount: string | bigint | number, decimals: number): Decimal;
    /**
     * Convert to base units as an integer string.
     */
    toBaseUnits(decimals: number): string;
}
