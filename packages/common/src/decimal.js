"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Decimal = void 0;
const bignumber_js_1 = __importDefault(require("bignumber.js"));
// Configure BigNumber for strict financial calculations
bignumber_js_1.default.config({
    DECIMAL_PLACES: 20,
    ROUNDING_MODE: bignumber_js_1.default.ROUND_HALF_UP,
    EXPONENTIAL_AT: [-30, 30]
});
/**
 * Strict Decimal wrapper to ensure no floating point errors occur in financial computations.
 */
class Decimal {
    value;
    constructor(val) {
        if (val instanceof Decimal) {
            this.value = val.value;
        }
        else if (val instanceof bignumber_js_1.default) {
            this.value = val;
        }
        else if (typeof val === 'number') {
            if (!Number.isFinite(val)) {
                throw new Error(`Invalid number for Decimal: ${val}`);
            }
            this.value = new bignumber_js_1.default(val.toString());
        }
        else if (typeof val === 'string') {
            const trimmed = val.trim();
            if (!trimmed || isNaN(Number(trimmed))) {
                throw new Error(`Invalid string for Decimal: "${val}"`);
            }
            this.value = new bignumber_js_1.default(trimmed);
        }
        else {
            throw new Error(`Unsupported type for Decimal: ${typeof val}`);
        }
    }
    static ZERO = new Decimal(0);
    static ONE = new Decimal(1);
    static from(val) {
        if (val instanceof Decimal)
            return val;
        return new Decimal(val);
    }
    plus(other) {
        return new Decimal(this.value.plus(Decimal.from(other).value));
    }
    minus(other) {
        return new Decimal(this.value.minus(Decimal.from(other).value));
    }
    times(other) {
        return new Decimal(this.value.times(Decimal.from(other).value));
    }
    dividedBy(other) {
        const divisor = Decimal.from(other).value;
        if (divisor.isZero()) {
            throw new Error('Division by zero in Decimal calculation');
        }
        return new Decimal(this.value.dividedBy(divisor));
    }
    eq(other) {
        return this.value.isEqualTo(Decimal.from(other).value);
    }
    gt(other) {
        return this.value.isGreaterThan(Decimal.from(other).value);
    }
    gte(other) {
        return this.value.isGreaterThanOrEqualTo(Decimal.from(other).value);
    }
    lt(other) {
        return this.value.isLessThan(Decimal.from(other).value);
    }
    lte(other) {
        return this.value.isLessThanOrEqualTo(Decimal.from(other).value);
    }
    isZero() {
        return this.value.isZero();
    }
    isPositive() {
        return this.value.isPositive() && !this.value.isZero();
    }
    isNegative() {
        return this.value.isNegative();
    }
    abs() {
        return new Decimal(this.value.abs());
    }
    toFixed(decimals, roundingMode = bignumber_js_1.default.ROUND_DOWN) {
        return this.value.toFixed(decimals, roundingMode);
    }
    toString() {
        return this.value.toString();
    }
    toNumber() {
        return this.value.toNumber();
    }
    toJSON() {
        return this.toString();
    }
    /**
     * Convert from base unit (e.g. satoshis) using the asset's decimal places.
     */
    static fromBaseUnits(amount, decimals) {
        const scale = new bignumber_js_1.default(10).pow(decimals);
        return new Decimal(new bignumber_js_1.default(amount.toString()).dividedBy(scale));
    }
    /**
     * Convert to base units as an integer string.
     */
    toBaseUnits(decimals) {
        const scale = new bignumber_js_1.default(10).pow(decimals);
        return this.value.times(scale).integerValue(bignumber_js_1.default.ROUND_DOWN).toString();
    }
}
exports.Decimal = Decimal;
//# sourceMappingURL=decimal.js.map