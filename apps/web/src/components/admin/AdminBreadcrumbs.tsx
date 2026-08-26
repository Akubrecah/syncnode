import React from 'react';
import { ChevronRight } from 'lucide-react';

export interface Crumb {
  label: string;
}

export const AdminBreadcrumbs: React.FC<{ crumbs: Crumb[] }> = ({ crumbs }) => (
  <nav className="admin-breadcrumbs" aria-label="Breadcrumb">
    {crumbs.map((crumb, i) => (
      <span key={`${crumb.label}-${i}`} className="admin-crumb">
        {i > 0 && <ChevronRight size={12} />}
        <span aria-current={i === crumbs.length - 1 ? 'page' : undefined}>{crumb.label}</span>
      </span>
    ))}
  </nav>
);
