import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Bell, Lock, User, Building2 } from "lucide-react";

const Settings = () => {
  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
        <p className="text-muted-foreground">Manage your dashboard preferences and account settings</p>
      </div>

      {/* Company Information */}
      <Card className="bg-card/50 backdrop-blur-sm border-border">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-secondary" />
            <CardTitle className="text-foreground">Company Information</CardTitle>
          </div>
          <CardDescription className="text-muted-foreground">
            Update your company details and branding
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="company-name" className="text-foreground">Company Name</Label>
            <Input
              id="company-name"
              defaultValue="J2 Group"
              className="bg-input border-border text-foreground"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="website" className="text-foreground">Website</Label>
            <Input
              id="website"
              defaultValue="https://www.j2group.com.au"
              className="bg-input border-border text-foreground"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-foreground">Contact Email</Label>
            <Input
              id="email"
              type="email"
              defaultValue="admin@j2group.com.au"
              className="bg-input border-border text-foreground"
            />
          </div>
          <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
            Save Changes
          </Button>
        </CardContent>
      </Card>

      {/* Account Settings */}
      <Card className="bg-card/50 backdrop-blur-sm border-border">
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-secondary" />
            <CardTitle className="text-foreground">Account Settings</CardTitle>
          </div>
          <CardDescription className="text-muted-foreground">
            Manage your personal account information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full-name" className="text-foreground">Full Name</Label>
            <Input
              id="full-name"
              defaultValue="Admin User"
              className="bg-input border-border text-foreground"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="user-email" className="text-foreground">Email Address</Label>
            <Input
              id="user-email"
              type="email"
              defaultValue="admin@j2group.com.au"
              className="bg-input border-border text-foreground"
            />
          </div>
          <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
            Update Account
          </Button>
        </CardContent>
      </Card>

      {/* Security */}
      <Card className="bg-card/50 backdrop-blur-sm border-border">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-secondary" />
            <CardTitle className="text-foreground">Security</CardTitle>
          </div>
          <CardDescription className="text-muted-foreground">
            Manage your password and security preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password" className="text-foreground">Current Password</Label>
            <Input
              id="current-password"
              type="password"
              className="bg-input border-border text-foreground"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password" className="text-foreground">New Password</Label>
            <Input
              id="new-password"
              type="password"
              className="bg-input border-border text-foreground"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password" className="text-foreground">Confirm New Password</Label>
            <Input
              id="confirm-password"
              type="password"
              className="bg-input border-border text-foreground"
            />
          </div>
          <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
            Change Password
          </Button>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card className="bg-card/50 backdrop-blur-sm border-border">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-secondary" />
            <CardTitle className="text-foreground">Notifications</CardTitle>
          </div>
          <CardDescription className="text-muted-foreground">
            Configure how you receive updates and alerts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-foreground">Email Notifications</Label>
              <p className="text-sm text-muted-foreground">Receive email updates about new leads</p>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator className="bg-border" />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-foreground">Weekly Reports</Label>
              <p className="text-sm text-muted-foreground">Get weekly performance summaries</p>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator className="bg-border" />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-foreground">Meeting Reminders</Label>
              <p className="text-sm text-muted-foreground">Notifications for upcoming meetings</p>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator className="bg-border" />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-foreground">Campaign Updates</Label>
              <p className="text-sm text-muted-foreground">Alerts for campaign milestones</p>
            </div>
            <Switch />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
