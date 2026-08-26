import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  AssetSymbol,
  AccountType,
  TransactionType,
  EntryDirection,
  Decimal,
  FinancialInvariantError,
  InsufficientBalanceError
} from '@syncnode/common';
import { db } from '@syncnode/database';
import { ledgerService } from '@syncnode/ledger';

describe('Financial Invariants & Double-Entry Ledger Verification', () => {
  beforeEach(() => {
    db.reset();
  });

  it('should enforce strict debits == credits balance per asset', () => {
    const userId = 'usr_test_1';

    // 1. Valid balanced deposit: Debit Vault, Credit User
    const tx = ledgerService.recordTransaction(
      TransactionType.DEPOSIT,
      'dep_1',
      'idemp_dep_1',
      'Test Deposit 1 BTC',
      [
        {
          accountType: AccountType.EXCHANGE_HOT_WALLET,
          asset: AssetSymbol.BTC,
          direction: EntryDirection.DEBIT,
          amount: '1.00000000'
        },
        {
          userId,
          accountType: AccountType.USER_AVAILABLE,
          asset: AssetSymbol.BTC,
          direction: EntryDirection.CREDIT,
          amount: '1.00000000'
        }
      ]
    );

    assert.ok(tx.id);
    const balance = ledgerService.getUserAssetBalance(userId, AssetSymbol.BTC);
    assert.ok(Decimal.from(balance.available).eq('1.00000000'));
    assert.ok(Decimal.from(balance.total).eq('1.00000000'));
  });

  it('should reject unbalanced transactions with FinancialInvariantError', () => {
    const userId = 'usr_test_2';

    assert.throws(
      () => {
        ledgerService.recordTransaction(
          TransactionType.ADMIN_ADJUSTMENT,
          'adj_unbalanced',
          'idemp_unbalanced',
          'Unbalanced creation of funds',
          [
            {
              accountType: AccountType.EXCHANGE_HOT_WALLET,
              asset: AssetSymbol.USDT,
              direction: EntryDirection.DEBIT,
              amount: '1000.00'
            },
            {
              userId,
              accountType: AccountType.USER_AVAILABLE,
              asset: AssetSymbol.USDT,
              direction: EntryDirection.CREDIT,
              amount: '500.00' // Unbalanced!
            }
          ]
        );
      },
      FinancialInvariantError,
      'Should throw error when Debits != Credits'
    );
  });

  it('should prevent negative balances during debit operations', () => {
    const userId = 'usr_test_poor';

    assert.throws(
      () => {
        ledgerService.recordTransaction(
          TransactionType.ORDER_LOCK,
          'ord_overflow',
          'idemp_overflow',
          'Attempt lock on zero balance',
          [
            {
              userId,
              accountType: AccountType.USER_AVAILABLE,
              asset: AssetSymbol.USDT,
              direction: EntryDirection.DEBIT,
              amount: '5000.00'
            },
            {
              userId,
              accountType: AccountType.USER_LOCKED,
              asset: AssetSymbol.USDT,
              direction: EntryDirection.CREDIT,
              amount: '5000.00'
            }
          ]
        );
      },
      InsufficientBalanceError,
      'Should reject spending more than available balance'
    );
  });

  it('should maintain 100% solvency in Proof of Reserves', () => {
    const userA = 'usr_solvency_a';
    const userB = 'usr_solvency_b';

    // Deposit 5 BTC for User A
    ledgerService.recordTransaction(
      TransactionType.DEPOSIT,
      'dep_a',
      'idemp_dep_a',
      'User A deposit 5 BTC',
      [
        { accountType: AccountType.EXCHANGE_HOT_WALLET, asset: AssetSymbol.BTC, direction: EntryDirection.DEBIT, amount: '5.00000000' },
        { userId: userA, accountType: AccountType.USER_AVAILABLE, asset: AssetSymbol.BTC, direction: EntryDirection.CREDIT, amount: '5.00000000' }
      ]
    );

    // Deposit 10 BTC for User B
    ledgerService.recordTransaction(
      TransactionType.DEPOSIT,
      'dep_b',
      'idemp_dep_b',
      'User B deposit 10 BTC',
      [
        { accountType: AccountType.EXCHANGE_HOT_WALLET, asset: AssetSymbol.BTC, direction: EntryDirection.DEBIT, amount: '10.00000000' },
        { userId: userB, accountType: AccountType.USER_AVAILABLE, asset: AssetSymbol.BTC, direction: EntryDirection.CREDIT, amount: '10.00000000' }
      ]
    );

    const audit = ledgerService.performProofOfReservesAudit();
    assert.equal(audit.isSolvent, true);
    assert.ok(Decimal.from(audit.assets['BTC'].totalAssets).eq('15.00000000'));
    assert.ok(Decimal.from(audit.assets['BTC'].totalLiabilities).eq('15.00000000'));
    assert.equal(audit.assets['BTC'].ratio, '100.00%');
  });
});
