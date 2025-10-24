import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Building2, Plus, Pencil, Trash2, Users, Mail, Bell, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Client {
  id: string;
  name: string;
  slug: string;
  sheetUrl: string;
  logoUrl?: string;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
}

const Settings = () => {
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([
    { id: "1", name: "Inxpress", slug: "inxpress", sheetUrl: "https://docs.google.com/spreadsheets/d/...", logoUrl: undefined },
    { id: "2", name: "Congero", slug: "congero", sheetUrl: "https://docs.google.com/spreadsheets/d/...", logoUrl: undefined },
    { id: "3", name: "TechCorp Solutions", slug: "techcorp-solutions", sheetUrl: "https://docs.google.com/spreadsheets/d/...", logoUrl: undefined },
  ]);

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([
    { id: "1", name: "Ava Monyebane", email: "ava@j2group.com.au", role: "Senior SDR" },
    { id: "2", name: "Reggie Makhanya", email: "reggie@j2group.com.au", role: "SDR" },
    { id: "3", name: "Clive Sambane", email: "clive@j2group.com.au", role: "SDR" },
  ]);

  const [dailyReports, setDailyReports] = useState(true);
  const [reportEmails, setReportEmails] = useState("admin@j2group.com.au");
  const [slackWebhook, setSlackWebhook] = useState("");

  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false);
  const [isTeamDialogOpen, setIsTeamDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);

  // Form states
  const [clientForm, setClientForm] = useState({ name: "", sheetUrl: "", logoFile: null as File | null });
  const [memberForm, setMemberForm] = useState({ name: "", email: "", role: "" });

  const handleAddClient = () => {
    setEditingClient(null);
    setClientForm({ name: "", sheetUrl: "", logoFile: null });
    setIsClientDialogOpen(true);
  };

  const handleEditClient = (client: Client) => {
    setEditingClient(client);
    setClientForm({ name: client.name, sheetUrl: client.sheetUrl, logoFile: null });
    setIsClientDialogOpen(true);
  };

  const handleSaveClient = () => {
    if (editingClient) {
      setClients(clients.map(c => c.id === editingClient.id ? { ...c, ...clientForm, slug: clientForm.name.toLowerCase().replace(/\s+/g, '-') } : c));
      toast({ title: "Client updated", description: `${clientForm.name} has been updated successfully.` });
    } else {
      const newClient: Client = {
        id: Date.now().toString(),
        name: clientForm.name,
        slug: clientForm.name.toLowerCase().replace(/\s+/g, '-'),
        sheetUrl: clientForm.sheetUrl,
        logoUrl: undefined,
      };
      setClients([...clients, newClient]);
      toast({ title: "Client added", description: `${clientForm.name} has been added successfully.` });
    }
    setIsClientDialogOpen(false);
  };

  const handleDeleteClient = (id: string) => {
    const client = clients.find(c => c.id === id);
    setClients(clients.filter(c => c.id !== id));
    toast({ title: "Client deleted", description: `${client?.name} has been removed.`, variant: "destructive" });
  };

  const handleAddMember = () => {
    setEditingMember(null);
    setMemberForm({ name: "", email: "", role: "" });
    setIsTeamDialogOpen(true);
  };

  const handleEditMember = (member: TeamMember) => {
    setEditingMember(member);
    setMemberForm({ name: member.name, email: member.email, role: member.role });
    setIsTeamDialogOpen(true);
  };

  const handleSaveMember = () => {
    if (editingMember) {
      setTeamMembers(teamMembers.map(m => m.id === editingMember.id ? { ...m, ...memberForm } : m));
      toast({ title: "Team member updated", description: `${memberForm.name} has been updated successfully.` });
    } else {
      const newMember: TeamMember = {
        id: Date.now().toString(),
        ...memberForm,
      };
      setTeamMembers([...teamMembers, newMember]);
      toast({ title: "Team member added", description: `${memberForm.name} has been added successfully.` });
    }
    setIsTeamDialogOpen(false);
  };

  const handleDeleteMember = (id: string) => {
    const member = teamMembers.find(m => m.id === id);
    setTeamMembers(teamMembers.filter(m => m.id !== id));
    toast({ title: "Team member removed", description: `${member?.name} has been removed.`, variant: "destructive" });
  };

  const handleSaveNotifications = () => {
    toast({ title: "Settings saved", description: "Notification preferences have been updated." });
  };

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
                          value={clientForm.name}
                          onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
                          className="bg-background/50 border-border"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="sheet-url">Google Sheet URL *</Label>
                        <Input
                          id="sheet-url"
                          placeholder="https://docs.google.com/spreadsheets/d/..."
                          value={clientForm.sheetUrl}
                          onChange={(e) => setClientForm({ ...clientForm, sheetUrl: e.target.value })}
                          className="bg-background/50 border-border"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="logo-upload">Client Logo (Optional)</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            id="logo-upload"
                            type="file"
                            accept="image/*"
                            onChange={(e) => setClientForm({ ...clientForm, logoFile: e.target.files?.[0] || null })}
                            className="bg-background/50 border-border"
                          />
                          {clientForm.logoFile && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setClientForm({ ...clientForm, logoFile: null })}
                              aria-label="Remove logo"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">Upload a PNG or JPG file (max 2MB)</p>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsClientDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleSaveClient}
                        disabled={!clientForm.name || !clientForm.sheetUrl}
                      >
                        {editingClient ? "Update Client" : "Add Client"}
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
                      <TableHead className="text-muted-foreground">Google Sheet URL</TableHead>
                      <TableHead className="text-muted-foreground">Logo</TableHead>
                      <TableHead className="text-right text-muted-foreground">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clients.map((client) => (
                      <TableRow key={client.id} className="border-border/50 hover:bg-muted/20 transition-colors">
                        <TableCell className="font-medium text-foreground">{client.name}</TableCell>
                        <TableCell className="text-muted-foreground max-w-xs truncate">{client.sheetUrl}</TableCell>
                        <TableCell>
                          {client.logoUrl ? (
                            <img src={client.logoUrl} alt={`${client.name} logo`} className="h-8 w-8 rounded object-cover" />
                          ) : (
                            <div className="h-8 w-8 rounded bg-muted/20 flex items-center justify-center">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditClient(client)}
                              aria-label={`Edit ${client.name}`}
                            >
                              <Pencil className="h-4 w-4 text-secondary" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteClient(client.id)}
                              aria-label={`Delete ${client.name}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
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
                          value={memberForm.name}
                          onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })}
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
                        disabled={!memberForm.name || !memberForm.email || !memberForm.role}
                      >
                        {editingMember ? "Update Member" : "Add Member"}
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
                      <TableHead className="text-right text-muted-foreground">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teamMembers.map((member) => (
                      <TableRow key={member.id} className="border-border/50 hover:bg-muted/20 transition-colors">
                        <TableCell className="font-medium text-foreground">{member.name}</TableCell>
                        <TableCell className="text-muted-foreground">{member.email}</TableCell>
                        <TableCell className="text-muted-foreground">{member.role}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditMember(member)}
                              aria-label={`Edit ${member.name}`}
                            >
                              <Pencil className="h-4 w-4 text-secondary" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteMember(member.id)}
                              aria-label={`Delete ${member.name}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
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
              <CardTitle>Email Reports</CardTitle>
              <CardDescription>Configure daily email report settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="daily-reports" className="text-base font-medium">Daily Email Reports</Label>
                  <p className="text-sm text-muted-foreground">Send automated reports every day at 4:00 PM AEDT</p>
                </div>
                <Switch
                  id="daily-reports"
                  checked={dailyReports}
                  onCheckedChange={setDailyReports}
                  aria-label="Toggle daily email reports"
                />
              </div>
              
              {dailyReports && (
                <div className="grid gap-2 animate-fade-in">
                  <Label htmlFor="report-emails">Email Recipients</Label>
                  <Input
                    id="report-emails"
                    type="email"
                    placeholder="admin@j2group.com.au, manager@j2group.com.au"
                    value={reportEmails}
                    onChange={(e) => setReportEmails(e.target.value)}
                    className="bg-background/50 border-border"
                  />
                  <p className="text-xs text-muted-foreground">Separate multiple emails with commas</p>
                </div>
              )}
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
                  <a 
                    href="https://api.slack.com/messaging/webhooks" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-secondary hover:underline"
                  >
                    Slack's Incoming Webhooks
                  </a>
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSaveNotifications} className="gap-2">
              <Mail className="h-4 w-4" />
              Save Notification Settings
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
