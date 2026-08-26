import { KycTier, KycStatus } from '@syncnode/common';
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
export declare class ComplianceService {
    private readonly logger;
    private kycApplications;
    /**
     * Submit KYC Verification details.
     */
    submitKyc(params: Omit<KycApplication, 'id' | 'status' | 'submittedAt'>): KycApplication;
    /**
     * Review and approve/reject KYC by Compliance Officer.
     */
    reviewKyc(kycId: string, approved: boolean, adminUserId: string, rejectionReason?: string): KycApplication;
    getPendingApplications(): KycApplication[];
    getApplicationsByUser(userId: string): KycApplication[];
}
export declare const complianceService: ComplianceService;
