import { useState, useEffect, useCallback, useRef } from "react";
import { useBrowserNotifications } from "@/hooks/useBrowserNotifications";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Building2, Plus, Pencil, Trash2, Users, Bell, X, Send, Save, Loader2, Upload, Power, BellRing, Mail, RefreshCw, Eye, EyeOff, Home, MinusCircle, CheckCircle, ArrowUpDown, ArrowUp, ArrowDown, Search } from "lucide-react";
import { format } from "date-fns";
import { ClientContactsModal } from "@/components/ClientContactsModal";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { sendSlackNotification, formatTestMessage } from "@/lib/slackNotifications";
import { Skeleton } from "@/components/ui/skeleton";
import { SDRAvatar } from "@/components/SDRAvatar";
import { usePermissions, useUserRole } from "@/hooks/useUserRole";
import { getSafeErrorMessage } from "@/lib/safeError";

interface ClientRow {
  id: string;
  client_id: string;
  client_name: string;
  email: string | null;
  logo_url: string | null;
  banner_url: string | null;
  banner_gradient: string | null;
  campaign_start: string | null;
  campaign_end: string | null;
  target_sqls: number | null;
  status: string | null;
  created_at: string | null;
}

interface TeamMemberRow {
  id: string;
  sdr_name: string;
  sdr_first_name: string | null;
  email: string;
  role: string | null;
  status: string | null;
  created_at: string | null;
  profile_photo_url: string | null;
  client_id: string | null;
}

interface InviteRecord {
  id: string;
  client_id: string | null;
  role: string;
  invite_status: string | null;
  invite_sent_at: string | null;
  invite_expires_at: string | null;
  user_id: string | null;
  email: string | null;
}

const Settings = () => {
  const { toast } = useToast();
  const { permission: browserNotifPermission, supported: browserNotifSupported, requestPermission } = useBrowserNotifications();
  const { loading: roleLoading } = useUserRole();
  const { canEditClients, canEditTeamMembers, canEditSettings, isAdmin } = usePermissions();

  useEffect(() => {
    document.title = "J2 Insights Dashboard - Settings";
  }, []);

  // --- Clients state ---
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);

  const fetchClients = useCallback(async () => {
    try {
      setLoadingClients(true);
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('client_name');
      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast({ title: "Error loading clients", description: "Could not fetch client data.", variant: "destructive" });
    } finally {
      setLoadingClients(false);
    }
  }, [toast]);

  // --- Team members state ---
  const [teamMembers, setTeamMembers] = useState<TeamMemberRow[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(true);

  const fetchTeamMembers = useCallback(async () => {
    try {
      setLoadingTeam(true);
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .order('sdr_name');
      if (error) throw error;
      setTeamMembers(data || []);
    } catch (error) {
      console.error('Error fetching team members:', error);
      toast({ title: "Error loading team", description: "Could not fetch team member data.", variant: "destructive" });
    } finally {
      setLoadingTeam(false);
    }
  }, [toast]);

  // --- Active clients list for SDR assignment dropdown ---
  const [clientsList, setClientsList] = useState<{ client_id: string; client_name: string }[]>([]);

  const fetchClientsList = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('client_id, client_name')
        .or('status.eq.active,status.is.null')
        .order('client_name');
      if (error) throw error;
      setClientsList(data || []);
    } catch (error) {
      console.error('Error fetching clients list:', error);
    }
  }, []);

  // --- Invite records state ---
  const [inviteRecords, setInviteRecords] = useState<InviteRecord[]>([]);
  const [clientInviteStatus, setClientInviteStatus] = useState<Record<string, 'not_sent' | 'sending' | 'sent' | 'error'>>({});
  const [memberInviteStatus, setMemberInviteStatus] = useState<Record<string, 'not_sent' | 'sending' | 'sent' | 'error'>>({});

  const fetchInviteRecords = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_invite_records');
      if (!error && data) {
        setInviteRecords(data as InviteRecord[]);
      }
    } catch (err) {
      console.error('Error fetching invite records:', err);
    }
  }, []);

  useEffect(() => {
    fetchClients();
    fetchTeamMembers();
    fetchInviteRecords();
    fetchClientsList();
  }, [fetchClients, fetchTeamMembers, fetchInviteRecords, fetchClientsList]);

  // --- Slack webhook visibility ---
  const [showSlackWebhook, setShowSlackWebhook] = useState(false);

  const getClientInviteInfo = (clientEmail: string) => {
    const invite = inviteRecords.find(r => r.email === clientEmail && r.role === 'client');
    if (!invite || invite.invite_status === 'not_sent') return { status: 'no_invite', label: 'No Invite Sent' };
    if (invite.invite_status === 'accepted') return { status: 'active', label: 'User Active' };
    if (invite.invite_status === 'pending') {
      const isExpired = invite.invite_expires_at && new Date(invite.invite_expires_at) < new Date();
      if (isExpired) return { status: 'expired', label: 'Invite Expired' };
      return { status: 'pending', label: 'Invite Pending' };
    }
    return { status: 'no_invite', label: 'No Invite Sent' };
  };

  const getMemberInviteInfo = (email: string) => {
    const invite = inviteRecords.find(r => r.email === email && r.role !== 'client');
    if (!invite || invite.invite_status === 'not_sent') return { status: 'no_invite', label: 'No Invite Sent' };
    if (invite.invite_status === 'accepted') return { status: 'active', label: 'User Active' };
    if (invite.invite_status === 'pending') {
      const isExpired = invite.invite_expires_at && new Date(invite.invite_expires_at) < new Date();
      if (isExpired) return { status: 'expired', label: 'Invite Expired' };
      return { status: 'pending', label: 'Invite Pending' };
    }
    return { status: 'no_invite', label: 'No Invite Sent' };
  };

  const handleSendInvite = async (email: string, role: string, name: string, clientId?: string) => {
    const key = clientId || email;
    const setStatus = role === 'client' ? setClientInviteStatus : setMemberInviteStatus;
    setStatus(prev => ({ ...prev, [key]: 'sending' }));

    try {
      const { data, error: fnError } = await supabase.functions.invoke('generate-invite-link', {
        body: { email, redirectTo: `${window.location.origin}/reset-password` }
      });

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      setStatus(prev => ({ ...prev, [key]: 'sent' }));
      toast({ title: "Invite sent successfully", description: `Invitation email sent to ${email}`, className: "border-[#10b981] text-[#10b981]" });
      fetchInviteRecords();
    } catch (error: any) {
      console.error('Error sending invite:', error);
      setStatus(prev => ({ ...prev, [key]: 'error' }));
      toast({ title: "Failed to send invite", description: error.message || "Something went wrong.", variant: "destructive" });
    }
  };

  const handleResendInvite = async (email: string, role: string, name: string, clientId?: string) => {
    await handleSendInvite(email, role, name, clientId);
  };

  // --- Show inactive toggles ---
  const [showInactiveClients, setShowInactiveClients] = useState(false);
  const [showInactiveMembers, setShowInactiveMembers] = useState(false);
  const [teamSearch, setTeamSearch] = useState('');

  const filteredClients = showInactiveClients ? clients : clients.filter(c => c.status === 'active' || !c.status);
  const filteredMembers = teamMembers.filter(member => {
    const matchesActive = showInactiveMembers
      ? true
      : member.status !== 'inactive';
    const search = teamSearch.toLowerCase().trim();
    const clientName = clientsList.find(c =>
      c.client_id === member.client_id)?.client_name?.toLowerCase() || '';
    const matchesSearch = search === '' ||
      member.sdr_name?.toLowerCase().includes(search) ||
      clientName.includes(search);
    return matchesActive && matchesSearch;
  });

  const [teamPage, setTeamPage] = useState(1);
  const TEAM_PAGE_SIZE = 15;

  type TeamSortField = 'sdr_name' | 'email' | 'role' | 'client' | 'login_status';
  type TeamSortDir = 'asc' | 'desc';
  const [teamSortField, setTeamSortField] = useState<TeamSortField>('sdr_name');
  const [teamSortDir, setTeamSortDir] = useState<TeamSortDir>('asc');

  const handleTeamSort = (field: TeamSortField) => {
    if (teamSortField === field) {
      setTeamSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setTeamSortField(field);
      setTeamSortDir('asc');
    }
    setTeamPage(1);
  };

  const sortedMembers = [...filteredMembers].sort((a, b) => {
    let aVal = '';
    let bVal = '';
    if (teamSortField === 'sdr_name') {
      aVal = a.sdr_name || '';
      bVal = b.sdr_name || '';
    } else if (teamSortField === 'email') {
      aVal = a.email || '';
      bVal = b.email || '';
    } else if (teamSortField === 'role') {
      aVal = a.role || '';
      bVal = b.role || '';
    } else if (teamSortField === 'client') {
      aVal = clientsList.find(c => c.client_id === a.client_id)?.client_name || '';
      bVal = clientsList.find(c => c.client_id === b.client_id)?.client_name || '';
    } else if (teamSortField === 'login_status') {
      const order = { active: 0, pending: 1, expired: 2, no_invite: 3 };
      const aInfo = getMemberInviteInfo(a.email);
      const bInfo = getMemberInviteInfo(b.email);
      aVal = String(order[aInfo.status as keyof typeof order] ?? 9);
      bVal = String(order[bInfo.status as keyof typeof order] ?? 9);
    }
    const cmp = aVal.localeCompare(bVal, undefined, { numeric: true });
    return teamSortDir === 'asc' ? cmp : -cmp;
  });
  const totalTeamPages = Math.ceil(sortedMembers.length / TEAM_PAGE_SIZE);
  const paginatedMembers = sortedMembers.slice(
    (teamPage - 1) * TEAM_PAGE_SIZE,
    teamPage * TEAM_PAGE_SIZE
  );

  const SortIcon = ({ field, current, dir }: { field: TeamSortField; current: TeamSortField; dir: TeamSortDir }) => {
    if (field !== current) return <ArrowUpDown className="ml-1 h-3 w-3 text-muted-foreground/50 inline" />;
    return dir === 'asc'
      ? <ArrowUp className="ml-1 h-3 w-3 text-[#0f172a] dark:text-white inline" />
      : <ArrowDown className="ml-1 h-3 w-3 text-[#0f172a] dark:text-white inline" />;
  };

  // --- Primary contacts for Client Management table ---
  const [primaryContacts, setPrimaryContacts] = useState<Record<string, { contact_name: string }>>({});
  const [contactsModalClient, setContactsModalClient] = useState<ClientRow | null>(null);

  const fetchPrimaryContacts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("client_contacts")
        .select("client_id, contact_name")
        .eq("contact_type", "primary")
        .eq("status", "active");
      if (error) throw error;
      const map: Record<string, { contact_name: string }> = {};
      (data || []).forEach(c => { map[c.client_id] = { contact_name: c.contact_name }; });
      setPrimaryContacts(map);
    } catch (err) {
      console.error("Error fetching primary contacts:", err);
    }
  }, []);

  useEffect(() => { fetchPrimaryContacts(); }, [fetchPrimaryContacts]);

  // --- Client table helpers ---
  const HASH_COLORS = [
    "from-blue-500 to-indigo-600", "from-emerald-500 to-teal-600",
    "from-purple-500 to-violet-600", "from-rose-500 to-pink-600",
    "from-amber-500 to-orange-600", "from-cyan-500 to-blue-600",
    "from-fuchsia-500 to-purple-600", "from-lime-500 to-green-600",
  ];
  const getHashColor = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return HASH_COLORS[Math.abs(hash) % HASH_COLORS.length];
  };
  const getInitials = (name: string) => name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

  const getCampaignStatus = (client: ClientRow) => {
    if (client.status === 'inactive') return { label: "Inactive", color: "bg-muted/50 text-muted-foreground border-border" };
    if (!client.campaign_start || !client.campaign_end) return null;
    const now = new Date(); now.setHours(0,0,0,0);
    const start = new Date(client.campaign_start); start.setHours(0,0,0,0);
    const end = new Date(client.campaign_end); end.setHours(0,0,0,0);
    if (now < start) return { label: "Not Started", color: "bg-muted/50 text-muted-foreground border-border" };
    if (now > end) return { label: "Expired", color: "bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/30" };
    const daysLeft = Math.ceil((end.getTime() - now.getTime()) / (1000*60*60*24));
    if (daysLeft <= 14) return { label: "Ending Soon", color: "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30", dot: "bg-amber-500" };
    return { label: "Active", color: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30", dot: "bg-emerald-500" };
  };

  const getDaysLeft = (client: ClientRow) => {
    if (!client.campaign_start || !client.campaign_end) return "—";
    const now = new Date(); now.setHours(0,0,0,0);
    const end = new Date(client.campaign_end); end.setHours(0,0,0,0);
    if (now > end) return "Ended";
    const days = Math.ceil((end.getTime() - now.getTime()) / (1000*60*60*24));
    return days === 1 ? "1 day" : `${days} days`;
  };

  const formatCampaignPeriod = (start: string | null, end: string | null) => {
    if (!start || !end) return "—";
    return `${format(new Date(start), "d MMM")} → ${format(new Date(end), "d MMM yyyy")}`;
  };

  const handleReactivateClient = async (client: ClientRow) => {
    try {
      const { error } = await supabase
        .from('clients')
        .update({ status: 'active' })
        .eq('id', client.id);
      if (error) throw error;
      toast({ title: "Client reactivated", description: `${client.client_name} is now active.`, className: "border-[#10b981] text-[#10b981]" });
      fetchClients();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Could not reactivate client.", variant: "destructive" });
    }
  };

  const handleReactivateMember = async (member: TeamMemberRow) => {
    try {
      const { error } = await supabase
        .from('team_members')
        .update({ status: 'active' })
        .eq('id', member.id);
      if (error) throw error;
      toast({ title: "Team member reactivated", description: `${member.sdr_name} is now active.`, className: "border-[#10b981] text-[#10b981]" });
      fetchTeamMembers();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Could not reactivate member.", variant: "destructive" });
    }
  };

  // --- Notification settings ---
  const [reportFrequency, setReportFrequency] = useState<"daily" | "weekly" | "monthly" | "disabled">("daily");
  const [sendTime, setSendTime] = useState("4:00 PM");
  const [sendDay, setSendDay] = useState("Monday");
  const [sendDate, setSendDate] = useState("1st of month");
  const [reportEmails, setReportEmails] = useState("admin@j2group.com.au");
  const [slackWebhook, setSlackWebhook] = useState("");
  const [sendDays, setSendDays] = useState<string[]>(["monday", "tuesday", "wednesday", "thursday", "friday"]);
  const [reportContent, setReportContent] = useState({
    campaignOverview: true,
    topPerformingClients: true,
    teamPerformance: true,
    sqlBookedMeetings: true,
    detailedActivityBreakdown: false,
    sqlNotifications: true,
    dailySummary: true,
    inactiveAlerts: true,
    weeklyReports: false,
    browserNotifications: true,
  });

  // --- Loading states ---
  const [isSavingNotifications, setIsSavingNotifications] = useState(false);
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);
  const [isSendingTestSlack, setIsSendingTestSlack] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(true);
  const [notificationSettingsId, setNotificationSettingsId] = useState<string | null>(null);

  // --- Load notification settings from Supabase ---
  const fetchNotificationSettings = useCallback(async () => {
    try {
      setLoadingNotifications(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setNotificationSettingsId(data.id);
        setReportFrequency((data.report_frequency as any) || "daily");
        setSendTime(data.send_time || "4:00 PM");
        setSendDay(data.send_day || "Monday");
        setSendDate(data.send_date || "1st of month");
        setReportEmails(data.report_emails || "admin@j2group.com.au");
        setSlackWebhook(data.slack_webhook_url || "");
        if (data.report_send_days && Array.isArray(data.report_send_days)) {
          setSendDays(data.report_send_days as string[]);
        }
        if (data.report_content && typeof data.report_content === 'object') {
          const rc = data.report_content as Record<string, boolean>;
          setReportContent({
            campaignOverview: rc.campaignOverview ?? true,
            topPerformingClients: rc.topPerformingClients ?? true,
            teamPerformance: rc.teamPerformance ?? true,
            sqlBookedMeetings: rc.sqlBookedMeetings ?? true,
            detailedActivityBreakdown: rc.detailedActivityBreakdown ?? false,
            sqlNotifications: rc.sqlNotifications ?? true,
            dailySummary: rc.dailySummary ?? true,
            inactiveAlerts: rc.inactiveAlerts ?? true,
            weeklyReports: rc.weeklyReports ?? false,
            browserNotifications: rc.browserNotifications ?? true,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching notification settings:', error);
    } finally {
      setLoadingNotifications(false);
    }
  }, []);

  useEffect(() => {
    fetchNotificationSettings();
  }, [fetchNotificationSettings]);

  // --- Client dialog ---
  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientRow | null>(null);
  const [clientForm, setClientForm] = useState({ client_name: "", client_id: "", email: "", campaign_start: "", campaign_end: "", target_sqls: "", logo_url: "", banner_url: "" });
  const [isSavingClient, setIsSavingClient] = useState(false);
  const [uploadingClientLogo, setUploadingClientLogo] = useState(false);
  const [uploadingClientBanner, setUploadingClientBanner] = useState(false);
  const clientLogoInputRef = useRef<HTMLInputElement>(null);
  const clientBannerInputRef = useRef<HTMLInputElement>(null);

  // --- Team dialog ---
  const [isTeamDialogOpen, setIsTeamDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMemberRow | null>(null);
  const [memberForm, setMemberForm] = useState({ sdr_name: "", email: "", role: "", profile_photo_url: "", client_id: "" });
  const [isSavingMember, setIsSavingMember] = useState(false);
  const [uploadingMemberPhoto, setUploadingMemberPhoto] = useState(false);
  const memberPhotoInputRef = useRef<HTMLInputElement>(null);

  // --- Client CRUD ---
  const handleAddClient = () => {
    setEditingClient(null);
    setClientForm({ client_name: "", client_id: "", email: "", campaign_start: "", campaign_end: "", target_sqls: "", logo_url: "", banner_url: "" });
    setIsClientDialogOpen(true);
  };

  const handleEditClient = (client: ClientRow) => {
    setEditingClient(client);
    setClientForm({
      client_name: client.client_name,
      client_id: client.client_id,
      email: client.email || "",
      campaign_start: client.campaign_start || "",
      campaign_end: client.campaign_end || "",
      target_sqls: client.target_sqls?.toString() || "",
      logo_url: client.logo_url || "",
      banner_url: client.banner_url || "",
    });
    setIsClientDialogOpen(true);
  };

  // Client logo upload
  const handleClientLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowedTypes = ["image/png", "image/jpeg", "image/svg+xml"];
    if (!allowedTypes.includes(file.type)) {
      toast({ title: "Invalid file type", description: "Please upload PNG, JPG, or SVG.", variant: "destructive" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 2MB allowed.", variant: "destructive" });
      return;
    }
    const clientId = clientForm.client_id || editingClient?.client_id || clientForm.client_name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 50);
    if (!clientId) {
      toast({ title: "Enter client name first", description: "Please enter a client name before uploading.", variant: "destructive" });
      return;
    }
    setUploadingClientLogo(true);
    try {
      const ext = file.name.split(".").pop();
      const filePath = `${clientId}-logo.${ext}`;
      await supabase.storage.from("client-assets").remove([filePath]);
      const { error: uploadError } = await supabase.storage.from("client-assets").upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("client-assets").getPublicUrl(filePath);
      const publicUrl = urlData.publicUrl + "?t=" + Date.now();
      // Update DB
      if (editingClient) {
        await supabase.from("clients").update({ logo_url: publicUrl }).eq("id", editingClient.id);
      }
      setClientForm(f => ({ ...f, logo_url: publicUrl }));
      toast({ title: "Logo uploaded", className: "border-[#10b981] text-[#10b981]" });
      fetchClients();
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploadingClientLogo(false);
      if (clientLogoInputRef.current) clientLogoInputRef.current.value = "";
    }
  };

  const handleRemoveClientLogo = async () => {
    if (editingClient) {
      await supabase.storage.from("client-assets").remove([`${editingClient.client_id}-logo.png`, `${editingClient.client_id}-logo.jpg`, `${editingClient.client_id}-logo.jpeg`, `${editingClient.client_id}-logo.svg`]);
      await supabase.from("clients").update({ logo_url: null }).eq("id", editingClient.id);
    }
    setClientForm(f => ({ ...f, logo_url: "" }));
    toast({ title: "Logo removed", className: "border-[#10b981] text-[#10b981]" });
    fetchClients();
  };

  // Client banner upload
  const handleClientBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowedTypes = ["image/png", "image/jpeg"];
    if (!allowedTypes.includes(file.type)) {
      toast({ title: "Invalid file type", description: "Please upload PNG or JPG.", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 5MB allowed.", variant: "destructive" });
      return;
    }
    const clientId = clientForm.client_id || editingClient?.client_id || clientForm.client_name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 50);
    if (!clientId) {
      toast({ title: "Enter client name first", description: "Please enter a client name before uploading.", variant: "destructive" });
      return;
    }
    setUploadingClientBanner(true);
    try {
      const ext = file.name.split(".").pop();
      const filePath = `${clientId}-banner.${ext}`;
      await supabase.storage.from("client-assets").remove([filePath]);
      const { error: uploadError } = await supabase.storage.from("client-assets").upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("client-assets").getPublicUrl(filePath);
      const publicUrl = urlData.publicUrl + "?t=" + Date.now();
      if (editingClient) {
        await supabase.from("clients").update({ banner_url: publicUrl }).eq("id", editingClient.id);
      }
      setEditingClient(prev => prev ? { ...prev, banner_url: publicUrl } : prev);
      setClientForm(f => ({ ...f, banner_url: publicUrl }));
      toast({ title: "Banner uploaded", className: "border-[#10b981] text-[#10b981]" });
      fetchClients();
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploadingClientBanner(false);
      if (clientBannerInputRef.current) clientBannerInputRef.current.value = "";
    }
  };

  const handleRemoveClientBanner = async () => {
    if (editingClient) {
      await supabase.storage.from("client-assets").remove([`${editingClient.client_id}-banner.png`, `${editingClient.client_id}-banner.jpg`, `${editingClient.client_id}-banner.jpeg`]);
      await supabase.from("clients").update({ banner_url: null }).eq("id", editingClient.id);
    }
    setEditingClient(prev => prev ? { ...prev, banner_url: null } : prev);
    setClientForm(f => ({ ...f, banner_url: "" }));
    toast({ title: "Banner removed", className: "border-[#10b981] text-[#10b981]" });
    fetchClients();
  };

  // Member photo upload
  const handleMemberPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowedTypes = ["image/png", "image/jpeg"];
    if (!allowedTypes.includes(file.type)) {
      toast({ title: "Invalid file type", description: "Please upload PNG or JPG.", variant: "destructive" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 2MB allowed.", variant: "destructive" });
      return;
    }
    if (!editingMember) {
      toast({ title: "Save member first", description: "Please save the member before uploading.", variant: "destructive" });
      return;
    }
    setUploadingMemberPhoto(true);
    try {
      const ext = file.name.split(".").pop();
      const filePath = `${editingMember.email.replace(/[^a-zA-Z0-9]/g, '_')}-photo.${ext}`;
      await supabase.storage.from("team-photos").remove([filePath]);
      const { error: uploadError } = await supabase.storage.from("team-photos").upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("team-photos").getPublicUrl(filePath);
      const publicUrl = urlData.publicUrl + "?t=" + Date.now();
      await supabase.from("team_members").update({ profile_photo_url: publicUrl }).eq("id", editingMember.id);
      setMemberForm(f => ({ ...f, profile_photo_url: publicUrl }));
      toast({ title: "Photo uploaded", className: "border-[#10b981] text-[#10b981]" });
      fetchTeamMembers();
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploadingMemberPhoto(false);
      if (memberPhotoInputRef.current) memberPhotoInputRef.current.value = "";
    }
  };

  const handleRemoveMemberPhoto = async () => {
    if (editingMember) {
      const emailKey = editingMember.email.replace(/[^a-zA-Z0-9]/g, '_');
      await supabase.storage.from("team-photos").remove([`${emailKey}-photo.png`, `${emailKey}-photo.jpg`, `${emailKey}-photo.jpeg`]);
      await supabase.from("team_members").update({ profile_photo_url: null }).eq("id", editingMember.id);
    }
    setMemberForm(f => ({ ...f, profile_photo_url: "" }));
    toast({ title: "Photo removed", className: "border-[#10b981] text-[#10b981]" });
    fetchTeamMembers();
  };

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const sanitizeText = (text: string) => text.trim().replace(/[<>]/g, '');

  const handleSaveClient = async () => {
    const name = sanitizeText(clientForm.client_name);
    if (!name || name.length < 2 || name.length > 100) {
      toast({ title: "Invalid client name", description: "Name must be 2-100 characters.", variant: "destructive" });
      return;
    }
    if (clientForm.target_sqls && (isNaN(parseInt(clientForm.target_sqls)) || parseInt(clientForm.target_sqls) < 0 || parseInt(clientForm.target_sqls) > 100000)) {
      toast({ title: "Invalid target", description: "Target SQLs must be 0-100,000.", variant: "destructive" });
      return;
    }
    setIsSavingClient(true);
    try {
      const slug = editingClient ? editingClient.client_id : name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 50);
      if (editingClient) {
        const { error } = await supabase
          .from('clients')
          .update({
            client_name: clientForm.client_name,
            campaign_start: clientForm.campaign_start || null,
            campaign_end: clientForm.campaign_end || null,
            target_sqls: clientForm.target_sqls ? parseInt(clientForm.target_sqls) : null,
            logo_url: clientForm.logo_url || null,
            banner_url: clientForm.banner_url || null,
          })
          .eq('id', editingClient.id);
        if (error) throw error;
        toast({ title: "Client updated", description: `${clientForm.client_name} has been updated.`, className: "border-[#10b981] text-[#10b981]" });
      } else {
        const { error } = await supabase
          .from('clients')
          .insert({
            client_name: clientForm.client_name,
            client_id: slug,
            campaign_start: clientForm.campaign_start || null,
            campaign_end: clientForm.campaign_end || null,
            target_sqls: clientForm.target_sqls ? parseInt(clientForm.target_sqls) : null,
            logo_url: clientForm.logo_url || null,
            banner_url: clientForm.banner_url || null,
          });
        if (error) throw error;
        toast({ title: "Client added", description: `${clientForm.client_name} has been added.`, className: "border-[#10b981] text-[#10b981]" });
      }
      setIsClientDialogOpen(false);
      fetchClients();
    } catch (error: any) {
      console.error('Error saving client:', error);
      toast({ title: "Error saving client", description: getSafeErrorMessage(error), variant: "destructive" });
    } finally {
      setIsSavingClient(false);
    }
  };

  const handleDeactivateClient = async (client: ClientRow) => {
    try {
      const { error } = await supabase
        .from('clients')
        .update({ status: 'inactive' })
        .eq('id', client.id);
      if (error) throw error;
      toast({ title: "Client deactivated", description: `Toggle 'Show inactive clients' to view ${client.client_name}.`, className: "border-orange-500" });
      fetchClients();
    } catch (error: any) {
      console.error('Error deactivating client:', error);
      toast({ title: "Error", description: getSafeErrorMessage(error), variant: "destructive" });
    }
  };

  // --- Team CRUD ---
  const handleAddMember = () => {
    setEditingMember(null);
    setMemberForm({ sdr_name: "", email: "", role: "", profile_photo_url: "", client_id: "" });
    setIsTeamDialogOpen(true);
  };

  const handleEditMember = (member: TeamMemberRow) => {
    setEditingMember(member);
    setMemberForm({ sdr_name: member.sdr_name, email: member.email, role: member.role || "", profile_photo_url: member.profile_photo_url || "", client_id: member.client_id || "" });
    setIsTeamDialogOpen(true);
  };

  const handleSaveMember = async () => {
    const name = sanitizeText(memberForm.sdr_name);
    if (!name || name.length < 2 || name.length > 100) {
      toast({ title: "Invalid name", description: "Name must be 2-100 characters.", variant: "destructive" });
      return;
    }
    if (!memberForm.email || !isValidEmail(memberForm.email)) {
      toast({ title: "Invalid email", description: "Please enter a valid email address.", variant: "destructive" });
      return;
    }
    if (memberForm.email.length > 255) {
      toast({ title: "Email too long", description: "Email must be under 255 characters.", variant: "destructive" });
      return;
    }
    if (!memberForm.role) {
      toast({ title: "Role required", description: "Please select a role.", variant: "destructive" });
      return;
    }
    setIsSavingMember(true);
    try {
      if (editingMember) {
        const { error } = await supabase
          .from('team_members')
          .update({
            sdr_name: memberForm.sdr_name,
            email: memberForm.email,
            role: memberForm.role,
            client_id: memberForm.client_id || null,
          })
          .eq('id', editingMember.id);
        if (error) throw error;
        toast({ title: "Team member updated", description: `${memberForm.sdr_name} has been updated.`, className: "border-[#10b981] text-[#10b981]" });
      } else {
        const { error } = await supabase
          .from('team_members')
          .insert({
            sdr_name: memberForm.sdr_name,
            email: memberForm.email,
            role: memberForm.role,
            client_id: memberForm.client_id || null,
          });
        if (error) throw error;
        toast({ title: "Team member added", description: `${memberForm.sdr_name} has been added.`, className: "border-[#10b981] text-[#10b981]" });
      }
      setIsTeamDialogOpen(false);
      fetchTeamMembers();
    } catch (error: any) {
      console.error('Error saving team member:', error);
      toast({ title: "Error saving team member", description: getSafeErrorMessage(error), variant: "destructive" });
    } finally {
      setIsSavingMember(false);
    }
  };

  const handleDeactivateMember = async (member: TeamMemberRow) => {
    try {
      const { error } = await supabase
        .from('team_members')
        .update({ status: 'inactive' })
        .eq('id', member.id);
      if (error) throw error;
      toast({ title: "Team member deactivated", description: `Toggle 'Show inactive team members' to view ${member.sdr_name}.`, className: "border-orange-500" });
      fetchTeamMembers();
    } catch (error: any) {
      console.error('Error deactivating team member:', error);
      toast({ title: "Error", description: getSafeErrorMessage(error), variant: "destructive" });
    }
  };

  // --- Notification handlers ---
  const handleSaveNotifications = async () => {
    setIsSavingNotifications(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const payload = {
        user_id: user.id,
        report_frequency: reportFrequency,
        send_time: sendTime,
        send_day: sendDay,
        send_date: sendDate,
        report_emails: reportEmails,
        slack_webhook_url: slackWebhook || null,
        report_send_days: sendDays,
        report_content: reportContent,
        updated_at: new Date().toISOString(),
      };

      let error;
      if (notificationSettingsId) {
        ({ error } = await supabase
          .from('notification_settings')
          .update(payload)
          .eq('id', notificationSettingsId));
      } else {
        const result = await supabase
          .from('notification_settings')
          .insert(payload)
          .select('id')
          .single();
        error = result.error;
        if (result.data) setNotificationSettingsId(result.data.id);
      }

      if (error) throw error;
      toast({ title: "Notification settings saved", description: "Your notification preferences have been updated.", className: "border-[#10b981] text-[#10b981]" });
    } catch (error: any) {
      console.error('Error saving notification settings:', error);
      toast({ title: "Error saving settings", description: getSafeErrorMessage(error), variant: "destructive" });
    } finally {
      setIsSavingNotifications(false);
    }
  };

  const handleSendTestEmail = async () => {
    setIsSendingTestEmail(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsSendingTestEmail(false);
    toast({ title: "Test email sent", description: `A test report has been sent to ${reportEmails}`, className: "border-[#10b981] text-[#10b981]" });
  };

  const handleSendTestSlack = async () => {
    if (!slackWebhook) {
      toast({ title: "No webhook URL", description: "Please enter a Slack webhook URL first.", variant: "destructive" });
      return;
    }
    setIsSendingTestSlack(true);
    try {
      const success = await sendSlackNotification(slackWebhook, formatTestMessage());
      if (success) {
        toast({ title: "Test notification sent", description: "Check your Slack channel for the test message.", className: "border-[#10b981] text-[#10b981]" });
      } else {
        toast({ title: "Failed to send", description: "Check that your webhook URL is valid.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Could not send test notification.", variant: "destructive" });
    } finally {
      setIsSendingTestSlack(false);
    }
  };

  const TableSkeletonRows = () => (
    <>
      {[...Array(4)].map((_, i) => (
        <TableRow key={i} className="border-border/50">
          <TableCell><Skeleton className="h-5 w-32" /></TableCell>
          <TableCell><Skeleton className="h-5 w-40" /></TableCell>
          <TableCell><Skeleton className="h-5 w-20" /></TableCell>
          <TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
        </TableRow>
      ))}
    </>
  );

  // FIX 4: Role loading guard
  if (roleLoading) {
    return <div />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
        <p className="text-muted-foreground">Manage your dashboard configuration and preferences</p>
      </div>

      <Tabs defaultValue="clients" className="space-y-6">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="clients" className="gap-2 data-[state=active]:bg-[#0f172a] data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-[#0f172a]">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Client Management</span>
            <span className="sm:hidden">Clients</span>
          </TabsTrigger>
          <TabsTrigger value="team" className="gap-2 data-[state=active]:bg-[#0f172a] data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-[#0f172a]">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Team Members</span>
            <span className="sm:hidden">Team</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2 data-[state=active]:bg-[#0f172a] data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-[#0f172a]">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Notifications</span>
            <span className="sm:hidden">Alerts</span>
          </TabsTrigger>
        </TabsList>

        {/* Client Management Tab */}
        <TabsContent value="clients" className="space-y-4">
          <Card className="bg-card/50 backdrop-blur-sm border-border">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div className="flex flex-col space-y-1.5">
                <CardTitle className="text-left">Client Management</CardTitle>
                <CardDescription className="text-left">Add, edit, or remove client accounts</CardDescription>
              </div>
              <div className="flex-shrink-0">
                <Dialog open={isClientDialogOpen} onOpenChange={setIsClientDialogOpen}>
                  {canEditClients ? (
                    <DialogTrigger asChild>
                      <Button onClick={handleAddClient} className="gap-2 bg-[#0f172a] text-white hover:bg-[#1e293b] dark:bg-white dark:text-[#0f172a] dark:hover:bg-gray-100">
                        <Plus className="h-4 w-4" />
                        Add New Client
                      </Button>
                    </DialogTrigger>
                  ) : (
                    <p className="text-sm text-muted-foreground">👮 Contact your administrator to manage clients</p>
                  )}
                  <DialogContent className="bg-card border-border sm:max-w-[525px] max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{editingClient ? "Edit Client" : "Add New Client"}</DialogTitle>
                      <DialogDescription>
                        {editingClient ? "Update client information below" : "Enter the details for the new client"}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="client-name">Client Name *</Label>
                        <Input
                          id="client-name"
                          placeholder="e.g., Acme Corporation"
                          value={clientForm.client_name}
                          onChange={(e) => setClientForm({ ...clientForm, client_name: e.target.value })}
                          className="bg-background/50 border-border"
                        />
                      </div>
                      {editingClient && (
                        <div className="grid gap-2">
                          <Label htmlFor="client-id">Client ID</Label>
                          <Input
                            id="client-id"
                            value={clientForm.client_id}
                            disabled
                            className="bg-muted/30 border-border text-muted-foreground cursor-not-allowed"
                          />
                          <p className="text-xs text-muted-foreground">Auto-generated, cannot be changed</p>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="campaign-start">Campaign Start</Label>
                          <Input
                            id="campaign-start"
                            type="date"
                            value={clientForm.campaign_start}
                            onChange={(e) => setClientForm({ ...clientForm, campaign_start: e.target.value })}
                            className="bg-background/50 border-border"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="campaign-end">Campaign End</Label>
                          <Input
                            id="campaign-end"
                            type="date"
                            value={clientForm.campaign_end}
                            onChange={(e) => setClientForm({ ...clientForm, campaign_end: e.target.value })}
                            className="bg-background/50 border-border"
                          />
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="target-sqls">Target SQLs</Label>
                        <Input
                          id="target-sqls"
                          type="number"
                          placeholder="e.g., 50"
                          value={clientForm.target_sqls}
                          onChange={(e) => setClientForm({ ...clientForm, target_sqls: e.target.value })}
                          className="bg-background/50 border-border"
                        />
                      </div>

                      {/* Client Logo Upload */}
                      <div className="grid gap-2 border-t border-border pt-4">
                        <Label>Client Logo</Label>
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 rounded-full bg-muted/30 border border-border flex items-center justify-center overflow-hidden">
                            {clientForm.logo_url ? (
                              <img src={clientForm.logo_url} alt="Client logo" className="w-full h-full object-contain" />
                            ) : (
                              <Building2 className="h-6 w-6 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex flex-col gap-2">
                            <input ref={clientLogoInputRef} type="file" accept=".png,.jpg,.jpeg,.svg" onChange={handleClientLogoUpload} className="hidden" />
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" onClick={() => clientLogoInputRef.current?.click()} disabled={uploadingClientLogo || (!editingClient && !clientForm.client_name)} className="gap-1.5 text-xs text-blue-500 border-blue-500/30 hover:bg-blue-500/10">
                                {uploadingClientLogo ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                                Upload Logo
                              </Button>
                              {clientForm.logo_url && (
                                <Button variant="outline" size="sm" onClick={handleRemoveClientLogo} className="gap-1.5 text-xs text-destructive border-destructive/30 hover:bg-destructive/10">
                                  <Trash2 className="h-3 w-3" />
                                  Remove
                                </Button>
                              )}
                            </div>
                            <p className="text-[10px] text-muted-foreground">PNG, JPG, SVG • Max 2MB</p>
                          </div>
                        </div>
                      </div>

                      {/* Client Banner Upload */}
                      <div className="grid gap-2 border-t border-border pt-4">
                        <Label>Banner Image</Label>
                        <div className="space-y-3">
                          <div className="w-full h-[100px] rounded-lg bg-muted/30 border border-border overflow-hidden">
                            {(clientForm.banner_url || editingClient?.banner_url) ? (
                              <img src={clientForm.banner_url || editingClient?.banner_url || ''} alt="Client banner" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                                No banner image
                              </div>
                            )}
                          </div>
                          <input ref={clientBannerInputRef} type="file" accept=".png,.jpg,.jpeg" onChange={handleClientBannerUpload} className="hidden" />
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => clientBannerInputRef.current?.click()} disabled={uploadingClientBanner || (!editingClient && !clientForm.client_name)} className="gap-1.5 text-xs text-blue-500 border-blue-500/30 hover:bg-blue-500/10">
                              {uploadingClientBanner ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                              Upload Banner
                            </Button>
                            {(clientForm.banner_url || editingClient?.banner_url) && (
                              <Button variant="outline" size="sm" onClick={handleRemoveClientBanner} className="gap-1.5 text-xs text-destructive border-destructive/30 hover:bg-destructive/10">
                                <Trash2 className="h-3 w-3" />
                                Remove
                              </Button>
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground">PNG, JPG • Max 5MB • Recommended: 1200×300px</p>
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <button onClick={() => setIsClientDialogOpen(false)} style={{ border: '1px solid #94a3b8', backgroundColor: 'transparent', color: 'inherit', padding: '8px 16px', borderRadius: '6px', fontSize: '14px', cursor: 'pointer' }}>Cancel</button>
                      <Button
                        onClick={handleSaveClient}
                        disabled={!clientForm.client_name || isSavingClient}
                        className="bg-[#0f172a] text-white hover:bg-[#1e293b] dark:bg-white dark:text-[#0f172a] dark:hover:bg-gray-100"
                        style={{ backgroundColor: '#0f172a', color: 'white' }}
                      >
                        {isSavingClient ? (
                          <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving...</>
                        ) : (
                          editingClient ? "Update Client" : "Add Client"
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-4">
                <Switch
                  id="show-inactive-clients"
                  checked={showInactiveClients}
                  onCheckedChange={setShowInactiveClients}
                  className="data-[state=checked]:bg-[#10b981]"
                />
                <Label htmlFor="show-inactive-clients" className="text-sm text-muted-foreground cursor-pointer">
                  Show inactive clients
                </Label>
              </div>
              <div className="overflow-x-auto scrollbar-thin scroll-gradient">
                <TooltipProvider>
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50 dark:!bg-[#1e293b]" style={{ backgroundColor: '#f1f5f9' }}>
                      <TableHead className="px-4 py-2 font-bold text-[#0f172a] dark:text-[#f1f5f9]">Client</TableHead>
                      <TableHead className="px-4 py-2 font-bold text-[#0f172a] dark:text-[#f1f5f9]">Primary Contact</TableHead>
                      <TableHead className="px-4 py-2 font-bold text-[#0f172a] dark:text-[#f1f5f9]">Campaign Period</TableHead>
                      <TableHead className="px-4 py-2 font-bold text-[#0f172a] dark:text-[#f1f5f9]">Campaign Status</TableHead>
                      <TableHead className="px-4 py-2 font-bold text-[#0f172a] dark:text-[#f1f5f9]">Days Left</TableHead>
                      <TableHead className="px-4 py-2 font-bold text-[#0f172a] dark:text-[#f1f5f9] text-left">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingClients ? (
                      <TableSkeletonRows />
                    ) : filteredClients.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No clients found. Add your first client above.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredClients.map((client) => {
                        const isInactive = client.status === 'inactive';
                        const gradient = getHashColor(client.client_name);
                        const primary = primaryContacts[client.client_id];
                        const campaignStatus = getCampaignStatus(client);
                        const daysLeft = getDaysLeft(client);

                        return (
                          <TableRow key={client.id} className={`border-border/50 hover:bg-muted/20 transition-colors ${isInactive ? 'opacity-50' : ''}`}>
                            {/* CLIENT */}
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="relative flex-shrink-0">
                                  {client.logo_url ? (
                                    <img src={client.logo_url} alt={client.client_name} className="w-8 h-8 rounded-full object-contain bg-white" />
                                  ) : (
                                    <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                                      <span className="text-xs font-bold text-white">{getInitials(client.client_name)}</span>
                                    </div>
                                  )}
                                </div>
                                <span className="font-medium text-foreground whitespace-nowrap">{client.client_name}</span>
                              </div>
                            </TableCell>

                            {/* PRIMARY CONTACT */}
                            <TableCell>
                              {primary ? (
                                <div className="flex items-center gap-2">
                                  <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${getHashColor(primary.contact_name)} flex items-center justify-center flex-shrink-0`}>
                                    <span className="text-[9px] font-bold text-white">{getInitials(primary.contact_name)}</span>
                                  </div>
                                  <span className="text-sm text-foreground">{primary.contact_name}</span>
                                </div>
                              ) : (
                                <span className="text-sm text-muted-foreground italic">No primary set</span>
                              )}
                            </TableCell>

                            {/* CAMPAIGN PERIOD */}
                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                              {formatCampaignPeriod(client.campaign_start, client.campaign_end)}
                            </TableCell>

                            {/* CAMPAIGN STATUS */}
                            <TableCell>
                              {campaignStatus ? (
                                <Badge className={`${campaignStatus.color} hover:${campaignStatus.color} gap-1.5`}>
                                  {(campaignStatus as any).dot && (
                                    <span className={`w-1.5 h-1.5 rounded-full ${(campaignStatus as any).dot}`} />
                                  )}
                                  {campaignStatus.label}
                                </Badge>
                              ) : (
                                <span className="text-sm text-muted-foreground">—</span>
                              )}
                            </TableCell>

                            {/* DAYS LEFT */}
                            <TableCell className="text-sm text-muted-foreground">{daysLeft}</TableCell>

                            {/* ACTIONS */}
                            <TableCell className="text-right">
                              {canEditClients ? (
                                <div className="flex justify-end items-center gap-1">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500 hover:text-blue-400 hover:bg-blue-500/10" onClick={() => handleEditClient(client)} aria-label={`Edit ${client.client_name}`}>
                                        <Home className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Edit client</TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-purple-500 hover:text-purple-400 hover:bg-purple-500/10" onClick={() => setContactsModalClient(client)} aria-label={`Manage contacts for ${client.client_name}`}>
                                        <Users className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Manage contacts</TooltipContent>
                                  </Tooltip>
                                  <div className="mx-0.5" style={{ width: '1px', height: '20px', backgroundColor: '#e2e8f0', flexShrink: 0 }} />
                                  {isInactive ? (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10" onClick={() => handleReactivateClient(client)} aria-label={`Reactivate ${client.client_name}`}>
                                          <CheckCircle className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Reactivate</TooltipContent>
                                    </Tooltip>
                                  ) : (
                                    <AlertDialog>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-orange-500 hover:text-orange-400 hover:bg-orange-500/10" aria-label={`Deactivate ${client.client_name}`}>
                                              <MinusCircle className="h-4 w-4" />
                                            </Button>
                                          </AlertDialogTrigger>
                                        </TooltipTrigger>
                                        <TooltipContent>Deactivate</TooltipContent>
                                      </Tooltip>
                                      <AlertDialogContent className="bg-card border-border">
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Deactivate Client?</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            This will hide <span className="font-medium text-foreground">{client.client_name}</span> from the active list. You can reactivate them anytime by toggling "Show inactive clients".
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                                          <AlertDialogAction onClick={() => handleDeactivateClient(client)} className="bg-orange-600 hover:bg-orange-700 text-white rounded-md">
                                            Deactivate
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">View only</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
                </TooltipProvider>
              </div>

              {/* Contacts Modal */}
              {contactsModalClient && (
                <ClientContactsModal
                  client={{
                    client_id: contactsModalClient.client_id,
                    client_name: contactsModalClient.client_name,
                    logo_url: contactsModalClient.logo_url,
                    campaign_end: contactsModalClient.campaign_end,
                  }}
                  open={!!contactsModalClient}
                  onClose={() => setContactsModalClient(null)}
                  onContactsChanged={fetchPrimaryContacts}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team Members Tab */}
        <TabsContent value="team" className="space-y-4">
          <Card className="bg-card/50 backdrop-blur-sm border-border">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div className="flex flex-col space-y-1.5">
                <CardTitle className="text-left">Team Members</CardTitle>
                <CardDescription className="text-left">Manage SDR team members and their roles</CardDescription>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search by name or client..."
                    value={teamSearch}
                    onChange={e => {
                      setTeamSearch(e.target.value);
                      setTeamPage(1);
                    }}
                    className="pl-9 pr-4 py-2 text-sm border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#0f172a]/20 dark:focus:ring-white/20 w-64"
                  />
                </div>
                <Dialog open={isTeamDialogOpen} onOpenChange={setIsTeamDialogOpen}>
                  {canEditTeamMembers ? (
                    <DialogTrigger asChild>
                      <Button onClick={handleAddMember} className="gap-2 bg-[#0f172a] text-white hover:bg-[#1e293b] dark:bg-white dark:text-[#0f172a] dark:hover:bg-gray-100">
                        <Plus className="h-4 w-4" />
                        Add Team Member
                      </Button>
                    </DialogTrigger>
                  ) : (
                    <p className="text-sm text-muted-foreground">👮 Contact your administrator to manage team members</p>
                  )}
                  <DialogContent className="bg-card border-border sm:max-w-[525px]">
                    <DialogHeader>
                      <DialogTitle>{editingMember ? "Edit Team Member" : "Add Team Member"}</DialogTitle>
                      <DialogDescription>
                        {editingMember ? "Update team member information" : "Enter the details for the new team member"}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      {/* Profile Photo Upload */}
                      {editingMember && (
                        <div className="grid gap-2">
                          <Label>Profile Photo</Label>
                          <div className="flex items-center gap-4">
                            <SDRAvatar name={memberForm.sdr_name || "?"} photoUrl={memberForm.profile_photo_url || null} size="lg" />
                            <div className="flex flex-col gap-2">
                              <input ref={memberPhotoInputRef} type="file" accept=".png,.jpg,.jpeg" onChange={handleMemberPhotoUpload} className="hidden" />
                              <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => memberPhotoInputRef.current?.click()} disabled={uploadingMemberPhoto} className="gap-1.5 text-xs text-blue-500 border-blue-500/30 hover:bg-blue-500/10">
                                  {uploadingMemberPhoto ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                                  Upload Photo
                                </Button>
                                {memberForm.profile_photo_url && (
                                  <Button variant="outline" size="sm" onClick={handleRemoveMemberPhoto} className="gap-1.5 text-xs text-destructive border-destructive/30 hover:bg-destructive/10">
                                    <Trash2 className="h-3 w-3" />
                                    Remove
                                  </Button>
                                )}
                              </div>
                              <p className="text-[10px] text-muted-foreground">PNG, JPG • Max 2MB</p>
                            </div>
                          </div>
                        </div>
                      )}
                      <div className="grid gap-2">
                        <Label htmlFor="member-name">Full Name *</Label>
                        <Input
                          id="member-name"
                          placeholder="e.g., John Smith"
                          value={memberForm.sdr_name}
                          onChange={(e) => setMemberForm({ ...memberForm, sdr_name: e.target.value })}
                          className="bg-background/50 border-border"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="member-email">Email Address *</Label>
                        <div className="flex gap-2">
                          <Input
                            id="member-email"
                            type="email"
                            placeholder="john.smith@j2group.com.au"
                            value={memberForm.email}
                            onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })}
                            className="bg-background/50 border-border flex-1"
                          />
                          {memberForm.email && isValidEmail(memberForm.email) && editingMember && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSendInvite(memberForm.email, 'sdr', memberForm.sdr_name)}
                              disabled={memberInviteStatus[memberForm.email] === 'sending'}
                              className="gap-1.5 shrink-0 bg-[#0f172a] text-white hover:bg-[#1e293b] dark:bg-[#3b82f6] dark:hover:bg-[#2563eb] dark:text-white"
                            >
                              {memberInviteStatus[memberForm.email] === 'sending' ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : memberInviteStatus[memberForm.email] === 'sent' ? (
                                <>✓ Invite Sent</>
                              ) : (
                                <><Mail className="h-3.5 w-3.5" />Send Invite</>
                              )}
                            </Button>
                          )}
                        </div>
                        {memberInviteStatus[memberForm.email] === 'sent' && (
                          <p className="text-xs text-green-500">Invite sent successfully!</p>
                        )}
                        {memberInviteStatus[memberForm.email] === 'error' && (
                          <p className="text-xs text-destructive">Failed to send invite. Try again.</p>
                        )}
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="member-role">Role *</Label>
                        <Select value={memberForm.role} onValueChange={(value) => setMemberForm({ ...memberForm, role: value, client_id: value === 'SDR' ? memberForm.client_id : '' })}>
                          <SelectTrigger className="bg-background/50 border-border">
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Admin">Admin</SelectItem>
                            <SelectItem value="Manager">Manager</SelectItem>
                            <SelectItem value="SDR">SDR</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {/* Assigned Client dropdown - only for SDR role */}
                      {memberForm.role === 'SDR' && (
                        <div className="grid gap-2">
                          <Label htmlFor="member-client">Assigned Client</Label>
                          <Select value={memberForm.client_id} onValueChange={(value) => setMemberForm({ ...memberForm, client_id: value === '__none__' ? '' : value })}>
                            <SelectTrigger className="bg-background/50 border-border">
                              <SelectValue placeholder="Select a client" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">None</SelectItem>
                              {clientsList.map((c) => (
                                <SelectItem key={c.client_id} value={c.client_id}>{c.client_name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                    <DialogFooter>
                      <button
                        onClick={() => setIsTeamDialogOpen(false)}
                        style={{
                          border: '1px solid #94a3b8',
                          backgroundColor: 'transparent',
                          color: 'inherit',
                          padding: '8px 16px',
                          borderRadius: '6px',
                          fontSize: '14px',
                          cursor: 'pointer'
                        }}
                      >
                        Cancel
                      </button>
                      <Button
                        onClick={handleSaveMember}
                        disabled={!memberForm.sdr_name || !memberForm.email || !memberForm.role || isSavingMember}
                        className="bg-[#0f172a] text-white hover:bg-[#1e293b] dark:bg-white dark:text-[#0f172a] dark:hover:bg-gray-100"
                        style={{ backgroundColor: '#0f172a', color: 'white' }}
                      >
                        {isSavingMember ? (
                          <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving...</>
                        ) : (
                          editingMember ? "Update Member" : "Add Member"
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-4">
                <Switch
                  id="show-inactive-members"
                  checked={showInactiveMembers}
                  onCheckedChange={(checked) => { setShowInactiveMembers(checked); setTeamPage(1); }}
                  className="data-[state=checked]:bg-[#10b981]"
                />
                <Label htmlFor="show-inactive-members" className="text-sm text-muted-foreground cursor-pointer">
                  Show inactive team members
                </Label>
              </div>
              <div className="overflow-x-auto scrollbar-thin">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50 dark:!bg-[#1e293b]" style={{ backgroundColor: '#f1f5f9' }}>
                      <TableHead className="px-4 py-2 font-bold text-[#0f172a] dark:text-[#f1f5f9] cursor-pointer hover:bg-muted/30 select-none" onClick={() => handleTeamSort('sdr_name')}>
                        <span className="flex items-center">Name<SortIcon field="sdr_name" current={teamSortField} dir={teamSortDir} /></span>
                      </TableHead>
                      <TableHead className="px-4 py-2 font-bold text-[#0f172a] dark:text-[#f1f5f9] cursor-pointer hover:bg-muted/30 select-none" onClick={() => handleTeamSort('email')}>
                        <span className="flex items-center">Email<SortIcon field="email" current={teamSortField} dir={teamSortDir} /></span>
                      </TableHead>
                      <TableHead className="px-4 py-2 font-bold text-[#0f172a] dark:text-[#f1f5f9] cursor-pointer hover:bg-muted/30 select-none" onClick={() => handleTeamSort('role')}>
                        <span className="flex items-center">Role<SortIcon field="role" current={teamSortField} dir={teamSortDir} /></span>
                      </TableHead>
                      <TableHead className="px-4 py-2 font-bold text-[#0f172a] dark:text-[#f1f5f9] cursor-pointer hover:bg-muted/30 select-none" onClick={() => handleTeamSort('client')}>
                        <span className="flex items-center">Assigned Client<SortIcon field="client" current={teamSortField} dir={teamSortDir} /></span>
                      </TableHead>
                      <TableHead className="px-4 py-2 font-bold text-[#0f172a] dark:text-[#f1f5f9] cursor-pointer hover:bg-muted/30 select-none" onClick={() => handleTeamSort('login_status')}>
                        <span className="flex items-center">Login Status<SortIcon field="login_status" current={teamSortField} dir={teamSortDir} /></span>
                      </TableHead>
                      <TableHead className="px-4 py-2 font-bold text-[#0f172a] dark:text-[#f1f5f9] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingTeam ? (
                      <TableSkeletonRows />
                    ) : sortedMembers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No team members found. Add your first team member above.
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedMembers.map((member) => {
                        const isInactive = member.status === 'inactive';
                        const memberInviteInfo = getMemberInviteInfo(member.email);
                        const memberClientName = member.client_id && member.role?.toLowerCase() === 'sdr'
                          ? clientsList.find(c => c.client_id === member.client_id)?.client_name || member.client_id
                          : '—';
                        return (
                          <TableRow key={member.id} className={`border-border/50 hover:bg-muted/20 transition-colors ${isInactive ? 'opacity-50' : ''}`}>
                            <TableCell className="font-medium text-foreground">
                              <div className="flex items-center gap-2">
                                <SDRAvatar name={member.sdr_name} photoUrl={member.profile_photo_url} size="sm" />
                                {member.sdr_name}
                                {isInactive && (
                                  <Badge className="text-[10px] bg-destructive/20 text-destructive border-destructive/30 hover:bg-destructive/20 uppercase">Inactive</Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{member.email}</TableCell>
                            <TableCell className="text-muted-foreground">{member.role || "—"}</TableCell>
                            <TableCell className="text-muted-foreground">{memberClientName}</TableCell>
                            <TableCell>
                              <Badge className={
                                memberInviteInfo.status === 'active' 
                                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20' :
                                memberInviteInfo.status === 'pending' 
                                  ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20' :
                                memberInviteInfo.status === 'expired' 
                                  ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/20' :
                                  'bg-muted/50 text-muted-foreground border-border hover:bg-muted/50'
                              }>
                                {memberInviteInfo.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {canEditTeamMembers ? (
                              <TooltipProvider>
                                <div className="flex justify-end items-center gap-2">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500 hover:text-blue-400 hover:bg-blue-500/10" onClick={() => handleEditMember(member)} aria-label={`Edit ${member.sdr_name}`}>
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Edit</TooltipContent>
                                  </Tooltip>
                                  {memberInviteInfo.status === 'pending' && member.email && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 text-amber-500 hover:text-amber-400 hover:bg-amber-500/10"
                                          onClick={() => handleResendInvite(member.email, 'member', member.sdr_name)}
                                          aria-label={`Resend invite to ${member.sdr_name}`}
                                        >
                                          <RefreshCw className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Resend Invite</TooltipContent>
                                    </Tooltip>
                                  )}
                                  <div className="mx-0.5" style={{ width: '1px', height: '20px', backgroundColor: '#e2e8f0', flexShrink: 0 }} />
                                  {isInactive ? (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10"
                                          onClick={() => handleReactivateMember(member)}
                                          aria-label={`Reactivate ${member.sdr_name}`}
                                        >
                                          <CheckCircle className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Reactivate</TooltipContent>
                                    </Tooltip>
                                  ) : (
                                    <AlertDialog>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-orange-500 dark:text-orange-400 hover:text-orange-400 hover:bg-orange-500/10" aria-label={`Deactivate ${member.sdr_name}`}>
                                              <MinusCircle className="h-4 w-4" />
                                            </Button>
                                          </AlertDialogTrigger>
                                        </TooltipTrigger>
                                        <TooltipContent>Deactivate</TooltipContent>
                                      </Tooltip>
                                      <AlertDialogContent className="bg-card border-border">
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Deactivate Team Member?</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            This will hide <span className="font-medium text-foreground">{member.sdr_name}</span> from the active list. You can reactivate them anytime by toggling "Show inactive team members".
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                                          <AlertDialogAction onClick={() => handleDeactivateMember(member)} className="bg-orange-600 hover:bg-orange-700 text-white">
                                            Deactivate
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  )}
                                </div>
                              </TooltipProvider>
                              ) : (
                                <span className="text-xs text-muted-foreground">View only</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
                {totalTeamPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-border mt-2">
                    <p className="text-sm text-muted-foreground">
                      Showing {((teamPage - 1) * TEAM_PAGE_SIZE) + 1}–{Math.min(teamPage * TEAM_PAGE_SIZE, sortedMembers.length)} of {sortedMembers.length} members
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setTeamPage(p => Math.max(1, p - 1))}
                        disabled={teamPage === 1}
                        className="h-8 px-3 text-xs border border-border hover:bg-muted/20"
                      >
                        Previous
                      </Button>
                      <span className="text-sm text-muted-foreground font-medium">
                        {teamPage} / {totalTeamPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setTeamPage(p => Math.min(totalTeamPages, p + 1))}
                        disabled={teamPage === totalTeamPages}
                        className="h-8 px-3 text-xs border border-border hover:bg-muted/20"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          {/* ===== EMAIL REPORTS SECTION ===== */}
          <div className="bg-[#e2e8f0] dark:bg-[#1e293b] px-4 py-3 rounded-md mb-6">
            <p className="text-sm font-bold text-[#0f172a] dark:text-[#f1f5f9]">Email Reports Configuration</p>
            <p className="text-xs text-muted-foreground mt-0.5">Configure automated email report settings</p>
          </div>

          {loadingNotifications ? (
            <div className="space-y-4">
              <Skeleton className="h-6 w-40" />
              <div className="flex gap-4">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-5 w-20" />)}
              </div>
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-6 w-32" />
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-5 w-64" />)}
              </div>
              <Skeleton className="h-10 w-32" />
            </div>
          ) : (
            <div className="space-y-5">
              {/* Report Frequency + Send Time side by side */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-base font-medium">Report Frequency</Label>
                  <Select value={reportFrequency} onValueChange={(value) => setReportFrequency(value as "daily" | "weekly" | "monthly" | "disabled")}>
                    <SelectTrigger className="bg-background/50 border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="disabled">Disabled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {reportFrequency !== "disabled" && (
                  <div className="space-y-2">
                    <Label className="text-base font-medium">Send Time</Label>
                    <Select value={sendTime} onValueChange={setSendTime}>
                      <SelectTrigger className="bg-background/50 border-border"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["6:00 AM", "9:00 AM", "12:00 PM", "3:00 PM", "4:00 PM", "6:00 PM", "9:00 PM"].map(t => (
                          <SelectItem key={t} value={t}>{t} AEDT</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Weekly: Send Day */}
              {reportFrequency === "weekly" && (
                <div className="space-y-3 animate-fade-in">
                  <div className="grid gap-2">
                    <Label htmlFor="send-day">Send Day</Label>
                    <Select value={sendDay} onValueChange={setSendDay}>
                      <SelectTrigger id="send-day" className="bg-background/50 border-border"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map(d => (
                          <SelectItem key={d} value={d}>{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Reports sent every {sendDay} at {sendTime} AEDT</p>
                  </div>
                </div>
              )}

              {/* Monthly: Send Date */}
              {reportFrequency === "monthly" && (
                <div className="space-y-3 animate-fade-in">
                  <div className="grid gap-2">
                    <Label htmlFor="send-date">Send On</Label>
                    <Select value={sendDate} onValueChange={setSendDate}>
                      <SelectTrigger id="send-date" className="bg-background/50 border-border"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["1st of month", "5th of month", "10th of month", "15th of month", "20th of month", "25th of month", "Last day of month"].map(d => (
                          <SelectItem key={d} value={d}>{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Reports sent on the {sendDate} at {sendTime} AEDT</p>
                  </div>
                </div>
              )}

              {reportFrequency === "disabled" && (
                <div className="rounded-md bg-muted/20 p-4 animate-fade-in">
                  <p className="text-sm text-muted-foreground">
                    Automated reports are disabled. You can still export reports manually from the dashboard.
                  </p>
                </div>
              )}

              {/* Active Days */}
              {reportFrequency !== "disabled" && (
                <div className="grid gap-2 animate-fade-in">
                  <Label>Active Days</Label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: "monday", label: "Mon" },
                      { value: "tuesday", label: "Tue" },
                      { value: "wednesday", label: "Wed" },
                      { value: "thursday", label: "Thu" },
                      { value: "friday", label: "Fri" },
                      { value: "saturday", label: "Sat" },
                      { value: "sunday", label: "Sun" },
                    ].map(({ value, label }) => (
                      <span
                        key={value}
                        onClick={() => {
                          if (sendDays.includes(value)) {
                            setSendDays(prev => prev.filter(d => d !== value));
                          } else {
                            setSendDays(prev => [...prev, value]);
                          }
                        }}
                        className={sendDays.includes(value)
                          ? "px-3 py-1.5 rounded-md text-sm font-medium cursor-pointer transition-colors"
                          : "px-3 py-1.5 rounded-md text-sm font-medium cursor-pointer transition-colors border border-border bg-transparent text-foreground hover:bg-muted/20"
                        }
                        style={sendDays.includes(value)
                          ? isDark
                            ? { backgroundColor: 'white', color: '#0f172a' }
                            : { backgroundColor: '#0f172a', color: 'white' }
                          : undefined
                        }
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">Reports will only be sent on selected days</p>
                </div>
              )}

              {/* Email Recipients */}
              <div className="grid gap-2">
                <Label htmlFor="report-emails">Email Recipients</Label>
                <Input
                  id="report-emails"
                  type="email"
                  placeholder="admin@j2group.com.au, manager@j2group.com.au"
                  value={reportEmails}
                  onChange={(e) => setReportEmails(e.target.value)}
                  className={`bg-background/50 border-border transition-opacity ${reportFrequency === "disabled" ? "opacity-50" : ""}`}
                  disabled={reportFrequency === "disabled"}
                />
                <p className="text-xs text-muted-foreground">Separate multiple emails with commas</p>
              </div>

              {/* Include in Report toggles */}
              {reportFrequency !== "disabled" && (
                <div className="space-y-3 animate-fade-in">
                  <Label className="text-base font-medium">Include in Report:</Label>
                  <div className="space-y-1">
                    {[
                      { key: "campaignOverview", label: "Campaign Overview (KPIs across all clients)" },
                      { key: "topPerformingClients", label: "Top Performing Clients" },
                      { key: "teamPerformance", label: "Team Performance Summary" },
                      { key: "sqlBookedMeetings", label: "SQL Booked Meetings" },
                      { key: "detailedActivityBreakdown", label: "Detailed Activity Breakdown" },
                    ].map(({ key, label }) => (
                      <div key={key} className="flex items-center gap-3 py-2">
                        <Switch
                          id={key}
                          checked={reportContent[key as keyof typeof reportContent]}
                          onCheckedChange={(checked) =>
                            setReportContent({ ...reportContent, [key]: checked as boolean })
                          }
                          className="data-[state=checked]:bg-[#10b981] shrink-0"
                        />
                        <div>
                          <span className="text-sm font-medium text-foreground">{label}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 mt-4">
                <Button variant="outline" onClick={handleSendTestEmail} className="gap-2 border-border dark:border-white/20 dark:text-white" disabled={reportFrequency === "disabled" || isSendingTestEmail || !canEditSettings}>
                  {isSendingTestEmail ? (<><Loader2 className="h-4 w-4 animate-spin" />Sending...</>) : (<><Send className="h-4 w-4" />Send Test Email</>)}
                </Button>
                <Button onClick={handleSaveNotifications} className="gap-2 bg-[#0f172a] text-white hover:bg-[#1e293b] dark:bg-white dark:text-[#0f172a] dark:hover:bg-gray-100" style={{ backgroundColor: '#0f172a', color: 'white' }} disabled={isSavingNotifications || !canEditSettings}>
                  {isSavingNotifications ? (<><Loader2 className="h-4 w-4 animate-spin" />Saving...</>) : (<><Save className="h-4 w-4" />{canEditSettings ? 'Save Settings' : '🔒 Admin Access Required'}</>)}
                </Button>
              </div>
            </div>
          )}

          {/* Section divider */}
          <div className="border-t border-border my-8" />

          {/* ===== SLACK INTEGRATION SECTION ===== */}
          <div className="bg-[#e2e8f0] dark:bg-[#1e293b] px-4 py-3 rounded-md mb-6">
            <p className="text-sm font-bold text-[#0f172a] dark:text-[#f1f5f9]">Slack Integration</p>
            <p className="text-xs text-muted-foreground mt-0.5">Connect your Slack workspace for real-time notifications</p>
          </div>

          <div className="space-y-5">
            {/* Slack webhook */}
            <div className="grid gap-2">
              <Label htmlFor="slack-webhook">Slack Webhook URL</Label>
              <div className="flex gap-2">
                <Input
                  id="slack-webhook"
                  type={showSlackWebhook ? "text" : "password"}
                  placeholder="https://hooks.slack.com/services/..."
                  value={slackWebhook}
                  onChange={(e) => setSlackWebhook(e.target.value)}
                  className="bg-background/50 border-border flex-1"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowSlackWebhook(!showSlackWebhook)}
                  className="shrink-0"
                  aria-label={showSlackWebhook ? "Hide webhook URL" : "Show webhook URL"}
                >
                  {showSlackWebhook ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSendTestSlack}
                  disabled={!slackWebhook || isSendingTestSlack}
                  className="gap-1.5 shrink-0"
                  aria-label="Send test Slack notification"
                >
                  {isSendingTestSlack ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Send Test
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Get your webhook URL from{" "}
                <a href="https://api.slack.com/messaging/webhooks" target="_blank" rel="noopener noreferrer" className="text-secondary hover:underline">
                  Slack's Incoming Webhooks
                </a>
              </p>
            </div>

            {/* Slack Notification Toggles */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Slack Notification Types</Label>
              <div className="space-y-1">
                {[
                  { key: "sqlNotifications", label: "New SQL Notifications", description: "Get notified when a new SQL meeting is booked" },
                  { key: "dailySummary", label: "Daily Summary Reports", description: "Receive a daily summary of team activity" },
                  { key: "inactiveAlerts", label: "Inactive SDR Alerts", description: "Alert when an SDR has no activity for 1+ hour during business hours" },
                  { key: "weeklyReports", label: "Weekly Summary Reports", description: "Receive a weekly overview of performance metrics" },
                ].map(({ key, label, description }) => (
                  <div key={key} className="flex items-center gap-3 py-2">
                    <Switch
                      id={`slack-${key}`}
                      checked={reportContent[key as keyof typeof reportContent]}
                      onCheckedChange={(checked) =>
                        setReportContent({ ...reportContent, [key]: checked as boolean })
                      }
                      className="data-[state=checked]:bg-[#10b981] shrink-0"
                    />
                    <div className="space-y-0.5">
                      <span className="text-sm font-medium text-foreground">{label}</span>
                      <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Save Slack Settings */}
            <div className="flex justify-end pt-2">
              <Button onClick={handleSaveNotifications} className="gap-2 bg-[#0f172a] text-white hover:bg-[#1e293b] dark:bg-white dark:text-[#0f172a] dark:hover:bg-gray-100" style={{ backgroundColor: '#0f172a', color: 'white' }} disabled={isSavingNotifications || !canEditSettings}>
                {isSavingNotifications ? (<><Loader2 className="h-4 w-4 animate-spin" />Saving...</>) : (<><Save className="h-4 w-4" />{canEditSettings ? 'Save Settings' : '🔒 Admin Access Required'}</>)}
              </Button>
            </div>
          </div>

          {/* Section divider */}
          <div className="border-t border-border my-8" />

          {/* ===== BROWSER NOTIFICATIONS SECTION ===== */}
          <div className="bg-[#e2e8f0] dark:bg-[#1e293b] px-4 py-3 rounded-md mb-6">
            <p className="text-sm font-bold text-[#0f172a] dark:text-[#f1f5f9]">Browser Notifications</p>
            <p className="text-xs text-muted-foreground mt-0.5">Get desktop notifications even when the dashboard is in the background</p>
          </div>

          <div className="space-y-5">
            {/* Permission Status row */}
            <div className="flex items-center justify-between py-2">
              <span className="text-sm font-medium">Browser notification permission</span>
              {!browserNotifSupported ? (
                <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
                  ℹ️ Not supported
                </span>
              ) : browserNotifPermission === 'granted' ? (
                <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-green-500/15 text-green-500">
                  ✓ Enabled
                </span>
              ) : browserNotifPermission === 'denied' ? (
                <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-destructive/15 text-destructive">
                  ✗ Blocked
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-yellow-500/15 text-yellow-500">
                  ⚠ Not enabled
                </span>
              )}
            </div>

            {/* Browser notification toggle */}
            <div className="space-y-1">
              <div className="flex items-center gap-3 py-2">
                <Switch
                  id="browserNotifications"
                  checked={reportContent.browserNotifications}
                  onCheckedChange={(checked) =>
                    setReportContent({ ...reportContent, browserNotifications: checked as boolean })
                  }
                  disabled={browserNotifPermission !== 'granted'}
                  className="data-[state=checked]:bg-[#10b981] shrink-0"
                />
                <div className="space-y-0.5">
                  <span className="text-sm font-medium text-foreground">Show desktop notifications for new SQLs</span>
                  <p className="text-xs text-muted-foreground mt-0.5">Displays a native browser popup when a new SQL meeting is booked</p>
                </div>
              </div>
            </div>

            {browserNotifPermission === 'default' && (
              <Button
                variant="outline"
                onClick={async () => {
                  const result = await requestPermission();
                  if (result === 'granted') {
                    toast({ title: "Notifications enabled", description: "You'll now receive desktop notifications for new SQLs.", className: "border-[#10b981] text-[#10b981]" });
                  } else {
                    toast({ title: "Notifications blocked", description: "You can enable them later in your browser settings.", variant: "destructive" });
                  }
                }}
                className="gap-2 w-full sm:w-auto"
              >
                <BellRing className="h-4 w-4" />
                Request Permission
              </Button>
            )}

            {browserNotifPermission === 'denied' && (
              <p className="text-xs text-muted-foreground">
                Notifications are blocked. You can enable them in your browser's site settings.
              </p>
            )}

            <div className="flex justify-end pt-2">
              <Button onClick={handleSaveNotifications} className="gap-2 bg-[#0f172a] text-white hover:bg-[#1e293b] dark:bg-white dark:text-[#0f172a] dark:hover:bg-gray-100" style={{ backgroundColor: '#0f172a', color: 'white' }} disabled={isSavingNotifications || !canEditSettings}>
                {isSavingNotifications ? (<><Loader2 className="h-4 w-4 animate-spin" />Saving...</>) : (<><Save className="h-4 w-4" />{canEditSettings ? 'Save Settings' : '🔒 Admin Access Required'}</>)}
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
