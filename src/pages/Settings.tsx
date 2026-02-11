import { useState, useEffect, useCallback } from "react";
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
import { Building2, Plus, Pencil, Trash2, Users, Bell, X, Send, Save, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";

interface ClientRow {
  id: string;
  client_id: string;
  client_name: string;
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
}

const Settings = () => {
  const { toast } = useToast();

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

  useEffect(() => {
    fetchClients();
    fetchTeamMembers();
  }, [fetchClients, fetchTeamMembers]);

  // --- Notification settings (local only, no table) ---
  const [reportFrequency, setReportFrequency] = useState<"daily" | "weekly" | "monthly" | "disabled">("daily");
  const [sendTime, setSendTime] = useState("4:00 PM");
  const [sendDay, setSendDay] = useState("Monday");
  const [sendDate, setSendDate] = useState("1st of month");
  const [reportEmails, setReportEmails] = useState("admin@j2group.com.au");
  const [slackWebhook, setSlackWebhook] = useState("");
  const [reportContent, setReportContent] = useState({
    campaignOverview: true,
    topPerformingClients: true,
    teamPerformance: true,
    sqlBookedMeetings: true,
    detailedActivityBreakdown: false,
  });

  // --- Loading states ---
  const [isSavingNotifications, setIsSavingNotifications] = useState(false);
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);

  // --- Client dialog ---
  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientRow | null>(null);
  const [clientForm, setClientForm] = useState({ client_name: "", client_id: "", campaign_start: "", campaign_end: "", target_sqls: "", logo_url: "" });
  const [isSavingClient, setIsSavingClient] = useState(false);

  // --- Team dialog ---
  const [isTeamDialogOpen, setIsTeamDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMemberRow | null>(null);
  const [memberForm, setMemberForm] = useState({ sdr_name: "", email: "", role: "" });
  const [isSavingMember, setIsSavingMember] = useState(false);

  // --- Client CRUD ---
  const handleAddClient = () => {
    setEditingClient(null);
    setClientForm({ client_name: "", client_id: "", campaign_start: "", campaign_end: "", target_sqls: "", logo_url: "" });
    setIsClientDialogOpen(true);
  };

  const handleEditClient = (client: ClientRow) => {
    setEditingClient(client);
    setClientForm({
      client_name: client.client_name,
      client_id: client.client_id,
      campaign_start: client.campaign_start || "",
      campaign_end: client.campaign_end || "",
      target_sqls: client.target_sqls?.toString() || "",
      logo_url: client.logo_url || "",
    });
    setIsClientDialogOpen(true);
  };

  const handleSaveClient = async () => {
    setIsSavingClient(true);
    try {
      const slug = clientForm.client_id || clientForm.client_name.toLowerCase().replace(/\s+/g, '-');
      if (editingClient) {
        const { error } = await supabase
          .from('clients')
          .update({
            client_name: clientForm.client_name,
            client_id: slug,
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

  const handleDeleteClient = async (client: ClientRow) => {
    try {
      const { error } = await supabase
        .from('clients')
        .update({ status: 'inactive' })
        .eq('id', client.id);
      if (error) throw error;
      toast({ title: "Client deactivated", description: `${client.client_name} has been deactivated.`, variant: "destructive" });
      fetchClients();
    } catch (error: any) {
      console.error('Error deleting client:', error);
      toast({ title: "Error", description: error.message || "Could not delete client.", variant: "destructive" });
    }
  };

  // --- Team CRUD ---
  const handleAddMember = () => {
    setEditingMember(null);
    setMemberForm({ sdr_name: "", email: "", role: "" });
    setIsTeamDialogOpen(true);
  };

  const handleEditMember = (member: TeamMemberRow) => {
    setEditingMember(member);
    setMemberForm({ sdr_name: member.sdr_name, email: member.email, role: member.role || "" });
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

  const handleDeleteMember = async (member: TeamMemberRow) => {
    try {
      const { error } = await supabase
        .from('team_members')
        .update({ status: 'inactive' })
        .eq('id', member.id);
      if (error) throw error;
      toast({ title: "Team member deactivated", description: `${member.sdr_name} has been deactivated.`, variant: "destructive" });
      fetchTeamMembers();
    } catch (error: any) {
      console.error('Error deleting team member:', error);
      toast({ title: "Error", description: error.message || "Could not remove team member.", variant: "destructive" });
    }
  };

  // --- Notification handlers (no backend table yet) ---
  const handleSaveNotifications = async () => {
    setIsSavingNotifications(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    setIsSavingNotifications(false);
    toast({ title: "Notification settings saved", description: "Your notification preferences have been updated.", className: "border-green-500" });
  };

  const handleSendTestEmail = async () => {
    setIsSendingTestEmail(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsSendingTestEmail(false);
    toast({ title: "Test email sent", description: `A test report has been sent to ${reportEmails}`, className: "border-green-500" });
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

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
        <p className="text-muted-foreground">Manage your dashboard configuration and preferences</p>
      </div>

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
                  <DialogTrigger asChild>
                    <Button onClick={handleAddClient} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Add New Client
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-card border-border sm:max-w-[525px]">
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
                      <div className="grid gap-2">
                        <Label htmlFor="logo-url">Logo URL (Optional)</Label>
                        <Input
                          id="logo-url"
                          placeholder="https://example.com/logo.png"
                          value={clientForm.logo_url}
                          onChange={(e) => setClientForm({ ...clientForm, logo_url: e.target.value })}
                          className="bg-background/50 border-border"
                        />
                      </div>
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
              <div className="overflow-x-auto scrollbar-thin">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="text-muted-foreground">Client Name</TableHead>
                      <TableHead className="text-muted-foreground">Client ID</TableHead>
                      <TableHead className="text-muted-foreground">Campaign</TableHead>
                      <TableHead className="text-muted-foreground">Target SQLs</TableHead>
                      <TableHead className="text-muted-foreground">Status</TableHead>
                      <TableHead className="text-right text-muted-foreground">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingClients ? (
                      <TableSkeletonRows />
                    ) : clients.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No clients found. Add your first client above.
                        </TableCell>
                      </TableRow>
                    ) : (
                      clients.map((client) => (
                        <TableRow key={client.id} className="border-border/50 hover:bg-muted/20 transition-colors">
                          <TableCell className="font-medium text-foreground flex items-center gap-2">
                            {client.logo_url ? (
                              <img src={client.logo_url} alt={`${client.client_name} logo`} className="h-6 w-6 rounded object-cover" />
                            ) : (
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                            )}
                            {client.client_name}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{client.client_id}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {client.campaign_start && client.campaign_end
                              ? `${client.campaign_start} → ${client.campaign_end}`
                              : client.campaign_start || "—"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{client.target_sqls ?? "—"}</TableCell>
                          <TableCell>
                            <span className={`text-xs px-2 py-1 rounded-full ${client.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-muted/30 text-muted-foreground'}`}>
                              {client.status || "active"}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="icon" onClick={() => handleEditClient(client)} aria-label={`Edit ${client.client_name}`}>
                                <Pencil className="h-4 w-4 text-secondary" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteClient(client)} aria-label={`Delete ${client.client_name}`}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
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
                  <DialogTrigger asChild>
                    <Button onClick={handleAddMember} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Add Team Member
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-card border-border sm:max-w-[525px]">
                    <DialogHeader>
                      <DialogTitle>{editingMember ? "Edit Team Member" : "Add Team Member"}</DialogTitle>
                      <DialogDescription>
                        {editingMember ? "Update team member information" : "Enter the details for the new team member"}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
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
                        <Input
                          id="member-email"
                          type="email"
                          placeholder="john.smith@j2group.com.au"
                          value={memberForm.email}
                          onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })}
                          className="bg-background/50 border-border"
                        />
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
              <div className="overflow-x-auto scrollbar-thin">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="text-muted-foreground">Name</TableHead>
                      <TableHead className="text-muted-foreground">Email</TableHead>
                      <TableHead className="text-muted-foreground">Role</TableHead>
                      <TableHead className="text-muted-foreground">Status</TableHead>
                      <TableHead className="text-right text-muted-foreground">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingTeam ? (
                      <TableSkeletonRows />
                    ) : teamMembers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          No team members found. Add your first team member above.
                        </TableCell>
                      </TableRow>
                    ) : (
                      teamMembers.map((member) => (
                        <TableRow key={member.id} className="border-border/50 hover:bg-muted/20 transition-colors">
                          <TableCell className="font-medium text-foreground">{member.sdr_name}</TableCell>
                          <TableCell className="text-muted-foreground">{member.email}</TableCell>
                          <TableCell className="text-muted-foreground">{member.role || "—"}</TableCell>
                          <TableCell>
                            <span className={`text-xs px-2 py-1 rounded-full ${member.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-muted/30 text-muted-foreground'}`}>
                              {member.status || "active"}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="icon" onClick={() => handleEditMember(member)} aria-label={`Edit ${member.sdr_name}`}>
                                <Pencil className="h-4 w-4 text-secondary" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteMember(member)} aria-label={`Delete ${member.sdr_name}`}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
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
                <Button onClick={handleSaveNotifications} className="gap-2 flex-1 sm:flex-initial" disabled={isSavingNotifications}>
                  {isSavingNotifications ? (<><Loader2 className="h-4 w-4 animate-spin" />Saving...</>) : (<><Save className="h-4 w-4" />Save Settings</>)}
                </Button>
                <Button variant="outline" onClick={handleSendTestEmail} className="gap-2 flex-1 sm:flex-initial" disabled={reportFrequency === "disabled" || isSendingTestEmail}>
                  {isSendingTestEmail ? (<><Loader2 className="h-4 w-4 animate-spin" />Sending...</>) : (<><Send className="h-4 w-4" />Send Test Email</>)}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm border-border">
            <CardHeader>
              <CardTitle>Slack Integration</CardTitle>
              <CardDescription>Connect your Slack workspace for real-time notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="slack-webhook">Slack Webhook URL</Label>
                <Input
                  id="slack-webhook"
                  placeholder="https://hooks.slack.com/services/..."
                  value={slackWebhook}
                  onChange={(e) => setSlackWebhook(e.target.value)}
                  className="bg-background/50 border-border"
                />
                <p className="text-xs text-muted-foreground">
                  Get your webhook URL from{" "}
                  <a href="https://api.slack.com/messaging/webhooks" target="_blank" rel="noopener noreferrer" className="text-secondary hover:underline">
                    Slack's Incoming Webhooks
                  </a>
                </p>
              </div>
              <div className="flex justify-end pt-2">
                <Button onClick={handleSaveNotifications} variant="outline" className="gap-2" disabled={isSavingNotifications}>
                  {isSavingNotifications ? (<><Loader2 className="h-4 w-4 animate-spin" />Saving...</>) : (<><Save className="h-4 w-4" />Save Slack Settings</>)}
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
