// Shared 4-state access status used in Settings (Team Members) and ClientContactsModal (Dashboard Access).
// States:
//   'active'      → user has logged in (last_sign_in_at is not null) — green
//   'invite_sent' → invite sent, never logged in, not yet expired — amber
//   'expired'     → invite sent, never logged in, past invite_expires_at — red
//   'inactive'    → manually deactivated — grey
//   'no_invite'   → no invite ever sent — grey
export type AccessStatus = 'active' | 'invite_sent' | 'expired' | 'inactive' | 'no_invite';

export interface AccessInfo {
  status: AccessStatus;
  label: string;
}

export interface InviteSnapshot {
  invite_sent_at: string | null;
  invite_expires_at: string | null;
  last_sign_in_at: string | null;
}

export const computeAccessInfo = (
  invite: InviteSnapshot | null | undefined,
  isManuallyInactive: boolean,
): AccessInfo => {
  if (isManuallyInactive) return { status: 'inactive', label: 'Inactive' };
  if (invite?.last_sign_in_at) return { status: 'active', label: 'Active' };
  if (invite?.invite_sent_at) {
    const expiresAt = invite.invite_expires_at ? new Date(invite.invite_expires_at).getTime() : null;
    if (expiresAt && expiresAt > Date.now()) return { status: 'invite_sent', label: 'Invite Sent' };
    return { status: 'expired', label: 'Expired' };
  }
  return { status: 'no_invite', label: 'No Invite Sent' };
};
