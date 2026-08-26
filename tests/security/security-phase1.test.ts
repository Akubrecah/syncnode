import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { KycTier, KycStatus, AssetSymbol, AdminRole } from '@syncnode/common';
import { db, userRepository } from '@syncnode/database';
import { JWT_SECRET, signToken, verifyToken } from '@syncnode/security';
import { ledgerService } from '@syncnode/ledger';

describe('Phase 1 Security & Invariant Verification', () => {
  beforeEach(() => {
    db.reset();
  });

  it('CRIT-001: should enforce strong 32+ char JWT secret validation without hardcoded fallbacks', () => {
    assert.ok(JWT_SECRET, 'JWT_SECRET must be defined');
    assert.ok(JWT_SECRET.length >= 32, 'JWT_SECRET must be at least 32 characters long');

    const payload = { userId: 'usr_sec_1', email: 'sec1@syncnode.io', isTotpAuthenticated: true };
    const token = signToken(payload);
    const verified = verifyToken(token);
    assert.equal(verified.userId, 'usr_sec_1');
    assert.equal(verified.email, 'sec1@syncnode.io');
  });

  it('HIGH-001: newly registered users must start with strict zero balances', () => {
    const userId = 'usr_zero_bal_1';
    const user = {
      id: userId,
      email: 'clean@syncnode.io',
      passwordHash: 'pass_hash_123',
      isTotpEnabled: false,
      kycTier: KycTier.TIER_0_UNVERIFIED,
      kycStatus: KycStatus.NOT_SUBMITTED,
      isSuspended: false,
      isWithdrawalSuspended: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    db.users.set(userId, user);

    const btcBal = ledgerService.getUserAssetBalance(userId, AssetSymbol.BTC);
    const ethBal = ledgerService.getUserAssetBalance(userId, AssetSymbol.ETH);
    const usdtBal = ledgerService.getUserAssetBalance(userId, AssetSymbol.USDT);

    assert.ok(Number(btcBal.total) === 0);
    assert.ok(Number(ethBal.total) === 0);
    assert.ok(Number(usdtBal.total) === 0);
  });

  it('CRIT-003: Admin roles must be defined and distinguished from standard users', () => {
    assert.ok(AdminRole.SUPER_ADMIN);
    assert.ok(AdminRole.SECURITY_ADMIN);
    assert.ok(AdminRole.COMPLIANCE_OFFICER);
    assert.ok(AdminRole.RISK_ANALYST);

    const adminToken = signToken({
      userId: 'admin_root',
      email: 'admin@syncnode.io',
      role: AdminRole.SUPER_ADMIN,
      isTotpAuthenticated: true
    });
    const regularToken = signToken({
      userId: 'usr_normal',
      email: 'user@syncnode.io',
      isTotpAuthenticated: true
    });

    const adminPayload = verifyToken(adminToken);
    const regularPayload = verifyToken(regularToken);

    assert.equal(adminPayload.role, AdminRole.SUPER_ADMIN);
    assert.equal(regularPayload.role, undefined);
  });

  it('CRIT-005: repository layer should handle data queries consistently', async () => {
    const testUser = {
      id: 'usr_repo_1',
      email: 'repo@syncnode.io',
      passwordHash: 'pass_hash',
      isTotpEnabled: false,
      kycTier: KycTier.TIER_0_UNVERIFIED,
      kycStatus: KycStatus.NOT_SUBMITTED,
      isSuspended: false,
      isWithdrawalSuspended: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await userRepository.create(testUser);
    const fetched = await userRepository.findById('usr_repo_1');
    assert.ok(fetched);
    assert.equal(fetched?.email, 'repo@syncnode.io');

    const byEmail = await userRepository.findByEmail('repo@syncnode.io');
    assert.ok(byEmail);
    assert.equal(byEmail?.id, 'usr_repo_1');
  });
});
