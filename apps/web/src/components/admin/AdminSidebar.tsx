import React from 'react';
import {
  LayoutDashboard, Activity, ShieldAlert, SlidersHorizontal, Users, UserCheck,
  Ban, LineChart, BookOpen, Repeat2, Radar, AlertTriangle,
  Landmark, Vault, Receipt, FileBarChart, ArrowDownToLine, ArrowUpFromLine, Send,
  Store, Gavel, Building2,
  ScrollText, LogIn, KeyRound, Smartphone,
  Settings2, Coins, Wrench
} from 'lucide-react';
import { AdminRole, AdminPermission } from '../../types/admin';

export type AdminSectionId =
  | 'dashboard' | 'system-health' | 'operations'
  | 'circuit-breakers' | 'risk-monitoring' | 'risk-parameters'
  | 'all-users' | 'user-surveillance' | 'kyc-compliance' | 'suspended-accounts'
  | 'markets' | 'order-books' | 'trades' | 'trading-surveillance'
  | 'proof-of-reserves' | 'treasury' | 'fees' | 'financial-reports'
  | 'deposits' | 'withdrawals' | 'internal-transfers'
  | 'escrows' | 'disputes' | 'escrow-merchants'
  | 'audit-logs' | 'login-security' | 'api-keys' | 'two-factor-compliance' | 'security-alerts'
  | 'fee-configuration' | 'market-configuration' | 'risk-configuration' | 'system-configuration';

export interface NavItem {
  id: AdminSectionId;
  label: string;
  icon: React.ReactNode;
  permission: AdminPermission;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

/**
 * Sidebar navigation. Every item declares the permission it requires; items are
 * filtered at render time by role. Server-side RBAC remains authoritative.
 */
export const ADMIN_NAV_GROUPS: NavGroup[] = [
  {
    title: 'Overview',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={15} />, permission: 'viewDashboard' },
      { id: 'system-health', label: 'System Health', icon: <Activity size={15} />, permission: 'viewDashboard' },
      { id: 'operations', label: 'Operations', icon: <Wrench size={15} />, permission: 'viewDashboard' }
    ]
  },
  {
    title: 'Risk',
    items: [
      { id: 'circuit-breakers', label: 'Circuit Breakers', icon: <ShieldAlert size={15} />, permission: 'manageCircuitBreakers' },
      { id: 'risk-monitoring', label: 'Risk Monitoring', icon: <Radar size={15} />, permission: 'viewRisk' },
      { id: 'risk-parameters', label: 'Risk Parameters', icon: <SlidersHorizontal size={15} />, permission: 'configureMarkets' }
    ]
  },
  {
    title: 'Users',
    items: [
      { id: 'all-users', label: 'All Users', icon: <Users size={15} />, permission: 'viewUsers' },
      { id: 'user-surveillance', label: 'User Surveillance', icon: <UserCheck size={15} />, permission: 'viewUsers' },
      { id: 'kyc-compliance', label: 'KYC / Compliance', icon: <ScrollText size={15} />, permission: 'reviewKyc' },
      { id: 'suspended-accounts', label: 'Suspended Accounts', icon: <Ban size={15} />, permission: 'viewUsers' }
    ]
  },
  {
    title: 'Trading',
    items: [
      { id: 'markets', label: 'Markets', icon: <LineChart size={15} />, permission: 'viewRisk' },
      { id: 'order-books', label: 'Order Books', icon: <BookOpen size={15} />, permission: 'viewRisk' },
      { id: 'trades', label: 'Trades', icon: <Repeat2 size={15} />, permission: 'viewRisk' },
      { id: 'trading-surveillance', label: 'Trading Surveillance', icon: <Radar size={15} />, permission: 'viewRisk' }
    ]
  },
  {
    title: 'Finance',
    items: [
      { id: 'proof-of-reserves', label: 'Proof of Reserves', icon: <Landmark size={15} />, permission: 'viewFinance' },
      { id: 'treasury', label: 'Treasury', icon: <Vault size={15} />, permission: 'viewFinance' },
      { id: 'fees', label: 'Fees', icon: <Coins size={15} />, permission: 'viewFinance' },
      { id: 'financial-reports', label: 'Financial Reports', icon: <FileBarChart size={15} />, permission: 'viewFinance' }
    ]
  },
  {
    title: 'Wallet',
    items: [
      { id: 'deposits', label: 'Deposits', icon: <ArrowDownToLine size={15} />, permission: 'viewFinance' },
      { id: 'withdrawals', label: 'Withdrawals', icon: <ArrowUpFromLine size={15} />, permission: 'viewFinance' },
      { id: 'internal-transfers', label: 'Internal Transfers', icon: <Send size={15} />, permission: 'viewFinance' }
    ]
  },
  {
    title: 'P2P',
    items: [
      { id: 'escrows', label: 'Active Escrows', icon: <Store size={15} />, permission: 'viewUsers' },
      { id: 'disputes', label: 'Disputes', icon: <Gavel size={15} />, permission: 'resolveDisputes' },
      { id: 'escrow-merchants', label: 'Merchants', icon: <Building2 size={15} />, permission: 'viewUsers' }
    ]
  },
  {
    title: 'Security',
    items: [
      { id: 'audit-logs', label: 'Audit Logs', icon: <ScrollText size={15} />, permission: 'viewAuditLogs' },
      { id: 'login-security', label: 'Login Security', icon: <LogIn size={15} />, permission: 'viewSecurity' },
      { id: 'api-keys', label: 'API Keys', icon: <KeyRound size={15} />, permission: 'viewSecurity' },
      { id: 'two-factor-compliance', label: '2FA Compliance', icon: <Smartphone size={15} />, permission: 'viewUsers' },
      { id: 'security-alerts', label: 'Security Alerts', icon: <AlertTriangle size={15} />, permission: 'viewSecurity' }
    ]
  },
  {
    title: 'Settings',
    items: [
      { id: 'fee-configuration', label: 'Fee Configuration', icon: <Coins size={15} />, permission: 'viewFinance' },
      { id: 'market-configuration', label: 'Market Configuration', icon: <Settings2 size={15} />, permission: 'configureMarkets' },
      { id: 'risk-configuration', label: 'Risk Configuration', icon: <SlidersHorizontal size={15} />, permission: 'configureMarkets' },
      { id: 'system-configuration', label: 'System Configuration', icon: <Wrench size={15} />, permission: 'viewDashboard' }
    ]
  }
];

export const SECTION_LABELS: Record<AdminSectionId, string> = Object.fromEntries(
  ADMIN_NAV_GROUPS.flatMap((g) => g.items.map((i) => [i.id, i.label]))
) as Record<AdminSectionId, string>;

export const GROUP_FOR_SECTION: Record<AdminSectionId, string> = Object.fromEntries(
  ADMIN_NAV_GROUPS.flatMap((g) => g.items.map((i) => [i.id, g.title]))
) as Record<AdminSectionId, string>;

export function visibleNavGroups(role: AdminRole | null, can: (p: AdminPermission) => boolean): NavGroup[] {
  return ADMIN_NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => can(item.permission))
  })).filter((group) => group.items.length > 0);
}
