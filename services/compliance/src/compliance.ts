import {
  KycTier,
  KycStatus,
  User,
  Logger
} from '@syncnode/common';
import { db } from '@syncnode/database';

export interface KycApplication {
  id: string;
  userId: string;
  tier: KycTier;
  fullName: string;
  dateOfBirth: string;
  country: string;
  idDocumentType: 'PASSPORT' | 'DRIVERS_LICENSE' | 'NATIONAL_ID';
  idNumber: string;
  status: KycStatus;
  rejectionReason?: string;
  reviewedBy?: string;
  submittedAt: number;
  reviewedAt?: number;
}

export class ComplianceService {
  private readonly logger = new Logger('ComplianceService');
  private kycApplications = new Map<string, KycApplication>();

  /**
   * Submit KYC Verification details.
   */
  public submitKyc(params: Omit<KycApplication, 'id' | 'status' | 'submittedAt'>): KycApplication {
    const user = db.users.get(params.userId);
    if (!user) throw new Error('User not found');

    const id = `kyc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const app: KycApplication = {
      id,
      ...params,
      status: KycStatus.PENDING,
      submittedAt: Date.now()
    };

    this.kycApplications.set(id, app);
    user.kycStatus = KycStatus.PENDING;
    user.updatedAt = Date.now();

    db.logAudit({
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
  public reviewKyc(
    kycId: string,
    approved: boolean,
    adminUserId: string,
    rejectionReason?: string
  ): KycApplication {
    const app = this.kycApplications.get(kycId);
    if (!app) throw new Error('KYC application not found');

    const user = db.users.get(app.userId);
    if (!user) throw new Error('Associated user not found');

    app.status = approved ? KycStatus.APPROVED : KycStatus.REJECTED;
    app.reviewedBy = adminUserId;
    app.rejectionReason = rejectionReason;
    app.reviewedAt = Date.now();

    if (approved) {
      user.kycTier = app.tier;
      user.kycStatus = KycStatus.APPROVED;
    } else {
      user.kycStatus = KycStatus.REJECTED;
    }
    user.updatedAt = Date.now();

    db.logAudit({
      actorId: adminUserId,
      actorType: 'ADMIN',
      action: approved ? 'KYC_APPLICATION_APPROVED' : 'KYC_APPLICATION_REJECTED',
      targetId: kycId,
      metadata: { userId: user.id, tier: app.tier, rejectionReason }
    });

    return app;
  }

  public getPendingApplications(): KycApplication[] {
    return Array.from(this.kycApplications.values()).filter(
      (a) => a.status === KycStatus.PENDING
    );
  }

  /**
   * Full application history (approved, rejected, pending) newest first.
   */
  public getAllApplications(): KycApplication[] {
    return Array.from(this.kycApplications.values()).sort(
      (a, b) => b.submittedAt - a.submittedAt
    );
  }

  public getApplicationsByUser(userId: string): KycApplication[] {
    return Array.from(this.kycApplications.values()).filter(
      (a) => a.userId === userId
    );
  }
}

export const complianceService = new ComplianceService();
