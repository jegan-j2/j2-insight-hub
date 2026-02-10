import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown, TrendingUp, Target } from "lucide-react";
import { useState, useMemo } from "react";
import { SDRDetailModal } from "@/components/SDRDetailModal";
import { useDateFilter } from "@/contexts/DateFilterContext";

interface LeaderboardEntry {
  rank: number;
  name: string;
  initials: string;
  totalDials: number;
  totalAnswered: number;
  totalDMs: number;
  totalSQLs: number;
  answerRate: string;
  conversionRate: string;
  trend: number;
}

interface SDRQuickStatsCardsProps {
  leaderboardData?: LeaderboardEntry[];
}

// Fallback mock data
const fallbackLeaderboard: LeaderboardEntry[] = [
  { rank: 1, name: "Ava Monyebane", initials: "AM", totalDials: 320, totalAnswered: 75, totalDMs: 48, totalSQLs: 12, answerRate: "23.4", conversionRate: "3.75", trend: 15.2 },
  { rank: 2, name: "Reggie Makhanya", initials: "RM", totalDials: 285, totalAnswered: 68, totalDMs: 42, totalSQLs: 10, answerRate: "23.9", conversionRate: "3.51", trend: 8.5 },
  { rank: 3, name: "Clive Sambane", initials: "CS", totalDials: 310, totalAnswered: 72, totalDMs: 45, totalSQLs: 9, answerRate: "23.2", conversionRate: "2.90", trend: 12.3 },
  { rank: 4, name: "Barry Geduld", initials: "BG", totalDials: 265, totalAnswered: 60, totalDMs: 38, totalSQLs: 8, answerRate: "22.6", conversionRate: "3.02", trend: 45.0 },
  { rank: 5, name: "Ivory Geduld", initials: "IG", totalDials: 290, totalAnswered: 65, totalDMs: 40, totalSQLs: 5, answerRate: "22.4", conversionRate: "1.72", trend: -5.2 },
  { rank: 6, name: "Ben De Beer", initials: "BD", totalDials: 255, totalAnswered: 66, totalDMs: 35, totalSQLs: 2, answerRate: "25.9", conversionRate: "0.78", trend: -12.8 },
];

export const SDRQuickStatsCards = ({ leaderboardData }: SDRQuickStatsCardsProps) => {
  const data = leaderboardData || fallbackLeaderboard;
  const [selectedSDR, setSelectedSDR] = useState<string | null>(null);
  const { dateRange } = useDateFilter();

  const topPerformer = data[0] || null;
  const mostImproved = useMemo(() => {
    if (data.length === 0) return null;
    return [...data].sort((a, b) => b.trend - a.trend)[0];
  }, [data]);
  const coachingFocus = useMemo(() => {
    if (data.length === 0) return null;
    return [...data].sort((a, b) => a.totalSQLs - b.totalSQLs)[0];
  }, [data]);

  const toModalSdr = (entry: LeaderboardEntry) => ({
    rank: entry.rank,
    name: entry.name,
    initials: entry.initials,
    dials: entry.totalDials,
    answered: entry.totalAnswered,
    dms: entry.totalDMs,
    sqls: entry.totalSQLs,
    trend: entry.trend,
  });

  if (data.length === 0) return null;

  return (
    <>
      <div className="space-y-4">
      {/* Top Performer Card */}
      {topPerformer && (
      <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20 shadow-sm hover:shadow-md hover:border-yellow-500/40 transition-all">
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
            <p className="text-2xl font-bold text-foreground">{topPerformer.name}</p>
            <p className="text-sm text-muted-foreground mt-1">{topPerformer.totalSQLs} SQLs Generated</p>
          </div>
          <Button 
            variant="link" 
            className="h-auto p-0 text-green-600 hover:text-green-700"
            onClick={() => setSelectedSDR("top")}
          >
            View Profile →
          </Button>
        </CardContent>
      </Card>
      )}

      {/* Most Improved Card */}
      {mostImproved && mostImproved.trend > 0 && (
      <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20 shadow-sm hover:shadow-md hover:border-yellow-500/40 transition-all">
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
            <p className="text-2xl font-bold text-foreground">{mostImproved.name}</p>
            <p className="text-sm text-muted-foreground mt-1">+{mostImproved.trend.toFixed(0)}% vs Last Week</p>
          </div>
          <Button 
            variant="link" 
            className="h-auto p-0 text-blue-600 hover:text-blue-700"
            onClick={() => setSelectedSDR("improved")}
          >
            View Details →
          </Button>
        </CardContent>
      </Card>
      )}

      {/* Coaching Opportunity Card */}
      {coachingFocus && (
      <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20 shadow-sm hover:shadow-md hover:border-yellow-500/40 transition-all">
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
            <p className="text-2xl font-bold text-foreground">{coachingFocus.name}</p>
            <p className="text-sm text-muted-foreground mt-1">{coachingFocus.totalSQLs} SQLs (Target: 8)</p>
            <p className="text-xs text-amber-700 dark:text-amber-500 mt-2">
              Schedule coaching session
            </p>
          </div>
          <Button 
            size="sm"
            className="w-full bg-amber-600 hover:bg-amber-700 text-white"
            onClick={() => setSelectedSDR("coaching")}
          >
            Schedule 1-on-1
          </Button>
        </CardContent>
        </Card>
      )}
      </div>

      {/* SDR Detail Modals */}
      {selectedSDR === "top" && topPerformer && (
        <SDRDetailModal
          isOpen={true}
          onClose={() => setSelectedSDR(null)}
          sdr={toModalSdr(topPerformer)}
          globalDateRange={dateRange}
        />
      )}
      {selectedSDR === "improved" && mostImproved && (
        <SDRDetailModal
          isOpen={true}
          onClose={() => setSelectedSDR(null)}
          sdr={toModalSdr(mostImproved)}
          globalDateRange={dateRange}
        />
      )}
      {selectedSDR === "coaching" && coachingFocus && (
        <SDRDetailModal
          isOpen={true}
          onClose={() => setSelectedSDR(null)}
          sdr={toModalSdr(coachingFocus)}
          globalDateRange={dateRange}
        />
      )}
    </>
  );
};
