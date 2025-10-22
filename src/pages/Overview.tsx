import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight, Users, TrendingUp, Target, DollarSign, Calendar, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";

const Overview = () => {
  const stats = [
    {
      title: "Total Leads Generated",
      value: "45,580",
      icon: Users,
      trend: "+12.5%",
      color: "text-secondary",
      description: "Across all clients",
    },
    {
      title: "Average Client ROI",
      value: "486%",
      icon: TrendingUp,
      trend: "+8.2%",
      color: "text-accent",
      description: "Return on investment",
    },
    {
      title: "Meetings Booked",
      value: "456",
      icon: Calendar,
      trend: "+15.3%",
      color: "text-secondary",
      description: "This month",
    },
    {
      title: "Total Revenue",
      value: "$1.2M",
      icon: DollarSign,
      trend: "+18.7%",
      color: "text-accent",
      description: "Monthly recurring",
    },
  ];

  const clients = [
    { name: "Inxpress", leads: 8240, roi: 520, meetings: 84, status: "active" },
    { name: "Congero", leads: 6890, roi: 468, meetings: 72, status: "active" },
    { name: "TechCorp Solutions", leads: 7150, roi: 492, meetings: 78, status: "active" },
    { name: "Global Logistics", leads: 5920, roi: 445, meetings: 61, status: "active" },
    { name: "FinServe Group", leads: 8890, roi: 534, meetings: 92, status: "active" },
    { name: "HealthCare Plus", leads: 8490, roi: 501, meetings: 69, status: "active" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Overview Dashboard</h1>
        <p className="text-muted-foreground">Monitor all client campaigns and performance metrics</p>
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
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-secondary flex items-center">
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                  {stat.trend}
                </p>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Client Performance Table */}
      <Card className="bg-card/50 backdrop-blur-sm border-border animate-fade-in" style={{ animationDelay: "400ms" }}>
        <CardHeader>
          <CardTitle className="text-foreground">Client Performance</CardTitle>
          <CardDescription className="text-muted-foreground">
            Real-time metrics for all active clients
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Client</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Total Leads</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">ROI %</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Meetings</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client, index) => (
                  <tr
                    key={client.name}
                    className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                    style={{ animationDelay: `${500 + index * 50}ms` }}
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-secondary/20 to-secondary/10 flex items-center justify-center">
                          <Target className="h-4 w-4 text-secondary" />
                        </div>
                        <span className="font-medium text-foreground">{client.name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-foreground">{client.leads.toLocaleString()}</td>
                    <td className="py-4 px-4 text-accent font-semibold">{client.roi}%</td>
                    <td className="py-4 px-4 text-foreground">{client.meetings}</td>
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary/20 text-secondary">
                        Active
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <Button variant="ghost" size="sm" className="text-secondary hover:text-secondary/80">
                        View Details
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Overview;
