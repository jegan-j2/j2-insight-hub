import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown, TrendingUp, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { SDRDetailModal } from "@/components/SDRDetailModal";
import { useDateFilter } from "@/contexts/DateFilterContext";

export const SDRQuickStatsCards = () => {
  const [selectedSDR, setSelectedSDR] = useState<string | null>(null);
  const { dateRange } = useDateFilter();

  // Mock SDR data
  const topPerformer = { name: "Ava Monyebane", initials: "AM", rank: 1, dials: 320, answered: 75, dms: 48, sqls: 12, trend: 15.2 };
  const mostImproved = { name: "Barry Geduld", initials: "BG", rank: 4, dials: 265, answered: 60, dms: 38, sqls: 8, trend: 45.0 };
  const coachingFocus = { name: "Ben De Beer", initials: "BD", rank: 6, dials: 255, answered: 66, dms: 35, sqls: 2, trend: -12.8 };

  return (
    <>
      <div className="space-y-4">
      {/* Top Performer Card */}
      <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-yellow-500/20">
              <Crown className="h-5 w-5 text-yellow-600" />
            </div>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Top Performer
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-2xl font-bold text-foreground">Ava Monyebane</p>
            <p className="text-sm text-muted-foreground mt-1">12 SQLs Generated</p>
          </div>
          <Button 
            variant="link" 
            className="h-auto p-0 text-green-600 hover:text-green-700"
            onClick={() => setSelectedSDR("ava")}
          >
            View Profile →
          </Button>
        </CardContent>
      </Card>

      {/* Most Improved Card */}
      <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </div>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Most Improved
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-2xl font-bold text-foreground">Barry Geduld</p>
            <p className="text-sm text-muted-foreground mt-1">+45% vs Last Week</p>
          </div>
          <Button 
            variant="link" 
            className="h-auto p-0 text-blue-600 hover:text-blue-700"
            onClick={() => setSelectedSDR("barry")}
          >
            View Details →
          </Button>
        </CardContent>
      </Card>

      {/* Coaching Opportunity Card */}
      <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-500/20">
              <Target className="h-5 w-5 text-amber-600" />
            </div>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Development Focus
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-2xl font-bold text-foreground">Ben De Beer</p>
            <p className="text-sm text-muted-foreground mt-1">2 SQLs (Target: 8)</p>
            <p className="text-xs text-amber-700 dark:text-amber-500 mt-2">
              Schedule coaching session
            </p>
          </div>
          <Button 
            size="sm"
            className="w-full bg-amber-600 hover:bg-amber-700 text-white"
            onClick={() => setSelectedSDR("ben")}
          >
            Schedule 1-on-1
          </Button>
        </CardContent>
        </Card>
      </div>

      {/* SDR Detail Modals */}
      {selectedSDR === "ava" && (
        <SDRDetailModal
          isOpen={true}
          onClose={() => setSelectedSDR(null)}
          sdr={topPerformer}
          globalDateRange={dateRange}
        />
      )}
      {selectedSDR === "barry" && (
        <SDRDetailModal
          isOpen={true}
          onClose={() => setSelectedSDR(null)}
          sdr={mostImproved}
          globalDateRange={dateRange}
        />
      )}
      {selectedSDR === "ben" && (
        <SDRDetailModal
          isOpen={true}
          onClose={() => setSelectedSDR(null)}
          sdr={coachingFocus}
          globalDateRange={dateRange}
        />
      )}
    </>
  );
};
