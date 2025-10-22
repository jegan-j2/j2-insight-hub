import { useParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight, TrendingUp, Users, Calendar, Phone, Mail, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";

const ClientView = () => {
  const { clientSlug } = useParams();
  
  // Mock client data - in a real app, this would come from an API
  const clientNames: Record<string, string> = {
    "inxpress": "Inxpress",
    "congero": "Congero",
    "techcorp": "TechCorp Solutions",
    "global-logistics": "Global Logistics",
    "finserve": "FinServe Group",
    "healthcare-plus": "HealthCare Plus",
  };

  const clientName = clientNames[clientSlug || ""] || "Unknown Client";

  const stats = [
    {
      title: "Total Leads",
      value: "8,240",
      icon: Users,
      trend: "+14.2%",
      color: "text-secondary",
    },
    {
      title: "ROI",
      value: "520%",
      icon: TrendingUp,
      trend: "+12.5%",
      color: "text-accent",
    },
    {
      title: "Meetings Booked",
      value: "84",
      icon: Calendar,
      trend: "+18.3%",
      color: "text-secondary",
    },
    {
      title: "Revenue Generated",
      value: "$245K",
      icon: DollarSign,
      trend: "+22.1%",
      color: "text-accent",
    },
  ];

  const recentLeads = [
    { company: "ABC Corp", contact: "John Smith", email: "john@abc.com", phone: "+61 400 123 456", date: "Oct 22, 2025", status: "Qualified" },
    { company: "XYZ Ltd", contact: "Sarah Jones", email: "sarah@xyz.com", phone: "+61 400 234 567", date: "Oct 21, 2025", status: "Meeting Booked" },
    { company: "Tech Innovations", contact: "Mike Brown", email: "mike@tech.com", phone: "+61 400 345 678", date: "Oct 20, 2025", status: "Contacted" },
    { company: "Global Systems", contact: "Emma Wilson", email: "emma@global.com", phone: "+61 400 456 789", date: "Oct 19, 2025", status: "Qualified" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">{clientName}</h1>
          <p className="text-muted-foreground">Lead generation campaign performance and analytics</p>
        </div>
        <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
          Generate Report
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card
            key={stat.title}
            className="bg-card/50 backdrop-blur-sm border-border hover:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] transition-all duration-300 hover:scale-[1.02] animate-fade-in"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{stat.value}</div>
              <p className="text-xs text-secondary flex items-center mt-2">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                {stat.trend} from last month
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Leads */}
      <Card className="bg-card/50 backdrop-blur-sm border-border animate-fade-in" style={{ animationDelay: "400ms" }}>
        <CardHeader>
          <CardTitle className="text-foreground">Recent Leads</CardTitle>
          <CardDescription className="text-muted-foreground">
            Latest leads generated for {clientName}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Company</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Contact</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Email</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Phone</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Date</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentLeads.map((lead, index) => (
                  <tr
                    key={index}
                    className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                  >
                    <td className="py-4 px-4 font-medium text-foreground">{lead.company}</td>
                    <td className="py-4 px-4 text-foreground">{lead.contact}</td>
                    <td className="py-4 px-4">
                      <a href={`mailto:${lead.email}`} className="text-secondary hover:underline">
                        {lead.email}
                      </a>
                    </td>
                    <td className="py-4 px-4 text-foreground">{lead.phone}</td>
                    <td className="py-4 px-4 text-muted-foreground">{lead.date}</td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        lead.status === "Meeting Booked" 
                          ? "bg-accent/20 text-accent"
                          : lead.status === "Qualified"
                          ? "bg-secondary/20 text-secondary"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {lead.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Campaign Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card/50 backdrop-blur-sm border-border animate-fade-in" style={{ animationDelay: "500ms" }}>
          <CardHeader>
            <CardTitle className="text-foreground">Campaign Activity</CardTitle>
            <CardDescription className="text-muted-foreground">Recent campaign updates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/20 border border-border">
                <Mail className="h-5 w-5 text-secondary mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">Email Campaign Sent</p>
                  <p className="text-xs text-muted-foreground">Sent to 250 prospects - 68% open rate</p>
                  <p className="text-xs text-muted-foreground mt-1">2 hours ago</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/20 border border-border">
                <Phone className="h-5 w-5 text-accent mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">Cold Calling Session</p>
                  <p className="text-xs text-muted-foreground">42 calls made - 12 qualified leads</p>
                  <p className="text-xs text-muted-foreground mt-1">5 hours ago</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/20 border border-border">
                <Calendar className="h-5 w-5 text-secondary mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">Meetings Scheduled</p>
                  <p className="text-xs text-muted-foreground">8 new meetings booked this week</p>
                  <p className="text-xs text-muted-foreground mt-1">1 day ago</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border animate-fade-in" style={{ animationDelay: "600ms" }}>
          <CardHeader>
            <CardTitle className="text-foreground">Performance Insights</CardTitle>
            <CardDescription className="text-muted-foreground">Key metrics and trends</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Lead Conversion Rate</span>
                  <span className="font-medium text-foreground">24.5%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-secondary h-2 rounded-full" style={{ width: "24.5%" }} />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Meeting Success Rate</span>
                  <span className="font-medium text-foreground">68.3%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-accent h-2 rounded-full" style={{ width: "68.3%" }} />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Email Response Rate</span>
                  <span className="font-medium text-foreground">18.7%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-secondary h-2 rounded-full" style={{ width: "18.7%" }} />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Campaign Efficiency</span>
                  <span className="font-medium text-foreground">92.1%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-accent h-2 rounded-full" style={{ width: "92.1%" }} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ClientView;
