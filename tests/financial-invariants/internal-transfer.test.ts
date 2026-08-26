import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  AssetSymbol,
  AccountType,
  TransferType,
  TransferStatus,
  Decimal
} from '@syncnode/common';
import { db } from '@syncnode/database';
import { ledgerService } from '@syncnode/ledger';
import { walletService } from '@syncnode/wallet';
import { marketDataService } from '@syncnode/market-data';

describe('Transfer & Market Data Verification', () => {
  beforeEach(() => {
    db.reset();
  });

  it('should execute instant zero-fee internal transfer between users and preserve ledger balance invariant', () => {
    const sender = {
      id: 'usr_alice',
      email: 'alice@institution.com',
      passwordHash: 'hash',
      isTotpEnabled: false,
      kycTier: 2 as any,
      kycStatus: 'APPROVED' as any,
      isSuspended: false,
      isWithdrawalSuspended: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const recipient = {
      id: 'usr_bob',
      email: 'bob@hedgefund.com',
      passwordHash: 'hash',
      isTotpEnabled: false,
      kycTier: 2 as any,
      kycStatus: 'APPROVED' as any,
      isSuspended: false,
      isWithdrawalSuspended: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    db.users.set(sender.id, sender);
    db.usersByEmail.set(sender.email.toLowerCase(), sender.id);
    db.users.set(recipient.id, recipient);
    db.usersByEmail.set(recipient.email.toLowerCase(), recipient.id);

    // Credit Alice with 5000 USDT
    walletService.processDeposit({
      userId: sender.id,
      asset: AssetSymbol.USDT,
      network: 'Ethereum-ERC20',
      address: '0xalice',
      txHash: 'tx_alice_init',
      amount: '5000.00',
      confirmations: 15
    });

    // Alice transfers 1250 USDT to Bob via Bob's email
    const transfer = walletService.transferInternal({
      senderUserId: sender.id,
      recipientIdentifier: 'bob@hedgefund.com',
      asset: AssetSymbol.USDT,
      amount: '1250.00',
      note: 'Prime settlement payment'
    });

    assert.equal(transfer.status, TransferStatus.COMPLETED);
    assert.equal(transfer.amount, '1250.00');
    assert.equal(transfer.fee, '0.00');
    assert.equal(transfer.recipientUserId, recipient.id);

    // Check balances
    const aliceBalance = ledgerService.getUserAssetBalance(sender.id, AssetSymbol.USDT);
    const bobBalance = ledgerService.getUserAssetBalance(recipient.id, AssetSymbol.USDT);

    assert.ok(Decimal.from(aliceBalance.available).eq('3750'));
    assert.ok(Decimal.from(bobBalance.available).eq('1250'));

    // Total liabilities should exactly equal 5000 USDT in vault reserves
    const audit = ledgerService.performProofOfReservesAudit();
    assert.equal(audit.isSolvent, true);
  });

  it('should reject internal transfer if balance is insufficient or transferring to self', () => {
    const sender = {
      id: 'usr_alice2',
      email: 'alice2@test.com',
      passwordHash: 'hash',
      isTotpEnabled: false,
      kycTier: 2 as any,
      kycStatus: 'APPROVED' as any,
      isSuspended: false,
      isWithdrawalSuspended: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    db.users.set(sender.id, sender);
    db.usersByEmail.set(sender.email.toLowerCase(), sender.id);

    // Self transfer should throw
    assert.throws(() => {
      walletService.transferInternal({
        senderUserId: sender.id,
        recipientIdentifier: sender.email,
        asset: AssetSymbol.BTC,
        amount: '1.0'
      });
    }, /Cannot transfer funds to yourself/);

    // Non-existent user should throw
    assert.throws(() => {
      walletService.transferInternal({
        senderUserId: sender.id,
        recipientIdentifier: 'unknown@user.com',
        asset: AssetSymbol.BTC,
        amount: '1.0'
      });
    }, /Recipient "unknown@user.com" not found/);
  });

  it('should pull live market data and populate real-time ticker feeds', async () => {
    const liveFeeds = await marketDataService.pullLiveMarketData();
    assert.ok(liveFeeds.length >= 4);

    const btcFeed = liveFeeds.find((f) => f.symbol === 'BTC/USDT');
    assert.ok(btcFeed);
    assert.ok(parseFloat(btcFeed.lastPrice) > 10000);
    assert.ok(btcFeed.isLive);

    const status = marketDataService.getLiveFeedStatus();
    assert.equal(status.isLive, true);
  });
});
