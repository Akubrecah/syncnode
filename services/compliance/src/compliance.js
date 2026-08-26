"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.complianceService = exports.ComplianceService = void 0;
const common_1 = require("@syncnode/common");
const database_1 = require("@syncnode/database");
class ComplianceService {
    logger = new common_1.Logger('ComplianceService');
    kycApplications = new Map();
    /**
     * Submit KYC Verification details.
     */
    submitKyc(params) {
        const user = database_1.db.users.get(params.userId);
        if (!user)
            throw new Error('User not found');
        const id = `kyc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const app = {
            id,
            ...params,
            status: common_1.KycStatus.PENDING,
            submittedAt: Date.now()
        };
        this.kycApplications.set(id, app);
        user.kycStatus = common_1.KycStatus.PENDING;
        user.updatedAt = Date.now();
        database_1.db.logAudit({
            actorId: params.userId,
            actorType: 'USER',
            action: 'KYC_APPLICATION_SUBMITTED',
            targetId: id,
            metadata: { tier: params.tier, country: params.country }
        });
        return app;
    }
    /**
     * Review and approve/reject KYC by Compliance Officer.
     */
    reviewKyc(kycId, approved, adminUserId, rejectionReason) {
        const app = this.kycApplications.get(kycId);
        if (!app)
            throw new Error('KYC application not found');
        const user = database_1.db.users.get(app.userId);
        if (!user)
            throw new Error('Associated user not found');
        app.status = approved ? common_1.KycStatus.APPROVED : common_1.KycStatus.REJECTED;
        app.reviewedBy = adminUserId;
        app.rejectionReason = rejectionReason;
        app.reviewedAt = Date.now();
        if (approved) {
            user.kycTier = app.tier;
            user.kycStatus = common_1.KycStatus.APPROVED;
        }
        else {
            user.kycStatus = common_1.KycStatus.REJECTED;
        }
        user.updatedAt = Date.now();
        database_1.db.logAudit({
            actorId: adminUserId,
            actorType: 'ADMIN',
            action: approved ? 'KYC_APPLICATION_APPROVED' : 'KYC_APPLICATION_REJECTED',
            targetId: kycId,
            metadata: { userId: user.id, tier: app.tier, rejectionReason }
        });
        return app;
    }
    getPendingApplications() {
        return Array.from(this.kycApplications.values()).filter((a) => a.status === common_1.KycStatus.PENDING);
    }
    getApplicationsByUser(userId) {
        return Array.from(this.kycApplications.values()).filter((a) => a.userId === userId);
    }
}
exports.ComplianceService = ComplianceService;
exports.complianceService = new ComplianceService();
//# sourceMappingURL=compliance.js.map