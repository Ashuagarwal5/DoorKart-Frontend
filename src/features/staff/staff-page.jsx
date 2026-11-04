'use client';

import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DataTable } from '@/components/ui/data-table';
import { PageHeader } from '@/components/ui/page-header';
import { QueryView, TableSkeleton } from '@/components/ui/states';
import { ActiveBadge } from '@/components/ui/status-badge';
import { useToast } from '@/components/ui/toast';
import { useAdmin } from '@/features/auth/auth-context';
import { AddStaffDialog, ResetPasswordDialog } from '@/features/staff/staff-dialogs';
import { useApiQuery } from '@/hooks/use-api-query';
import { fetchStaff, updateStaff } from '@/services/api/admin-api';
import { formatDateTime } from '@/utils/date';
import { getErrorMessage } from '@/services/api/api-error';

const ROLE_LABEL = { SUPER_ADMIN: 'Super admin', ADMIN: 'Admin' };

/** Staff logins for the admin panel. Super admins only; the server enforces this too. */
export function StaffPage() {
  const admin = useAdmin();

  if (admin.role !== 'SUPER_ADMIN') {
    return (
      <>
        <PageHeader title="Staff" description="Logins for the people who run the shop." />
        <Card title="Staff logins">
          <p className="text-sm text-muted">Only a super admin can manage staff logins.</p>
        </Card>
      </>
    );
  }
  return <StaffList currentAdminId={admin.id} />;
}

function StaffList({ currentAdminId }) {
  const toast = useToast();
  const query = useApiQuery('staff', fetchStaff);
  const [isAdding, setIsAdding] = useState(false);
  const [resetting, setResetting] = useState(null);
  const [deactivating, setDeactivating] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const change = async (member, input, done) => {
    setBusyId(member.id);
    try {
      await updateStaff(member.id, input);
      toast.success(done);
      query.reload();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setBusyId(null);
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Name',
      cell: (member) => (
        <div>
          <span className="font-medium text-fg">{member.name}</span>
          {member.id === currentAdminId ? (
            <span className="ml-2">
              <Badge tone="info">You</Badge>
            </span>
          ) : null}
          <span className="block text-xs text-muted">{member.email}</span>
        </div>
      ),
    },
    { key: 'role', header: 'Role', cell: (member) => ROLE_LABEL[member.role] },
    { key: 'status', header: 'Status', cell: (member) => <ActiveBadge isActive={member.isActive} /> },
    {
      key: 'last',
      header: 'Last sign-in',
      cell: (member) => (member.lastLoginAt ? formatDateTime(member.lastLoginAt) : 'Never'),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      cell: (member) =>
        member.id === currentAdminId ? (
          <span className="text-xs text-muted">Use My profile</span>
        ) : (
          <div className="flex flex-wrap justify-end gap-2">
            <Button size="sm" onClick={() => setResetting(member)}>
              Reset password
            </Button>
            <Button
              size="sm"
              loading={busyId === member.id}
              onClick={() =>
                change(
                  member,
                  { role: member.role === 'ADMIN' ? 'SUPER_ADMIN' : 'ADMIN' },
                  `${member.name} is now ${member.role === 'ADMIN' ? 'a super admin' : 'an admin'}.`
                )
              }>
              {member.role === 'ADMIN' ? 'Make super admin' : 'Make admin'}
            </Button>
            {member.isActive ? (
              <Button size="sm" onClick={() => setDeactivating(member)}>
                Deactivate
              </Button>
            ) : (
              <Button
                size="sm"
                loading={busyId === member.id}
                onClick={() => change(member, { isActive: true }, `${member.name} can sign in again.`)}>
                Activate
              </Button>
            )}
          </div>
        ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Staff"
        description="Logins for the people who run the shop. Deactivating a login signs that person out at once."
        actions={
          <Button variant="primary" onClick={() => setIsAdding(true)}>
            Add staff login
          </Button>
        }
      />

      <QueryView query={query} skeleton={<TableSkeleton rows={3} />}>
        {(data) => <DataTable caption="Staff logins" columns={columns} rows={data.items} getKey={(member) => member.id} />}
      </QueryView>

      <AddStaffDialog open={isAdding} onClose={() => setIsAdding(false)} onSaved={query.reload} />
      <ResetPasswordDialog staff={resetting} onClose={() => setResetting(null)} />

      <ConfirmDialog
        open={deactivating !== null}
        title="Deactivate this login?"
        tone="danger"
        confirmLabel="Deactivate"
        onClose={() => setDeactivating(null)}
        onConfirm={async () => {
          if (!deactivating) return;
          await updateStaff(deactivating.id, { isActive: false });
          toast.success(`${deactivating.name} was signed out and can no longer sign in.`);
          query.reload();
        }}>
        <p>
          <strong>{deactivating?.name}</strong> is signed out now and cannot sign in until you activate the login again.
          Their name stays on the orders and stock changes they made.
        </p>
      </ConfirmDialog>
    </>
  );
}
