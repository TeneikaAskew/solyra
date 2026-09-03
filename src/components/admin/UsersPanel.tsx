import { useMemo, useState } from 'react';
import { Loader2, Search, ShieldCheck, UserX, UserCheck } from 'lucide-react';
import {
  useAdminUsers,
  useUpdateUserRoles,
  useUpdateUserStatus,
  type AdminUserRow,
} from '@/hooks/useAdmin';

/**
 * User + role administration.
 *
 * Rule 4: nothing here fabricates a value. Missing timestamps render as an
 * em-dash, and every load/save failure is shown verbatim rather than being
 * swallowed into an empty table.
 */

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
}

export function UsersPanel({ enabled }: { enabled: boolean }) {
  const usersQuery = useAdminUsers(enabled);
  const rolesMut = useUpdateUserRoles();
  const statusMut = useUpdateUserStatus();
  const [q, setQ] = useState('');

  const users = usersQuery.data?.users;
  const availableRoles = usersQuery.data?.available_roles ?? [];

  const filtered = useMemo(() => {
    if (!users) return null;
    const needle = q.trim().toLowerCase();
    if (!needle) return users;
    return users.filter(
      (u) =>
        (u.email ?? '').toLowerCase().includes(needle) ||
        (u.display_name ?? '').toLowerCase().includes(needle) ||
        u.uid.toLowerCase().includes(needle),
    );
  }, [users, q]);

  const toggleRole = (u: AdminUserRow, role: string) => {
    const next = u.roles.includes(role) ? u.roles.filter((r) => r !== role) : [...u.roles, role];
    rolesMut.mutate({ uid: u.uid, roles: next });
  };

  if (usersQuery.isLoading) {
    return (
      <div className="flex items-center justify-center p-8 text-[var(--color-text-muted)]">
        <Loader2 size={18} className="animate-spin" />
      </div>
    );
  }

  if (usersQuery.error) {
    return (
      <div
        data-testid="admin-users-error"
        className="rounded-lg border border-[var(--bear)] bg-[var(--surface-2)] p-4 text-xs text-[var(--bear)]"
      >
        Could not load users: {usersQuery.error.message}
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-3" data-testid="admin-users-panel">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex min-w-0 flex-1 items-center gap-2 rounded border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-2 py-1.5">
          <Search size={13} className="shrink-0 text-[var(--color-text-muted)]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search email, name or UID"
            data-testid="admin-users-search"
            className="min-w-0 flex-1 bg-transparent text-xs text-[var(--color-text-primary)] outline-none"
          />
        </label>
        <span className="shrink-0 text-[11px] text-[var(--color-text-muted)]">
          {filtered?.length ?? 0} of {users?.length ?? 0}
        </span>
      </div>

      {(rolesMut.error || statusMut.error) && (
        <div className="text-xs text-[var(--bear)]" data-testid="admin-users-mutation-error">
          {(rolesMut.error ?? statusMut.error)?.message}
        </div>
      )}

      {filtered && filtered.length === 0 ? (
        <div className="rounded-lg border border-[var(--color-border)] p-6 text-center text-xs text-[var(--color-text-muted)]">
          No users match this search.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]" data-testid="admin-users-table">
          <table className="w-full min-w-[640px] text-xs">
            <thead className="bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)]">
              <tr>
                <th className="px-3 py-2 text-left">User</th>
                <th className="px-3 py-2 text-left">Roles</th>
                <th className="px-3 py-2 text-left">Created</th>
                <th className="px-3 py-2 text-left">Last sign-in</th>
                <th className="px-3 py-2 text-right">Access</th>
              </tr>
            </thead>
            <tbody>
              {filtered?.map((u) => (
                <tr key={u.uid} className="border-t border-[var(--color-border)] align-top">
                  <td className="px-3 py-2">
                    <div className="font-medium text-[var(--color-text-primary)]">
                      {u.email ?? u.display_name ?? '—'}
                    </div>
                    <div className="font-mono text-[10px] text-[var(--color-text-muted)]">{u.uid}</div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {availableRoles.length === 0 ? (
                        <span className="text-[var(--color-text-muted)]">—</span>
                      ) : (
                        availableRoles.map((role) => {
                          const on = u.roles.includes(role);
                          return (
                            <button
                              key={role}
                              type="button"
                              disabled={rolesMut.isPending}
                              onClick={() => toggleRole(u, role)}
                              data-testid={`role-${u.uid}-${role}`}
                              aria-pressed={on}
                              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] transition-colors disabled:opacity-50 ${
                                on
                                  ? 'border-[var(--color-accent-blue)] bg-[var(--color-accent-blue)] text-[var(--on-brand)]'
                                  : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                              }`}
                            >
                              {on && <ShieldCheck size={10} />}
                              {role}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-[var(--color-text-muted)]">{fmtDate(u.created_at)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-[var(--color-text-muted)]">{fmtDate(u.last_sign_in_at)}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      disabled={statusMut.isPending}
                      onClick={() => statusMut.mutate({ uid: u.uid, disabled: !u.disabled })}
                      data-testid={`status-${u.uid}`}
                      className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-[10px] disabled:opacity-50 ${
                        u.disabled
                          ? 'border-[var(--bear)] text-[var(--bear)]'
                          : 'border-[var(--color-border)] text-[var(--color-text-secondary)]'
                      }`}
                    >
                      {u.disabled ? <UserCheck size={11} /> : <UserX size={11} />}
                      {u.disabled ? 'Enable' : 'Disable'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
