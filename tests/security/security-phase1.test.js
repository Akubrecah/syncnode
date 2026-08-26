"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const common_1 = require("@syncnode/common");
const database_1 = require("@syncnode/database");
const security_1 = require("@syncnode/security");
const ledger_1 = require("@syncnode/ledger");

(0, node_test_1.describe)('Phase 1 Security & Invariant Verification', () => {
    (0, node_test_1.beforeEach)(() => {
        database_1.db.reset();
    });

    (0, node_test_1.it)('CRIT-001: should fail-closed with strong 32+ char JWT secret requirement', () => {
        strict_1.default.ok(security_1.JWT_SECRET);
        strict_1.default.ok(security_1.JWT_SECRET.length >= 32, 'JWT_SECRET must be at least 32 characters long');
        
        const payload = { userId: 'usr_sec_1', email: 'sec1@syncnode.io' };
        const token = (0, security_1.signToken)(payload);
        const verified = (0, security_1.verifyToken)(token);
        strict_1.default.equal(verified.userId, 'usr_sec_1');
        strict_1.default.equal(verified.email, 'sec1@syncnode.io');
    });

    (0, node_test_1.it)('HIGH-001: newly registered users must start with strict zero balances', () => {
        const userId = 'usr_zero_bal_1';
        const user = {
            id: userId,
            email: 'clean@syncnode.io',
            passwordHash: 'hash123',
            isTotpEnabled: false,
            kycTier: common_1.KycTier.TIER_0_UNVERIFIED,
            kycStatus: common_1.KycStatus.NOT_SUBMITTED,
            isSuspended: false,
            isWithdrawalSuspended: false,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        database_1.db.users.set(userId, user);

        const btcBal = ledger_1.ledgerService.getUserAssetBalance(userId, common_1.AssetSymbol.BTC);
        const ethBal = ledger_1.ledgerService.getUserAssetBalance(userId, common_1.AssetSymbol.ETH);
        const usdtBal = ledger_1.ledgerService.getUserAssetBalance(userId, common_1.AssetSymbol.USDT);

        strict_1.default.equal(btcBal.total, '0.00000000');
        strict_1.default.equal(ethBal.total, '0.00000000');
        strict_1.default.equal(usdtBal.total, '0.00');
    });

    (0, node_test_1.it)('CRIT-003: Admin roles must be defined and distinguished from standard users', () => {
        strict_1.default.ok(common_1.AdminRole.SUPER_ADMIN);
        strict_1.default.ok(common_1.AdminRole.SECURITY_ADMIN);
        strict_1.default.ok(common_1.AdminRole.COMPLIANCE_OFFICER);
        strict_1.default.ok(common_1.AdminRole.RISK_ANALYST);

        const adminToken = (0, security_1.signToken)({
            userId: 'admin_root',
            email: 'admin@syncnode.io',
            role: common_1.AdminRole.SUPER_ADMIN
        });
        const regularToken = (0, security_1.signToken)({
            userId: 'usr_normal',
            email: 'user@syncnode.io'
        });

        const adminPayload = (0, security_1.verifyToken)(adminToken);
        const regularPayload = (0, security_1.verifyToken)(regularToken);

        strict_1.default.equal(adminPayload.role, common_1.AdminRole.SUPER_ADMIN);
        strict_1.default.equal(regularPayload.role, undefined);
    });

    (0, node_test_1.it)('CRIT-005: repository layer should handle data queries consistently', async () => {
        const testUser = {
            id: 'usr_repo_1',
            email: 'repo@syncnode.io',
            passwordHash: 'pass_hash',
            isTotpEnabled: false,
            kycTier: common_1.KycTier.TIER_0_UNVERIFIED,
            kycStatus: common_1.KycStatus.NOT_SUBMITTED,
            isSuspended: false,
            isWithdrawalSuspended: false,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        await database_1.userRepository.create(testUser);
        const fetched = await database_1.userRepository.findById('usr_repo_1');
        strict_1.default.ok(fetched);
        strict_1.default.equal(fetched.email, 'repo@syncnode.io');

        const byEmail = await database_1.userRepository.findByEmail('repo@syncnode.io');
        strict_1.default.ok(byEmail);
        strict_1.default.equal(byEmail.id, 'usr_repo_1');
    });
});
