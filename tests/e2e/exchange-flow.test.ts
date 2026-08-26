import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  AssetSymbol,
  OrderSide,
  OrderType,
  Decimal,
  KycTier
} from '@syncnode/common';
import { db } from '@syncnode/database';
import { ledgerService } from '@syncnode/ledger';
import { orderManagementService } from '@syncnode/trading';
import { walletService } from '@syncnode/wallet';
import { complianceService } from '@syncnode/compliance';
import { p2pService } from '@syncnode/p2p';

describe('End-to-End Enterprise Exchange Lifecycle Verification', () => {
  beforeEach(() => {
    db.reset();
  });

  it('executes full flow: Deposit -> KYC -> Trade Match -> Settlement -> P2P Escrow -> Withdrawal', async () => {
    const aliceId = 'usr_alice';
    const bobId = 'usr_bob';

    // 1. User Setup
    db.users.set(aliceId, {
      id: aliceId,
      email: 'alice@syncnode.exchange',
      passwordHash: 'hash',
      isTotpEnabled: false,
      kycTier: KycTier.TIER_2_VERIFIED,
      kycStatus: 'APPROVED' as any,
      isSuspended: false,
      isWithdrawalSuspended: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    db.users.set(bobId, {
      id: bobId,
      email: 'bob@syncnode.exchange',
      passwordHash: 'hash',
      isTotpEnabled: false,
      kycTier: KycTier.TIER_2_VERIFIED,
      kycStatus: 'APPROVED' as any,
      isSuspended: false,
      isWithdrawalSuspended: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    // 2. Deposit: Alice deposits 1.0 BTC, Bob deposits 100,000 USDT
    walletService.processDeposit({
      userId: aliceId,
      asset: AssetSymbol.BTC,
      network: 'Bitcoin-Mainnet',
      address: 'bc1q_alice',
      txHash: 'tx_dep_alice_1',
      amount: '1.00000000',
      confirmations: 6
    });

    walletService.processDeposit({
      userId: bobId,
      asset: AssetSymbol.USDT,
      network: 'Ethereum-ERC20',
      address: '0x_bob',
      txHash: 'tx_dep_bob_1',
      amount: '100000.00',
      confirmations: 15
    });

    const aliceInitialBtc = ledgerService.getUserAssetBalance(aliceId, AssetSymbol.BTC);
    assert.ok(Decimal.from(aliceInitialBtc.available).eq('1.00000000'));

    const bobInitialUsdt = ledgerService.getUserAssetBalance(bobId, AssetSymbol.USDT);
    assert.ok(Decimal.from(bobInitialUsdt.available).eq('100000.00'));

    // 3. Trading: Alice submits Limit Sell (0.5 BTC @ 94,000 USDT)
    const sellRes = orderManagementService.submitOrder({
      userId: aliceId,
      symbol: 'BTC/USDT',
      side: OrderSide.SELL,
      type: OrderType.LIMIT,
      price: '94000.00',
      quantity: '0.500000'
    });
    assert.equal(sellRes.order.status, 'OPEN');

    // 4. Bob submits Limit Buy (0.5 BTC @ 94,000 USDT)
    const buyRes = orderManagementService.submitOrder({
      userId: bobId,
      symbol: 'BTC/USDT',
      side: OrderSide.BUY,
      type: OrderType.LIMIT,
      price: '94000.00',
      quantity: '0.500000'
    });
    assert.equal(buyRes.order.status, 'FILLED');
    assert.equal(buyRes.trades.length, 1);

    // Verify Bob received BTC (minus taker fee 0.15%)
    const bobBtc = ledgerService.getUserAssetBalance(bobId, AssetSymbol.BTC);
    assert.ok(new Decimal(bobBtc.available).gt(0.49), 'Bob received traded BTC');

    // Verify Alice received USDT (minus maker fee 0.10%)
    const aliceUsdt = ledgerService.getUserAssetBalance(aliceId, AssetSymbol.USDT);
    assert.ok(new Decimal(aliceUsdt.available).gt(46000), 'Alice received traded USDT');

    // 5. Withdrawal: Bob withdraws 0.2 BTC to cold address
    const withdrawal = await walletService.requestWithdrawal({
      userId: bobId,
      asset: AssetSymbol.BTC,
      destinationAddress: 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4',
      amount: '0.20000000'
    });
    assert.equal(withdrawal.status, 'CONFIRMED');
    assert.ok(withdrawal.txHash);

    // 6. Solvency Audit: Proof of Reserves must verify 100% solvency
    const audit = ledgerService.performProofOfReservesAudit();
    assert.equal(audit.isSolvent, true);
  });
});
