import { useState, useEffect, useCallback } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { X, Plus, Pencil, MinusCircle, Users } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { J2Loader } from "@/components/J2Loader";
import { getSafeErrorMessage } from "@/lib/safeError";

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

export const ClientContactsModal = ({ client, open, onClose, onContactsChanged }: ClientContactsModalProps) => {
  const { toast } = useToast();
  const [contacts, setContacts] = useState<ClientContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [contactForm, setContactForm] = useState({ contact_name: "", contact_title: "", email: "", contact_type: "secondary" });
  const [saving, setSaving] = useState(false);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("client_contacts")
        .select("*")
        .eq("client_id", client.client_id)
        .eq("status", "active")
        .order("contact_type", { ascending: false })
        .order("contact_name");
      if (error) throw error;
      setContacts(data || []);
    } catch (err) {
      console.error("Error fetching contacts:", err);
    } finally {
      setLoading(false);
    }
  }, [client.client_id]);

  useEffect(() => {
    if (open) {
      fetchContacts();
      setShowAddForm(false);
    }
  }, [open, fetchContacts]);

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  const handleSaveContact = async () => {
    if (!contactForm.contact_name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("client_contacts").insert({
        client_id: client.client_id,
        contact_name: contactForm.contact_name.trim(),
        contact_title: contactForm.contact_title.trim() || null,
        email: contactForm.email.trim() || null,
        contact_type: contactForm.contact_type,
        status: "active",
      });
      if (error) throw error;
      toast({ title: "Contact added", description: `${contactForm.contact_name} has been added.`, className: "border-[#10b981] text-[#10b981]" });
      setContactForm({ contact_name: "", contact_title: "", email: "", contact_type: "secondary" });
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
    // Optimistic
    setContacts(prev => prev.filter(c => c.id !== contact.id));
    try {
      const { error } = await supabase.from("client_contacts").update({ status: "inactive" }).eq("id", contact.id);
      if (error) throw error;
      toast({ title: "Contact removed", className: "border-[#10b981] text-[#10b981]" });
      onContactsChanged?.();
    } catch (err: any) {
      fetchContacts(); // rollback
      toast({ title: "Error", description: getSafeErrorMessage(err), variant: "destructive" });
    }
  };

  if (!open) return null;

  const clientGradient = getHashColor(client.client_name);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
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
                {contacts.length} contact{contacts.length !== 1 ? "s" : ""}
                {client.campaign_end && ` • Campaign ends ${format(new Date(client.campaign_end), "d MMM yyyy")}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => { setShowAddForm(true); setContactForm({ contact_name: "", contact_title: "", email: "", contact_type: "secondary" }); }}
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

        {/* Add Contact Form */}
        {showAddForm && (
          <div className="p-4 border-b border-border bg-muted/20 animate-fade-in">
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
              <Button variant="outline" size="sm" onClick={() => setShowAddForm(false)}>Cancel</Button>
              <Button size="sm" onClick={handleSaveContact} disabled={saving || !contactForm.contact_name.trim()} className="bg-[#0f172a] text-white hover:bg-[#1e293b] dark:bg-white dark:text-[#0f172a] dark:hover:bg-gray-100">
                {saving ? "Saving..." : "Save Contact"}
              </Button>
            </div>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
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
                <TableRow className="border-border/50 bg-[#f1f5f9] dark:bg-[#1e293b]">
                  <TableHead className="px-4 py-2 font-bold text-[#0f172a] dark:text-[#f1f5f9]">Contact</TableHead>
                  <TableHead className="px-4 py-2 font-bold text-[#0f172a] dark:text-[#f1f5f9]">Job Title</TableHead>
                  <TableHead className="px-4 py-2 font-bold text-[#0f172a] dark:text-[#f1f5f9]">Type</TableHead>
                  <TableHead className="px-4 py-2 font-bold text-[#0f172a] dark:text-[#f1f5f9]">Dashboard Access</TableHead>
                  <TableHead className="px-4 py-2 font-bold text-[#0f172a] dark:text-[#f1f5f9]">Last Login</TableHead>
                  <TableHead className="px-4 py-2 font-bold text-[#0f172a] dark:text-[#f1f5f9] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.map(contact => {
                  const gradient = getHashColor(contact.contact_name);
                  return (
                    <TableRow key={contact.id} className="border-border/50 hover:bg-muted/20">
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
                        <Badge className={contact.portal_access
                          ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                          : "bg-muted/50 text-muted-foreground border-border hover:bg-muted/50"
                        }>
                          {contact.portal_access ? "Active" : "Not Invited"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground italic">Never logged in</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <TooltipProvider>
                          <div className="flex justify-end gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-purple-500 hover:text-purple-400 hover:bg-purple-500/10">
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Edit contact</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-orange-500 hover:text-orange-400 hover:bg-orange-500/10" onClick={() => handleDeactivateContact(contact)}>
                                  <MinusCircle className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Remove contact</TooltipContent>
                            </Tooltip>
                          </div>
                        </TooltipProvider>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-4 border-t border-border">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
};
