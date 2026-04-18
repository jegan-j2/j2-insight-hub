import { useState, useEffect, useCallback } from "react";
import { usePermissions } from "@/hooks/useUserRole";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { X, Plus, Pencil, MinusCircle, Users, CheckCircle, Mail, Loader2, RefreshCw } from "lucide-react";
import { computeAccessInfo, type InviteSnapshot } from "@/lib/accessStatus";
import { format, formatDistanceToNow } from "date-fns";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/contexts/ThemeContext";
import { getSafeErrorMessage } from "@/lib/safeError";

const LOGO_LIGHT = "https://eaeqkgjhgdykxwjkaxpj.supabase.co/storage/v1/object/public/branding/j2_logo_new_lightmode.png";
const LOGO_DARK = "https://eaeqkgjhgdykxwjkaxpj.supabase.co/storage/v1/object/public/branding/j2_logo_new_darkmode.png";

interface ClientContact {
  id: string;
  client_id: string;
  contact_name: string;
  contact_title: string | null;
  contact_type: string | null;
  email: string | null;
  portal_access: boolean | null;
  status: string | null;
}

interface ClientInfo {
  client_id: string;
  client_name: string;
  logo_url: string | null;
  campaign_end: string | null;
}

interface ClientContactsModalProps {
  client: ClientInfo;
  open: boolean;
  onClose: () => void;
  onContactsChanged?: () => void;
}

const HASH_COLORS = [
  "from-blue-500 to-indigo-600",
  "from-emerald-500 to-teal-600",
  "from-purple-500 to-violet-600",
  "from-rose-500 to-pink-600",
  "from-amber-500 to-orange-600",
  "from-cyan-500 to-blue-600",
  "from-fuchsia-500 to-purple-600",
  "from-lime-500 to-green-600",
];

const getHashColor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return HASH_COLORS[Math.abs(hash) % HASH_COLORS.length];
};

const getInitials = (name: string) => {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
};

interface ContactFormData {
  contact_name: string;
  contact_title: string;
  email: string;
  contact_type: string;
}

const emptyForm: ContactFormData = { contact_name: "", contact_title: "", email: "", contact_type: "secondary" };

export const ClientContactsModal = ({ client, open, onClose, onContactsChanged }: ClientContactsModalProps) => {
  const { toast } = useToast();
  const { resolvedTheme } = useTheme();
  const { isAdmin } = usePermissions();
  const [contacts, setContacts] = useState<ClientContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [contactForm, setContactForm] = useState<ContactFormData>({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [showInactiveContacts, setShowInactiveContacts] = useState(false);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ContactFormData>({ ...emptyForm });
  const [savingEdit, setSavingEdit] = useState(false);
  const [sendingInviteId, setSendingInviteId] = useState<string | null>(null);
  // Map of email → invite/auth snapshot for this client's contacts.
  // Sourced from get_contact_auth_info RPC (joins auth.users + user_roles + client_contacts)
  // so we can determine real Last Login + Dashboard Access state per contact.
  const [inviteByEmail, setInviteByEmail] = useState<Record<string, InviteSnapshot>>({});

  const fetchInviteRecords = useCallback(async () => {
    try {
      const { data, error } = await (supabase.rpc as any)('get_contact_auth_info', {
        p_client_id: client.client_id,
      });
      if (error) throw error;
      const map: Record<string, InviteSnapshot> = {};
      (data as any[] | null)?.forEach((r) => {
        if (r?.email) {
          map[String(r.email).toLowerCase()] = {
            invite_sent_at: r.invite_sent_at ?? null,
            invite_expires_at: r.invite_expires_at ?? null,
            last_sign_in_at: r.last_sign_in_at ?? null,
          };
        }
      });
      setInviteByEmail(map);
    } catch (err) {
      console.error('Error fetching contact auth info:', err);
    }
  }, [client.client_id]);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    try {
      const query = supabase
        .from("client_contacts")
        .select("*")
        .eq("client_id", client.client_id)
        .order("contact_type", { ascending: false })
        .order("contact_name");

      if (!showInactiveContacts) {
        query.eq("status", "active");
      }

      const { data, error } = await query;
      if (error) throw error;
      setContacts(data || []);
    } catch (err) {
      console.error("Error fetching contacts:", err);
    } finally {
      setLoading(false);
    }
  }, [client.client_id, showInactiveContacts]);

  useEffect(() => {
    if (open) {
      fetchContacts();
      fetchInviteRecords();
      setShowAddForm(false);
      setEditingContactId(null);
    }
  }, [open, fetchContacts, fetchInviteRecords]);

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  const handleSaveContact = async (andInvite = false) => {
    if (!contactForm.contact_name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    if (andInvite && !contactForm.email.trim()) {
      toast({ title: "Email is required to send an invite", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      // Check for existing inactive contact with same name
      const { data: existing } = await supabase
        .from("client_contacts")
        .select("*")
        .eq("client_id", client.client_id)
        .eq("contact_name", contactForm.contact_name.trim())
        .eq("status", "inactive")
        .maybeSingle();

      let savedContactId: string | null = null;

      if (existing) {
        // Reactivate and update
        const { error } = await supabase.from("client_contacts").update({
          contact_title: contactForm.contact_title.trim() || null,
          email: contactForm.email.trim() || null,
          contact_type: contactForm.contact_type,
          status: "active",
        }).eq("id", existing.id);
        if (error) throw error;
        savedContactId = existing.id;
      } else {
        const { data, error } = await supabase.from("client_contacts").insert({
          client_id: client.client_id,
          contact_name: contactForm.contact_name.trim(),
          contact_title: contactForm.contact_title.trim() || null,
          email: contactForm.email.trim() || null,
          contact_type: contactForm.contact_type,
          status: "active",
        }).select("id").single();
        if (error) throw error;
        savedContactId = data?.id || null;
      }

      toast({ title: "Contact added", description: `${contactForm.contact_name} has been added.`, className: "border-[#10b981] text-[#10b981]" });

      if (andInvite && contactForm.email.trim() && savedContactId) {
        await sendInviteByEmail(contactForm.email.trim(), savedContactId, contactForm.contact_name.trim());
      }

      setContactForm({ ...emptyForm });
      setShowAddForm(false);
      fetchContacts();
      onContactsChanged?.();
    } catch (err: any) {
      toast({ title: "Error adding contact", description: getSafeErrorMessage(err), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivateContact = async (contact: ClientContact) => {
    setContacts(prev => prev.filter(c => c.id !== contact.id));
    try {
      const { error } = await supabase.from("client_contacts").update({ status: "inactive" }).eq("id", contact.id);
      if (error) throw error;
      // Revoke dashboard access — removes user_roles row so they're blocked on next login
      if (contact.email) {
        await supabase.rpc('revoke_client_access', { p_email: contact.email });
      }
      toast({ title: "Contact removed", className: "border-[#10b981] text-[#10b981]" });
      onContactsChanged?.();
    } catch (err: any) {
      fetchContacts();
      toast({ title: "Error", description: getSafeErrorMessage(err), variant: "destructive" });
    }
  };

  const handleReactivateContact = async (contact: ClientContact) => {
    setContacts(prev => prev.map(c => c.id === contact.id ? { ...c, status: "active" } : c));
    try {
      const { error } = await supabase.from("client_contacts").update({ status: "active" }).eq("id", contact.id);
      if (error) throw error;
      toast({ title: "Contact reactivated", className: "border-[#10b981] text-[#10b981]" });
      onContactsChanged?.();
    } catch (err: any) {
      fetchContacts();
      toast({ title: "Error", description: getSafeErrorMessage(err), variant: "destructive" });
    }
  };

  const handleStartEdit = (contact: ClientContact) => {
    setEditingContactId(contact.id);
    setEditForm({
      contact_name: contact.contact_name,
      contact_title: contact.contact_title || "",
      email: contact.email || "",
      contact_type: contact.contact_type || "secondary",
    });
  };

  const handleCancelEdit = () => {
    setEditingContactId(null);
  };

  const handleSaveEdit = async (contactId: string) => {
    if (!editForm.contact_name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    setSavingEdit(true);
    try {
      const { error } = await supabase.from("client_contacts").update({
        contact_name: editForm.contact_name.trim(),
        contact_title: editForm.contact_title.trim() || null,
        email: editForm.email.trim() || null,
        contact_type: editForm.contact_type,
      }).eq("id", contactId);
      if (error) throw error;
      toast({ title: "Contact updated", className: "border-[#10b981] text-[#10b981]" });
      setEditingContactId(null);
      fetchContacts();
      onContactsChanged?.();
    } catch (err: any) {
      toast({ title: "Error updating contact", description: getSafeErrorMessage(err), variant: "destructive" });
    } finally {
      setSavingEdit(false);
    }
  };

  const sendInviteByEmail = async (email: string, contactId: string, displayName?: string) => {
    try {
      const { error } = await supabase.functions.invoke("generate-invite-link", {
        body: { email, role: "client", client_id: client.client_id, displayName },
      });
      if (error) throw error;
      setContacts(prev => prev.map(c => c.id === contactId ? { ...c, portal_access: true } : c));
      await supabase.from("client_contacts").update({ portal_access: true }).eq("id", contactId);
      // Refresh invite snapshot so the badge flips to "Invite Sent" (amber) immediately.
      await fetchInviteRecords();
      toast({ title: "Invite sent", description: `Invitation sent to ${email}`, className: "border-[#10b981] text-[#10b981]" });
    } catch (err: any) {
      toast({ title: "Failed to send invite", description: getSafeErrorMessage(err), variant: "destructive" });
    }
  };

  const handleSendInvite = async (contact: ClientContact) => {
    if (!contact.email) return;
    setSendingInviteId(contact.id);
    try {
      await sendInviteByEmail(contact.email, contact.id, contact.contact_name);
    } finally {
      setSendingInviteId(null);
    }
  };

  if (!open) return null;

  const clientGradient = getHashColor(client.client_name);
  const activeContacts = contacts.filter(c => c.status === "active");
  const contactCount = activeContacts.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-4xl max-h-[85vh] bg-card border border-border rounded-xl shadow-2xl flex flex-col mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            {client.logo_url ? (
              <img src={client.logo_url} alt={client.client_name} className="w-10 h-10 rounded-full object-contain bg-white" />
            ) : (
              <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${clientGradient} flex items-center justify-center`}>
                <span className="text-sm font-bold text-white">{getInitials(client.client_name)}</span>
              </div>
            )}
            <div>
              <h2 className="text-lg font-semibold text-foreground">{client.client_name} — Contacts</h2>
              <p className="text-sm text-muted-foreground">
                {contactCount} contact{contactCount !== 1 ? "s" : ""}
                {client.campaign_end && ` • Campaign ends ${format(new Date(client.campaign_end), "d MMM yyyy")}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => { setShowAddForm(true); setContactForm({ ...emptyForm }); }}
              className="gap-2 bg-[#0f172a] text-white hover:bg-[#1e293b] dark:bg-white dark:text-[#0f172a] dark:hover:bg-gray-100"
              size="sm"
            >
              <Plus className="h-4 w-4" />
              Add Contact
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Show inactive contacts toggle */}
        <div className="px-6 pt-4 pb-2 flex items-center gap-2">
          <Switch
            id="show-inactive-contacts"
            checked={showInactiveContacts}
            onCheckedChange={setShowInactiveContacts}
            className="data-[state=checked]:bg-[#10b981]"
          />
          <Label htmlFor="show-inactive-contacts" className="text-sm text-muted-foreground cursor-pointer">
            Show inactive contacts
          </Label>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center gap-4">
                <img
                  src={resolvedTheme === "dark" ? LOGO_DARK : LOGO_LIGHT}
                  alt="Loading"
                  className="w-[48px] h-[48px] rounded-full object-contain border-2 border-[#0f172a] dark:border-white animate-[spin_2s_linear_infinite]"
                />
                <p className="text-sm font-semibold text-muted-foreground">Loading...</p>
              </div>
            </div>
          ) : contacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Users className="h-12 w-12 mb-3 opacity-40" />
              <p className="text-sm font-medium">No contacts yet</p>
              <p className="text-xs mt-1">Click Add Contact to get started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 bg-[#0F172A] hover:bg-[#0F172A] dark:bg-[#0F172A] dark:hover:bg-[#0F172A]">
                  <TableHead className="px-4 py-2 font-bold text-white text-[14px]">Contact</TableHead>
                  <TableHead className="px-4 py-2 font-bold text-white text-[14px]">Job Title</TableHead>
                  <TableHead className="px-4 py-2 font-bold text-white text-[14px]">Type</TableHead>
                  <TableHead className="px-4 py-2 font-bold text-white text-[14px]">Last Login</TableHead>
                  <TableHead className="px-4 py-2 font-bold text-white text-[14px]">Dashboard Access</TableHead>
                  <TableHead className="px-4 py-2 font-bold text-white text-[14px] text-left min-w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.map(contact => {
                  const isInactive = contact.status === "inactive";
                  const gradient = getHashColor(contact.contact_name);

                  // Inline edit mode
                  if (editingContactId === contact.id) {
                    return (
                      <TableRow key={contact.id} className="border-border/50 bg-muted/10">
                        <TableCell colSpan={6}>
                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 py-2">
                            <div>
                              <Label className="text-xs mb-1 block">Name *</Label>
                              <Input
                                value={editForm.contact_name}
                                onChange={e => setEditForm({ ...editForm, contact_name: e.target.value })}
                                className="bg-background/50 border-border h-9 text-sm"
                              />
                            </div>
                            <div>
                              <Label className="text-xs mb-1 block">Job Title</Label>
                              <Input
                                value={editForm.contact_title}
                                onChange={e => setEditForm({ ...editForm, contact_title: e.target.value })}
                                className="bg-background/50 border-border h-9 text-sm"
                              />
                            </div>
                            <div>
                              <Label className="text-xs mb-1 block">Email</Label>
                              <Input
                                value={editForm.email}
                                onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                                className="bg-background/50 border-border h-9 text-sm"
                              />
                            </div>
                            <div>
                              <Label className="text-xs mb-1 block">Type</Label>
                              <Select value={editForm.contact_type} onValueChange={val => setEditForm({ ...editForm, contact_type: val })}>
                                <SelectTrigger className="bg-background/50 border-border h-9 text-sm"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="primary">Primary</SelectItem>
                                  <SelectItem value="secondary">Secondary</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="flex justify-end gap-2 mt-2">
                            <button onClick={handleCancelEdit} style={{ border: '1px solid #94a3b8', backgroundColor: 'transparent', color: 'inherit', padding: '6px 12px', borderRadius: '6px', fontSize: '14px', cursor: 'pointer' }}>Cancel</button>
                            <Button size="sm" onClick={() => handleSaveEdit(contact.id)} disabled={savingEdit || !editForm.contact_name.trim()} className="bg-[#0f172a] text-white hover:bg-[#1e293b] dark:bg-white dark:text-[#0f172a] dark:hover:bg-gray-100">
                              {savingEdit ? "Saving..." : "Save Changes"}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  }

                  return (
                    <TableRow key={contact.id} className={`border-border/50 hover:bg-muted/20 ${isInactive ? 'opacity-50' : ''}`}>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className={`w-[30px] h-[30px] rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0`}>
                            <span className="text-[10px] font-bold text-white">{getInitials(contact.contact_name)}</span>
                          </div>
                          <span className="font-medium text-foreground">{contact.contact_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {contact.contact_title ? (
                          <span className="text-sm text-muted-foreground">{contact.contact_title}</span>
                        ) : (
                          <span className="text-sm text-muted-foreground italic">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={contact.contact_type === "primary"
                          ? "bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/30 hover:bg-purple-500/20"
                          : "bg-muted/50 text-muted-foreground border-border hover:bg-muted/50"
                        }>
                          {contact.contact_type === "primary" ? "Primary" : "Secondary"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const inv = contact.email ? inviteByEmail[contact.email.toLowerCase()] : null;
                          if (inv?.last_sign_in_at) {
                            return (
                              <span
                                className="text-sm text-muted-foreground"
                                title={format(new Date(inv.last_sign_in_at), "d MMM yyyy, h:mm a")}
                              >
                                {formatDistanceToNow(new Date(inv.last_sign_in_at), { addSuffix: true })}
                              </span>
                            );
                          }
                          return <span className="text-sm text-muted-foreground italic">Never logged in</span>;
                        })()}
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const inv = contact.email ? inviteByEmail[contact.email.toLowerCase()] : null;
                          const access = computeAccessInfo(inv, isInactive);
                          // No invite + has email + not inactive → keep the "Send Invite" CTA
                          if (access.status === 'no_invite' && contact.email && !isInactive) {
                            return (
                              <Button
                                size="sm"
                                className="h-7 text-xs gap-1.5 bg-[#0f172a] text-white hover:bg-[#1e293b] dark:bg-white dark:text-[#0f172a] dark:hover:bg-gray-100"
                                disabled={sendingInviteId === contact.id}
                                onClick={() => handleSendInvite(contact)}
                              >
                                {sendingInviteId === contact.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Mail className="h-3 w-3" />
                                )}
                                Send Invite
                              </Button>
                            );
                          }
                          if (access.status === 'no_invite' && !contact.email) {
                            return (
                              <Badge className="bg-muted/50 text-muted-foreground border-border hover:bg-muted/50">
                                Not Invited
                              </Badge>
                            );
                          }
                          const badgeClass =
                            access.status === 'active'
                              ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                              : access.status === 'invite_sent'
                              ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
                              : access.status === 'expired'
                              ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
                              : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted/50';
                          return (
                            <div className="flex items-center gap-2">
                              <Badge className={badgeClass}>{access.label}</Badge>
                              {access.status === 'expired' && contact.email && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 px-2 text-[11px] border-rose-500/40 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10"
                                  disabled={sendingInviteId === contact.id}
                                  onClick={() => handleSendInvite(contact)}
                                >
                                  {sendingInviteId === contact.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <>
                                      <RefreshCw className="h-3 w-3 mr-1" />
                                      Resend
                                    </>
                                  )}
                                </Button>
                              )}
                            </div>
                          );
                        })()}
                      </TableCell>
                      <TableCell className="text-right">
                        <TooltipProvider>
                          <div className="flex justify-end gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-purple-500 hover:text-purple-400 hover:bg-purple-500/10" onClick={() => handleStartEdit(contact)}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Edit contact</TooltipContent>
                            </Tooltip>
                            {isAdmin && contact.email && !isInactive && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className={`h-8 w-8 ${
                                      contact.portal_access
                                        ? 'text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10'
                                        : 'text-blue-500 hover:text-blue-400 hover:bg-blue-500/10'
                                    }`}
                                    disabled={sendingInviteId === contact.id}
                                    onClick={() => handleSendInvite(contact)}
                                  >
                                    {sendingInviteId === contact.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>{contact.portal_access ? 'Resend Invite' : 'Send Invite'}</TooltipContent>
                              </Tooltip>
                            )}
                            {isInactive ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10" onClick={() => handleReactivateContact(contact)}>
                                    <CheckCircle className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Reactivate contact</TooltipContent>
                              </Tooltip>
                            ) : (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-orange-500 hover:text-orange-400 hover:bg-orange-500/10" onClick={() => handleDeactivateContact(contact)}>
                                    <MinusCircle className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Deactivate contact</TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </TooltipProvider>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          {/* Add Contact Form - below table */}
          {showAddForm && (
            <div className="p-4 border border-border rounded-lg bg-muted/20 animate-fade-in mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs mb-1 block">Name *</Label>
                  <Input
                    value={contactForm.contact_name}
                    onChange={e => setContactForm({ ...contactForm, contact_name: e.target.value })}
                    placeholder="Full name"
                    className="bg-background/50 border-border h-9 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Job Title</Label>
                  <Input
                    value={contactForm.contact_title}
                    onChange={e => setContactForm({ ...contactForm, contact_title: e.target.value })}
                    placeholder="e.g. VP Sales"
                    className="bg-background/50 border-border h-9 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Email</Label>
                  <Input
                    value={contactForm.email}
                    onChange={e => setContactForm({ ...contactForm, email: e.target.value })}
                    placeholder="email@company.com"
                    className="bg-background/50 border-border h-9 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Type</Label>
                  <Select value={contactForm.contact_type} onValueChange={val => setContactForm({ ...contactForm, contact_type: val })}>
                    <SelectTrigger className="bg-background/50 border-border h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="primary">Primary</SelectItem>
                      <SelectItem value="secondary">Secondary</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-3">
                <button onClick={() => setShowAddForm(false)} style={{ border: '1px solid #94a3b8', backgroundColor: 'transparent', color: 'inherit', padding: '6px 12px', borderRadius: '6px', fontSize: '14px', cursor: 'pointer' }}>Cancel</button>
                <Button size="sm" onClick={() => handleSaveContact(false)} disabled={saving || !contactForm.contact_name.trim()} className="bg-[#0f172a] text-white hover:bg-[#1e293b] dark:bg-white dark:text-[#0f172a] dark:hover:bg-gray-100">
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-4 border-t border-border">
          <button
            onClick={onClose}
            style={{
              border: '1px solid #94a3b8',
              backgroundColor: 'transparent',
              color: 'inherit',
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
