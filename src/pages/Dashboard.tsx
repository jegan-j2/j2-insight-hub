import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight, Users, TrendingUp, Target, Building2 } from "lucide-react";

const Dashboard = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    navigate("/");
  };

  const stats = [
    {
      title: "Total Leads",
      value: "45,580+",
      icon: Users,
      trend: "+12.5%",
      color: "text-secondary",
    },
    {
      title: "Average ROI",
      value: "486%",
      icon: TrendingUp,
      trend: "+8.2%",
      color: "text-accent",
    },
    {
      title: "Meetings/Month",
      value: "19",
      icon: Target,
      trend: "+15.3%",
      color: "text-secondary",
    },
    {
      title: "Active Clients",
      value: "24",
      icon: Building2,
      trend: "+3",
      color: "text-accent",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/10">
      {/* Header */}
      <header className="border-b border-border bg-card/30 backdrop-blur-lg sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-secondary to-secondary/70 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">J2 Group</h1>
              <p className="text-xs text-muted-foreground">Lead Generation Dashboard</p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={handleLogout}
            className="border-border hover:bg-muted/50"
          >
            Logout
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="mb-8 animate-fade-in">
          <h2 className="text-3xl font-bold text-foreground mb-2">Welcome back!</h2>
          <p className="text-muted-foreground">Here's what's happening with your lead generation today.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
                <p className="text-xs text-secondary flex items-center mt-1">
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                  {stat.trend} from last month
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Activity */}
        <Card className="bg-card/50 backdrop-blur-sm border-border animate-fade-in" style={{ animationDelay: "400ms" }}>
          <CardHeader>
            <CardTitle className="text-foreground">Recent Activity</CardTitle>
            <CardDescription className="text-muted-foreground">
              Your latest lead generation campaigns and results
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/20 border border-border">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">Tech Startup Campaign</p>
                  <p className="text-xs text-muted-foreground">Generated 127 leads this week</p>
                </div>
                <Button variant="ghost" size="sm" className="text-secondary hover:text-secondary/80">
                  View Details
                </Button>
              </div>
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/20 border border-border">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">Finance Sector Outreach</p>
                  <p className="text-xs text-muted-foreground">94 qualified appointments booked</p>
                </div>
                <Button variant="ghost" size="sm" className="text-secondary hover:text-secondary/80">
                  View Details
                </Button>
              </div>
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/20 border border-border">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">Healthcare Lead Gen</p>
                  <p className="text-xs text-muted-foreground">New campaign launched today</p>
                </div>
                <Button variant="ghost" size="sm" className="text-secondary hover:text-secondary/80">
                  View Details
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Dashboard;
