import { useState, useEffect, useCallback, useRef } from "react";
import { useBrowserNotifications } from "@/hooks/useBrowserNotifications";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Building2, Plus, Pencil, Trash2, Users, Bell, X, Send, Save, Loader2, Upload, Image, Power, BellRing, Mail, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { sendSlackNotification, formatTestMessage } from "@/lib/slackNotifications";
import { Skeleton } from "@/components/ui/skeleton";
import { SDRAvatar } from "@/components/SDRAvatar";
import { usePermissions } from "@/hooks/useUserRole";

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
}

interface InviteRecord {
  id: string;
  client_id: string | null;
  role: string;
  invite_status: string | null;
  invite_sent_at: string | null;
  invite_expires_at: string | null;
  user_id: string | null;
}

const Settings = () => {
  const { toast } = useToast();
  const { permission: browserNotifPermission, supported: browserNotifSupported, requestPermission } = useBrowserNotifications();
  const { canEditClients, canEditTeamMembers, canEditSettings, isAdmin } = usePermissions();

  useEffect(() => {
    document.title = "J2 Dashboard - Settings";
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

  // --- Invite records state ---
  const [inviteRecords, setInviteRecords] = useState<InviteRecord[]>([]);
  const [clientInviteStatus, setClientInviteStatus] = useState<Record<string, 'not_sent' | 'sending' | 'sent' | 'error'>>({});
  const [memberInviteStatus, setMemberInviteStatus] = useState<Record<string, 'not_sent' | 'sending' | 'sent' | 'error'>>({});

  const fetchInviteRecords = useCallback(async () => {
    try {
      // Use service role via edge function or just query what admin can see
      const { data, error } = await supabase
        .from('user_roles')
        .select('id, client_id, role, invite_status, invite_sent_at, invite_expires_at, user_id');
      if (!error && data) {
        setInviteRecords(data);
      }
    } catch (err) {
      console.error('Error fetching invite records:', err);
    }
  }, []);

  useEffect(() => {
    fetchClients();
    fetchTeamMembers();
    fetchInviteRecords();
  }, [fetchClients, fetchTeamMembers, fetchInviteRecords]);

  const getClientInviteInfo = (clientId: string) => {
    const invite = inviteRecords.find(r => r.client_id === clientId && r.role === 'client');
    if (!invite) return { status: 'no_invite', label: 'No Invite Sent' };
    if (invite.user_id) return { status: 'active', label: 'Active' };
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
      const { data, error } = await supabase.functions.invoke('send-invite', {
        body: { email, role, name, clientId }
      });
      if (error) throw error;
      setStatus(prev => ({ ...prev, [key]: 'sent' }));
      toast({ title: "Invite sent", description: `Invite sent to ${email}`, className: "border-green-500" });
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

  const filteredClients = showInactiveClients ? clients : clients.filter(c => c.status === 'active' || !c.status);
  const filteredMembers = showInactiveMembers ? teamMembers : teamMembers.filter(m => m.status === 'active' || !m.status);

  const handleReactivateClient = async (client: ClientRow) => {
    try {
      const { error } = await supabase
        .from('clients')
        .update({ status: 'active' })
        .eq('id', client.id);
      if (error) throw error;
      toast({ title: "Client reactivated", description: `${client.client_name} is now active.`, className: "border-green-500" });
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
      toast({ title: "Team member reactivated", description: `${member.sdr_name} is now active.`, className: "border-green-500" });
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
  const [clientForm, setClientForm] = useState({ client_name: "", client_id: "", email: "", campaign_start: "", campaign_end: "", target_sqls: "", logo_url: "" });
  const [isSavingClient, setIsSavingClient] = useState(false);
  const [uploadingClientLogo, setUploadingClientLogo] = useState(false);
  const [uploadingClientBanner, setUploadingClientBanner] = useState(false);
  const clientLogoInputRef = useRef<HTMLInputElement>(null);
  const clientBannerInputRef = useRef<HTMLInputElement>(null);

  // --- Team dialog ---
  const [isTeamDialogOpen, setIsTeamDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMemberRow | null>(null);
  const [memberForm, setMemberForm] = useState({ sdr_name: "", email: "", role: "", profile_photo_url: "" });
  const [isSavingMember, setIsSavingMember] = useState(false);
  const [uploadingMemberPhoto, setUploadingMemberPhoto] = useState(false);
  const memberPhotoInputRef = useRef<HTMLInputElement>(null);

  // --- Client CRUD ---
  const handleAddClient = () => {
    setEditingClient(null);
    setClientForm({ client_name: "", client_id: "", email: "", campaign_start: "", campaign_end: "", target_sqls: "", logo_url: "" });
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
    const clientId = clientForm.client_id || editingClient?.client_id;
    if (!clientId) {
      toast({ title: "Save client first", description: "Please save the client before uploading.", variant: "destructive" });
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
      toast({ title: "Logo uploaded", className: "border-green-500" });
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
    toast({ title: "Logo removed", className: "border-green-500" });
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
    const clientId = clientForm.client_id || editingClient?.client_id;
    if (!clientId) {
      toast({ title: "Save client first", description: "Please save the client before uploading.", variant: "destructive" });
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
      toast({ title: "Banner uploaded", className: "border-green-500" });
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
    toast({ title: "Banner removed", className: "border-green-500" });
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
      toast({ title: "Photo uploaded", className: "border-green-500" });
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
    toast({ title: "Photo removed", className: "border-green-500" });
    fetchTeamMembers();
  };

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSaveClient = async () => {
    if (clientForm.email && !isValidEmail(clientForm.email)) {
      toast({ title: "Invalid email", description: "Please enter a valid email address.", variant: "destructive" });
      return;
    }
    setIsSavingClient(true);
    try {
      const slug = clientForm.client_id || clientForm.client_name.toLowerCase().replace(/\s+/g, '-');
      if (editingClient) {
        const { error } = await supabase
          .from('clients')
          .update({
            client_name: clientForm.client_name,
            client_id: slug,
            email: clientForm.email || null,
            campaign_start: clientForm.campaign_start || null,
            campaign_end: clientForm.campaign_end || null,
            target_sqls: clientForm.target_sqls ? parseInt(clientForm.target_sqls) : null,
            logo_url: clientForm.logo_url || null,
          })
          .eq('id', editingClient.id);
        if (error) throw error;
        toast({ title: "Client updated", description: `${clientForm.client_name} has been updated.`, className: "border-green-500" });
      } else {
        const { error } = await supabase
          .from('clients')
          .insert({
            client_name: clientForm.client_name,
            client_id: slug,
            email: clientForm.email || null,
            campaign_start: clientForm.campaign_start || null,
            campaign_end: clientForm.campaign_end || null,
            target_sqls: clientForm.target_sqls ? parseInt(clientForm.target_sqls) : null,
            logo_url: clientForm.logo_url || null,
          });
        if (error) throw error;
        toast({ title: "Client added", description: `${clientForm.client_name} has been added.`, className: "border-green-500" });
      }
      setIsClientDialogOpen(false);
      fetchClients();
    } catch (error: any) {
      console.error('Error saving client:', error);
      toast({ title: "Error saving client", description: error.message || "Something went wrong.", variant: "destructive" });
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
      toast({ title: "Error", description: error.message || "Could not deactivate client.", variant: "destructive" });
    }
  };

  // --- Team CRUD ---
  const handleAddMember = () => {
    setEditingMember(null);
    setMemberForm({ sdr_name: "", email: "", role: "", profile_photo_url: "" });
    setIsTeamDialogOpen(true);
  };

  const handleEditMember = (member: TeamMemberRow) => {
    setEditingMember(member);
    setMemberForm({ sdr_name: member.sdr_name, email: member.email, role: member.role || "", profile_photo_url: member.profile_photo_url || "" });
    setIsTeamDialogOpen(true);
  };

  const handleSaveMember = async () => {
    setIsSavingMember(true);
    try {
      if (editingMember) {
        const { error } = await supabase
          .from('team_members')
          .update({
            sdr_name: memberForm.sdr_name,
            email: memberForm.email,
            role: memberForm.role,
          })
          .eq('id', editingMember.id);
        if (error) throw error;
        toast({ title: "Team member updated", description: `${memberForm.sdr_name} has been updated.`, className: "border-green-500" });
      } else {
        const { error } = await supabase
          .from('team_members')
          .insert({
            sdr_name: memberForm.sdr_name,
            email: memberForm.email,
            role: memberForm.role,
          });
        if (error) throw error;
        toast({ title: "Team member added", description: `${memberForm.sdr_name} has been added.`, className: "border-green-500" });
      }
      setIsTeamDialogOpen(false);
      fetchTeamMembers();
    } catch (error: any) {
      console.error('Error saving team member:', error);
      toast({ title: "Error saving team member", description: error.message || "Something went wrong.", variant: "destructive" });
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
      toast({ title: "Error", description: error.message || "Could not deactivate team member.", variant: "destructive" });
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
      toast({ title: "Notification settings saved", description: "Your notification preferences have been updated.", className: "border-green-500" });
    } catch (error: any) {
      console.error('Error saving notification settings:', error);
      toast({ title: "Error saving settings", description: error.message || "Could not save notification settings.", variant: "destructive" });
    } finally {
      setIsSavingNotifications(false);
    }
  };

  const handleSendTestEmail = async () => {
    setIsSendingTestEmail(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsSendingTestEmail(false);
    toast({ title: "Test email sent", description: `A test report has been sent to ${reportEmails}`, className: "border-green-500" });
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
        toast({ title: "Test notification sent", description: "Check your Slack channel for the test message.", className: "border-green-500" });
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

  // --- Branding state ---
  const [logoUrl, setLogoUrl] = useState<string | null>(() => localStorage.getItem("companyLogoUrl"));
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/png", "image/jpeg", "image/svg+xml"];
    if (!allowedTypes.includes(file.type)) {
      toast({ title: "Invalid file type", description: "Please upload a PNG, JPG, or SVG file.", variant: "destructive" });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "File too large", description: "Please upload an image under 2MB.", variant: "destructive" });
      return;
    }

    setUploadingLogo(true);
    try {
      const ext = file.name.split(".").pop();
      const filePath = `company-logo.${ext}`;

      await supabase.storage.from("branding").remove([filePath]);

      const { error: uploadError } = await supabase.storage
        .from("branding")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("branding")
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl + "?t=" + Date.now();
      localStorage.setItem("companyLogoUrl", publicUrl);
      setLogoUrl(publicUrl);
      toast({ title: "Logo uploaded", description: "Your company logo has been updated.", className: "border-green-500" });
    } catch (error: any) {
      console.error("Logo upload error:", error);
      toast({ title: "Upload failed", description: error.message || "Could not upload logo.", variant: "destructive" });
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveLogo = async () => {
    try {
      await supabase.storage.from("branding").remove(["company-logo.png", "company-logo.jpg", "company-logo.jpeg", "company-logo.svg"]);
    } catch (err) {
      console.error("Error removing logo from storage:", err);
    }
    localStorage.removeItem("companyLogoUrl");
    setLogoUrl(null);
    toast({ title: "Logo removed", description: "The company logo has been removed.", className: "border-green-500" });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
        <p className="text-muted-foreground">Manage your dashboard configuration and preferences</p>
      </div>

      {/* Dashboard Branding Section */}
      <Card className="bg-card/50 backdrop-blur-sm border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5 text-secondary" />
            Dashboard Branding
          </CardTitle>
          <CardDescription>Customize your dashboard with your company logo</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="h-20 w-20 rounded-full bg-secondary/10 border-2 border-dashed border-border flex items-center justify-center overflow-hidden shrink-0">
                {logoUrl ? (
                  <img src={logoUrl} alt="Company logo" className="h-full w-full object-cover rounded-full" />
                ) : (
                  <div className="h-full w-full rounded-full bg-secondary flex items-center justify-center">
                    <span className="text-2xl font-bold text-secondary-foreground">J2</span>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-3">
                <input ref={fileInputRef} type="file" accept=".png,.jpg,.jpeg,.svg" onChange={handleLogoUpload} className="hidden" />
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploadingLogo} className="gap-2">
                    {uploadingLogo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    {uploadingLogo ? "Uploading..." : "Upload Logo"}
                  </Button>
                  {logoUrl && (
                    <Button variant="outline" onClick={handleRemoveLogo} className="gap-2 text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">PNG, JPG, or SVG. Recommended: 256×256px.</p>
                <p className="text-xs text-muted-foreground mt-1">This logo appears in the dashboard header on all pages.</p>
              </div>
            </div>

            {/* Live Header Preview */}
            <div className="border border-border rounded-lg overflow-hidden">
              <p className="text-xs text-muted-foreground px-3 py-1.5 bg-muted/30 border-b border-border">Header Preview</p>
              <div className="flex items-center gap-3 px-4 py-3 bg-card">
                {logoUrl ? (
                  <img src={logoUrl} alt="Preview" className="h-10 w-auto max-w-[120px] object-contain" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                    <span className="text-sm font-bold text-secondary-foreground">J2</span>
                  </div>
                )}
                <div>
                  <p className="text-sm font-bold text-foreground">J2 Group</p>
                  <p className="text-[10px] text-muted-foreground">Lead Generation Dashboard</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="clients" className="space-y-6">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="clients" className="gap-2 data-[state=active]:bg-secondary/20 data-[state=active]:text-secondary">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Client Management</span>
            <span className="sm:hidden">Clients</span>
          </TabsTrigger>
          <TabsTrigger value="team" className="gap-2 data-[state=active]:bg-secondary/20 data-[state=active]:text-secondary">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Team Members</span>
            <span className="sm:hidden">Team</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2 data-[state=active]:bg-secondary/20 data-[state=active]:text-secondary">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Notifications</span>
            <span className="sm:hidden">Alerts</span>
          </TabsTrigger>
        </TabsList>

        {/* Client Management Tab */}
        <TabsContent value="clients" className="space-y-4">
          <Card className="bg-card/50 backdrop-blur-sm border-border">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle>Client Management</CardTitle>
                  <CardDescription>Add, edit, or remove client accounts</CardDescription>
                </div>
                <Dialog open={isClientDialogOpen} onOpenChange={setIsClientDialogOpen}>
                  {canEditClients ? (
                    <DialogTrigger asChild>
                      <Button onClick={handleAddClient} className="gap-2">
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
                      <div className="grid gap-2">
                        <Label htmlFor="client-id">Client ID (slug)</Label>
                        <Input
                          id="client-id"
                          placeholder="e.g., acme-corp (auto-generated if empty)"
                          value={clientForm.client_id}
                          onChange={(e) => setClientForm({ ...clientForm, client_id: e.target.value })}
                          className="bg-background/50 border-border"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="client-email">Client Email</Label>
                        <div className="flex gap-2">
                          <Input
                            id="client-email"
                            type="email"
                            placeholder="client@company.com"
                            value={clientForm.email}
                            onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })}
                            className="bg-background/50 border-border flex-1"
                          />
                          {clientForm.email && isValidEmail(clientForm.email) && editingClient && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSendInvite(clientForm.email, 'client', clientForm.client_name, clientForm.client_id || editingClient.client_id)}
                              disabled={clientInviteStatus[clientForm.client_id || editingClient.client_id] === 'sending'}
                              className="gap-1.5 shrink-0 border-secondary/30 text-secondary hover:bg-secondary/10"
                            >
                              {clientInviteStatus[clientForm.client_id || editingClient.client_id] === 'sending' ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : clientInviteStatus[clientForm.client_id || editingClient.client_id] === 'sent' ? (
                                <>✓ Invite Sent</>
                              ) : (
                                <><Mail className="h-3.5 w-3.5" />Send Invite</>
                              )}
                            </Button>
                          )}
                        </div>
                        {clientInviteStatus[clientForm.client_id || editingClient?.client_id || ''] === 'sent' && (
                          <p className="text-xs text-green-500">Invite sent successfully!</p>
                        )}
                        {clientInviteStatus[clientForm.client_id || editingClient?.client_id || ''] === 'error' && (
                          <p className="text-xs text-destructive">Failed to send invite. Try again.</p>
                        )}
                        <p className="text-[10px] text-muted-foreground">Used for sending dashboard login credentials</p>
                      </div>
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
                      {editingClient && (
                        <div className="grid gap-2 border-t border-border pt-4">
                          <Label>Client Logo</Label>
                          <div className="flex items-center gap-4">
                            <div className="h-[60px] w-[60px] rounded-full bg-muted/30 border border-border flex items-center justify-center overflow-hidden shrink-0">
                              {clientForm.logo_url ? (
                                <img src={clientForm.logo_url} alt="Client logo" className="h-full w-full object-cover rounded-full" />
                              ) : (
                                <span className="text-lg font-bold text-muted-foreground">
                                  {clientForm.client_name?.[0]?.toUpperCase() || "?"}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-col gap-2">
                              <input ref={clientLogoInputRef} type="file" accept=".png,.jpg,.jpeg,.svg" onChange={handleClientLogoUpload} className="hidden" />
                              <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => clientLogoInputRef.current?.click()} disabled={uploadingClientLogo} className="gap-1.5 text-xs border-cyan-500/30 text-cyan-500 hover:bg-cyan-500/10">
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
                      )}

                      {/* Client Banner Upload */}
                      {editingClient && (
                        <div className="grid gap-2 border-t border-border pt-4">
                          <Label>Banner Image</Label>
                          <div className="space-y-3">
                            <div className="w-full h-[100px] rounded-lg bg-muted/30 border border-border overflow-hidden">
                              {editingClient.banner_url ? (
                                <img src={editingClient.banner_url} alt="Client banner" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                                  No banner image
                                </div>
                              )}
                            </div>
                            <input ref={clientBannerInputRef} type="file" accept=".png,.jpg,.jpeg" onChange={handleClientBannerUpload} className="hidden" />
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" onClick={() => clientBannerInputRef.current?.click()} disabled={uploadingClientBanner} className="gap-1.5 text-xs border-cyan-500/30 text-cyan-500 hover:bg-cyan-500/10">
                                {uploadingClientBanner ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                                Upload Banner
                              </Button>
                              {editingClient.banner_url && (
                                <Button variant="outline" size="sm" onClick={handleRemoveClientBanner} className="gap-1.5 text-xs text-destructive border-destructive/30 hover:bg-destructive/10">
                                  <Trash2 className="h-3 w-3" />
                                  Remove
                                </Button>
                              )}
                            </div>
                            <p className="text-[10px] text-muted-foreground">PNG, JPG • Max 5MB • Recommended: 1200×300px</p>
                          </div>
                        </div>
                      )}
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsClientDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSaveClient}
                        disabled={!clientForm.client_name || isSavingClient}
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
                <Checkbox
                  id="show-inactive-clients"
                  checked={showInactiveClients}
                  onCheckedChange={(checked) => setShowInactiveClients(!!checked)}
                />
                <Label htmlFor="show-inactive-clients" className="text-sm text-muted-foreground cursor-pointer">
                  Show inactive clients
                </Label>
              </div>
              <div className="overflow-x-auto scrollbar-thin">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="text-muted-foreground">Client Name</TableHead>
                      <TableHead className="text-muted-foreground">Client ID</TableHead>
                      <TableHead className="text-muted-foreground">Email</TableHead>
                      <TableHead className="text-muted-foreground">Access</TableHead>
                      <TableHead className="text-muted-foreground">Campaign</TableHead>
                      <TableHead className="text-muted-foreground">Target SQLs</TableHead>
                      <TableHead className="text-muted-foreground">Status</TableHead>
                      <TableHead className="text-right text-muted-foreground">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingClients ? (
                      <TableSkeletonRows />
                    ) : filteredClients.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                          No clients found. Add your first client above.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredClients.map((client) => {
                        const isInactive = client.status === 'inactive';
                        const inviteInfo = getClientInviteInfo(client.client_id);
                        return (
                          <TableRow key={client.id} className={`border-border/50 hover:bg-muted/20 transition-colors ${isInactive ? 'opacity-50' : ''}`}>
                            <TableCell className="font-medium text-foreground">
                              <div className="flex items-center gap-2">
                                {client.logo_url ? (
                                  <img src={client.logo_url} alt={`${client.client_name} logo`} className="h-6 w-6 rounded object-cover" />
                                ) : (
                                  <Building2 className="h-4 w-4 text-muted-foreground" />
                                )}
                                {client.client_name}
                                {isInactive && (
                                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-destructive/20 text-destructive uppercase">Inactive</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{client.client_id}</TableCell>
                            <TableCell className="text-muted-foreground text-sm">{client.email || '—'}</TableCell>
                            <TableCell>
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                inviteInfo.status === 'active' ? 'bg-green-500/20 text-green-400' :
                                inviteInfo.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                                inviteInfo.status === 'expired' ? 'bg-destructive/20 text-destructive' :
                                'bg-muted/30 text-muted-foreground'
                              }`}>
                                {inviteInfo.label}
                              </span>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {client.campaign_start && client.campaign_end
                                ? `${client.campaign_start} → ${client.campaign_end}`
                                : client.campaign_start || "—"}
                            </TableCell>
                            <TableCell className="text-muted-foreground">{client.target_sqls ?? "—"}</TableCell>
                            <TableCell>
                              <span className={`text-xs px-2 py-1 rounded-full ${client.status === 'active' || !client.status ? 'bg-green-500/20 text-green-400' : 'bg-muted/30 text-muted-foreground'}`}>
                                {client.status || "active"}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              {canEditClients ? (
                                <TooltipProvider>
                                <div className="flex justify-end gap-2">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button variant="ghost" size="icon" onClick={() => handleEditClient(client)} aria-label={`Edit ${client.client_name}`}>
                                        <Pencil className="h-4 w-4 text-secondary" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Edit</TooltipContent>
                                  </Tooltip>
                                  {inviteInfo.status === 'pending' && client.email && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => handleResendInvite(client.email!, 'client', client.client_name, client.client_id)}
                                          aria-label={`Resend invite to ${client.client_name}`}
                                          className="text-secondary hover:text-secondary hover:bg-secondary/10"
                                        >
                                          <RefreshCw className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Resend Invite</TooltipContent>
                                    </Tooltip>
                                  )}
                                  {isInactive ? (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => handleReactivateClient(client)}
                                          aria-label={`Reactivate ${client.client_name}`}
                                          className="text-green-500 hover:text-green-400 hover:bg-green-500/10"
                                        >
                                          <Power className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Reactivate</TooltipContent>
                                    </Tooltip>
                                  ) : (
                                    <AlertDialog>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" aria-label={`Deactivate ${client.client_name}`} className="text-orange-500 hover:text-orange-400 hover:bg-orange-500/10">
                                              <Power className="h-4 w-4" />
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
                                          <AlertDialogAction onClick={() => handleDeactivateClient(client)} className="bg-orange-600 hover:bg-orange-700 text-white">
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
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team Members Tab */}
        <TabsContent value="team" className="space-y-4">
          <Card className="bg-card/50 backdrop-blur-sm border-border">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle>Team Members</CardTitle>
                  <CardDescription>Manage SDR team members and their roles</CardDescription>
                </div>
                <Dialog open={isTeamDialogOpen} onOpenChange={setIsTeamDialogOpen}>
                  {canEditTeamMembers ? (
                    <DialogTrigger asChild>
                      <Button onClick={handleAddMember} className="gap-2">
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
                                <Button variant="outline" size="sm" onClick={() => memberPhotoInputRef.current?.click()} disabled={uploadingMemberPhoto} className="gap-1.5 text-xs border-cyan-500/30 text-cyan-500 hover:bg-cyan-500/10">
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
                              className="gap-1.5 shrink-0 border-secondary/30 text-secondary hover:bg-secondary/10"
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
                        <Input
                          id="member-role"
                          placeholder="e.g., Senior SDR, SDR, Team Lead"
                          value={memberForm.role}
                          onChange={(e) => setMemberForm({ ...memberForm, role: e.target.value })}
                          className="bg-background/50 border-border"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsTeamDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSaveMember}
                        disabled={!memberForm.sdr_name || !memberForm.email || !memberForm.role || isSavingMember}
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
                <Checkbox
                  id="show-inactive-members"
                  checked={showInactiveMembers}
                  onCheckedChange={(checked) => setShowInactiveMembers(!!checked)}
                />
                <Label htmlFor="show-inactive-members" className="text-sm text-muted-foreground cursor-pointer">
                  Show inactive team members
                </Label>
              </div>
              <div className="overflow-x-auto scrollbar-thin">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="text-muted-foreground">Name</TableHead>
                      <TableHead className="text-muted-foreground">Email</TableHead>
                      <TableHead className="text-muted-foreground">Role</TableHead>
                      <TableHead className="text-muted-foreground">Invite</TableHead>
                      <TableHead className="text-muted-foreground">Status</TableHead>
                      <TableHead className="text-right text-muted-foreground">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingTeam ? (
                      <TableSkeletonRows />
                    ) : filteredMembers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No team members found. Add your first team member above.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredMembers.map((member) => {
                        const isInactive = member.status === 'inactive';
                        return (
                          <TableRow key={member.id} className={`border-border/50 hover:bg-muted/20 transition-colors ${isInactive ? 'opacity-50' : ''}`}>
                            <TableCell className="font-medium text-foreground">
                              <div className="flex items-center gap-2">
                                <SDRAvatar name={member.sdr_name} photoUrl={member.profile_photo_url} size="sm" />
                                {member.sdr_name}
                                {isInactive && (
                                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-destructive/20 text-destructive uppercase">Inactive</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{member.email}</TableCell>
                            <TableCell className="text-muted-foreground">{member.role || "—"}</TableCell>
                            <TableCell>
                              <span className="text-xs px-2 py-1 rounded-full bg-muted/30 text-muted-foreground">
                                No Invite Sent
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className={`text-xs px-2 py-1 rounded-full ${member.status === 'active' || !member.status ? 'bg-green-500/20 text-green-400' : 'bg-muted/30 text-muted-foreground'}`}>
                                {member.status || "active"}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              {canEditTeamMembers ? (
                              <TooltipProvider>
                                <div className="flex justify-end gap-2">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button variant="ghost" size="icon" onClick={() => handleEditMember(member)} aria-label={`Edit ${member.sdr_name}`}>
                                        <Pencil className="h-4 w-4 text-secondary" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Edit</TooltipContent>
                                  </Tooltip>
                                  {isInactive ? (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => handleReactivateMember(member)}
                                          aria-label={`Reactivate ${member.sdr_name}`}
                                          className="text-green-500 hover:text-green-400 hover:bg-green-500/10"
                                        >
                                          <Power className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Reactivate</TooltipContent>
                                    </Tooltip>
                                  ) : (
                                    <AlertDialog>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" aria-label={`Deactivate ${member.sdr_name}`} className="text-orange-500 hover:text-orange-400 hover:bg-orange-500/10">
                                              <Power className="h-4 w-4" />
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
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-4">
          <Card className="bg-card/50 backdrop-blur-sm border-border">
            <CardHeader>
              <CardTitle>Email Reports Configuration</CardTitle>
              <CardDescription>Configure automated email report settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
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
                <div className="space-y-6">
              {/* Report Frequency */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Report Frequency</Label>
                <RadioGroup
                  value={reportFrequency}
                  onValueChange={(value) => setReportFrequency(value as "daily" | "weekly" | "monthly" | "disabled")}
                  className="flex flex-wrap gap-4"
                >
                  {["daily", "weekly", "monthly", "disabled"].map((freq) => (
                    <div key={freq} className="flex items-center space-x-2">
                      <RadioGroupItem value={freq} id={freq} className="border-accent data-[state=checked]:bg-accent data-[state=checked]:text-accent-foreground" />
                      <Label htmlFor={freq} className="font-normal cursor-pointer capitalize">{freq}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              {/* Time Settings */}
              {reportFrequency === "daily" && (
                <div className="space-y-3 animate-fade-in">
                  <div className="grid gap-2">
                    <Label htmlFor="send-time">Send Time</Label>
                    <Select value={sendTime} onValueChange={setSendTime}>
                      <SelectTrigger id="send-time" className="bg-background/50 border-border"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["6:00 AM", "9:00 AM", "12:00 PM", "3:00 PM", "4:00 PM", "6:00 PM", "9:00 PM"].map(t => (
                          <SelectItem key={t} value={t}>{t} AEDT</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Reports sent every day at selected time</p>
                  </div>
                </div>
              )}

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
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="send-time-weekly">Send Time</Label>
                    <Select value={sendTime} onValueChange={setSendTime}>
                      <SelectTrigger id="send-time-weekly" className="bg-background/50 border-border"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["6:00 AM", "9:00 AM", "12:00 PM", "3:00 PM", "4:00 PM", "6:00 PM", "9:00 PM"].map(t => (
                          <SelectItem key={t} value={t}>{t} AEDT</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Reports sent every {sendDay} at {sendTime} AEDT</p>
                  </div>
                </div>
              )}

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
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="send-time-monthly">Send Time</Label>
                    <Select value={sendTime} onValueChange={setSendTime}>
                      <SelectTrigger id="send-time-monthly" className="bg-background/50 border-border"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["6:00 AM", "9:00 AM", "12:00 PM", "3:00 PM", "4:00 PM", "6:00 PM", "9:00 PM"].map(t => (
                          <SelectItem key={t} value={t}>{t} AEDT</SelectItem>
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
                      <div key={value} className="flex items-center space-x-1.5">
                        <Checkbox
                          id={`day-${value}`}
                          checked={sendDays.includes(value)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSendDays(prev => [...prev, value]);
                            } else {
                              setSendDays(prev => prev.filter(d => d !== value));
                            }
                          }}
                        />
                        <Label htmlFor={`day-${value}`} className="text-sm cursor-pointer">{label}</Label>
                      </div>
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

              {/* Report Content */}
              {reportFrequency !== "disabled" && (
                <div className="space-y-3 animate-fade-in">
                  <Label className="text-base font-medium">Include in Report:</Label>
                  <div className="space-y-3">
                    {[
                      { key: "campaignOverview", label: "Campaign Overview (KPIs across all clients)" },
                      { key: "topPerformingClients", label: "Top Performing Clients" },
                      { key: "teamPerformance", label: "Team Performance Summary" },
                      { key: "sqlBookedMeetings", label: "SQL Booked Meetings" },
                      { key: "detailedActivityBreakdown", label: "Detailed Activity Breakdown" },
                    ].map(({ key, label }) => (
                      <div key={key} className="flex items-center space-x-2">
                        <Checkbox
                          id={key}
                          checked={reportContent[key as keyof typeof reportContent]}
                          onCheckedChange={(checked) =>
                            setReportContent({ ...reportContent, [key]: checked as boolean })
                          }
                          className="data-[state=checked]:bg-accent data-[state=checked]:border-accent"
                        />
                        <Label htmlFor={key} className="font-normal cursor-pointer">{label}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border">
                <Button onClick={handleSaveNotifications} className="gap-2 flex-1 sm:flex-initial" disabled={isSavingNotifications || !canEditSettings}>
                  {isSavingNotifications ? (<><Loader2 className="h-4 w-4 animate-spin" />Saving...</>) : (<><Save className="h-4 w-4" />{canEditSettings ? 'Save Settings' : '🔒 Admin Access Required'}</>)}
                </Button>
                <Button variant="outline" onClick={handleSendTestEmail} className="gap-2 flex-1 sm:flex-initial" disabled={reportFrequency === "disabled" || isSendingTestEmail || !canEditSettings}>
                  {isSendingTestEmail ? (<><Loader2 className="h-4 w-4 animate-spin" />Sending...</>) : (<><Send className="h-4 w-4" />Send Test Email</>)}
                </Button>
              </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm border-border">
            <CardHeader>
              <CardTitle>Slack Integration</CardTitle>
              <CardDescription>Connect your Slack workspace for real-time notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-2">
                <Label htmlFor="slack-webhook">Slack Webhook URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="slack-webhook"
                    placeholder="https://hooks.slack.com/services/..."
                    value={slackWebhook}
                    onChange={(e) => setSlackWebhook(e.target.value)}
                    className="bg-background/50 border-border flex-1"
                  />
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
                <div className="space-y-3">
                  {[
                    { key: "sqlNotifications", label: "New SQL Notifications", description: "Get notified when a new SQL meeting is booked" },
                    { key: "dailySummary", label: "Daily Summary Reports", description: "Receive a daily summary of team activity" },
                    { key: "inactiveAlerts", label: "Inactive SDR Alerts", description: "Alert when an SDR has no activity for 1+ hour during business hours" },
                    { key: "weeklyReports", label: "Weekly Summary Reports", description: "Receive a weekly overview of performance metrics" },
                  ].map(({ key, label, description }) => (
                    <div key={key} className="flex items-start space-x-3">
                      <Checkbox
                        id={`slack-${key}`}
                        checked={reportContent[key as keyof typeof reportContent]}
                        onCheckedChange={(checked) =>
                          setReportContent({ ...reportContent, [key]: checked as boolean })
                        }
                        className="mt-0.5 data-[state=checked]:bg-accent data-[state=checked]:border-accent"
                      />
                      <div className="grid gap-0.5">
                        <Label htmlFor={`slack-${key}`} className="font-normal cursor-pointer">{label}</Label>
                        <p className="text-xs text-muted-foreground">{description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-border">
                <Button onClick={handleSaveNotifications} variant="outline" className="gap-2" disabled={isSavingNotifications || !canEditSettings}>
                  {isSavingNotifications ? (<><Loader2 className="h-4 w-4 animate-spin" />Saving...</>) : (<><Save className="h-4 w-4" />{canEditSettings ? 'Save Slack Settings' : '🔒 Admin Access Required'}</>)}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Browser Notifications - Separate Section */}
          <Card className="bg-card/50 backdrop-blur-sm border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BellRing className="h-5 w-5 text-secondary" />
                Browser Notifications
              </CardTitle>
              <CardDescription>Get desktop notifications even when the dashboard is in the background</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Permission Status */}
              <div className="flex items-center justify-between">
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

              {/* Toggle */}
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-sm font-medium">Show desktop notifications for new SQLs</span>
                  <p className="text-xs text-muted-foreground">Displays a native browser popup when a new SQL meeting is booked</p>
                </div>
                <Checkbox
                  id="browserNotifications"
                  checked={reportContent.browserNotifications}
                  onCheckedChange={(checked) =>
                    setReportContent({ ...reportContent, browserNotifications: checked as boolean })
                  }
                  disabled={browserNotifPermission !== 'granted'}
                  className="mt-0.5 data-[state=checked]:bg-accent data-[state=checked]:border-accent"
                />
              </div>

              {browserNotifPermission === 'default' && (
                <Button
                  variant="outline"
                  onClick={async () => {
                    const result = await requestPermission();
                    if (result === 'granted') {
                      toast({ title: "Notifications enabled", description: "You'll now receive desktop notifications for new SQLs.", className: "border-green-500" });
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

              <div className="flex justify-end pt-2 border-t border-border">
                <Button onClick={handleSaveNotifications} variant="outline" className="gap-2" disabled={isSavingNotifications || !canEditSettings}>
                  {isSavingNotifications ? (<><Loader2 className="h-4 w-4 animate-spin" />Saving...</>) : (<><Save className="h-4 w-4" />{canEditSettings ? 'Save Notification Settings' : '🔒 Admin Access Required'}</>)}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
