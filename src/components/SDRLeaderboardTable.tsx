import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowUp, ArrowDown, Users } from "lucide-react";
import { useState, useEffect } from "react";
import { SDRDetailModal } from "@/components/SDRDetailModal";
import { useDateFilter } from "@/contexts/DateFilterContext";
import { EmptyState } from "@/components/EmptyState";
import { SDRAvatar } from "@/components/SDRAvatar";
import { supabase } from "@/lib/supabase";

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
  avgDuration: number;
}

interface SDRLeaderboardTableProps {
  leaderboardData?: LeaderboardEntry[];
}

export const SDRLeaderboardTable = ({ leaderboardData }: SDRLeaderboardTableProps) => {
  const data = leaderboardData || [];
  const [selectedSDR, setSelectedSDR] = useState<LeaderboardEntry | null>(null);
  const { dateRange } = useDateFilter();
  const [photoMap, setPhotoMap] = useState<Record<string, string | null>>({});

  useEffect(() => {
    const fetchPhotos = async () => {
      const { data: members } = await supabase
        .from("team_members")
        .select("sdr_name, profile_photo_url");
      if (members) {
        const map: Record<string, string | null> = {};
        for (const m of members) map[m.sdr_name] = m.profile_photo_url;
        setPhotoMap(map);
      }
    };
    fetchPhotos();
  }, []);

  const getAnswerRateBadge = (rate: string) => {
    const rateNum = parseFloat(rate);
    if (rateNum > 25) {
      return <Badge className="bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30">{rate}%</Badge>;
    } else if (rateNum >= 15) {
      return <Badge className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30">{rate}%</Badge>;
    } else {
      return <Badge className="bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30">{rate}%</Badge>;
    }
  };

  const getRankDisplay = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return rank;
  };

  return (
    <>
      <Card className="bg-card border-border shadow-sm hover:border-yellow-500/20 transition-all">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">SDR Leaderboard</CardTitle>
        </CardHeader>
        <CardContent>
          {data.length === 0 ? (
            <EmptyState 
              icon={Users}
              title="No team data available"
              description="Add team members in Settings to see performance metrics"
            />
          ) : (
            <div className="overflow-x-auto scrollbar-thin scroll-gradient">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16 sticky left-0 bg-card z-10">Rank</TableHead>
                    <TableHead className="sticky left-16 bg-card z-10 min-w-[180px]">SDR Name</TableHead>
                    <TableHead className="text-right">Total Dials</TableHead>
                    <TableHead className="text-right">Answer Rate</TableHead>
                    <TableHead className="text-right">DMs Reached</TableHead>
                    <TableHead className="text-right">SQLs</TableHead>
                    <TableHead className="text-right">Conv. Rate</TableHead>
                    <TableHead className="text-right">Avg Duration</TableHead>
                    <TableHead className="text-right">Trend</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((sdr) => {
                    const isTopPerformer = sdr.rank === 1;
                    
                    return (
                      <TableRow 
                        key={sdr.name}
                        className={`hover:bg-yellow-500/10 transition-colors cursor-pointer ${
                          isTopPerformer ? "bg-green-500/5" : ""
                        }`}
                      >
                        <TableCell className="font-medium text-lg sticky left-0 bg-card z-10">
                          {getRankDisplay(sdr.rank)}
                        </TableCell>
                        <TableCell className="sticky left-16 bg-card z-10">
                          <div 
                            className="flex items-center gap-3 cursor-pointer hover:text-primary transition-colors"
                            onClick={() => setSelectedSDR(sdr)}
                          >
                            <SDRAvatar name={sdr.name} photoUrl={photoMap[sdr.name]} size="md" />
                            <span className="font-medium whitespace-nowrap">{sdr.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{sdr.totalDials}</TableCell>
                        <TableCell className="text-right">
                          {getAnswerRateBadge(sdr.answerRate)}
                        </TableCell>
                        <TableCell className="text-right">{sdr.totalDMs}</TableCell>
                        <TableCell className="text-right">
                          <span className="text-lg font-bold">{sdr.totalSQLs}</span>
                        </TableCell>
                        <TableCell className="text-right">{sdr.conversionRate}%</TableCell>
                        <TableCell className="text-right">
                          {sdr.avgDuration > 0 ? (
                            <span
                              className={`font-medium ${
                                sdr.avgDuration < 30
                                  ? "text-muted-foreground"
                                  : sdr.avgDuration < 120
                                  ? "text-orange-500"
                                  : "text-green-500"
                              }`}
                              title={`${Math.round(sdr.avgDuration)} seconds avg`}
                            >
                              {Math.floor(sdr.avgDuration / 60)}m {Math.round(sdr.avgDuration % 60)}s
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {sdr.trend > 0 ? (
                              <>
                                <ArrowUp className="h-4 w-4 text-green-600" />
                                <span className="text-green-600 font-medium">
                                  {sdr.trend.toFixed(1)}%
                                </span>
                              </>
                            ) : sdr.trend < 0 ? (
                              <>
                                <ArrowDown className="h-4 w-4 text-red-600" />
                                <span className="text-red-600 font-medium">
                                  {Math.abs(sdr.trend).toFixed(1)}%
                                </span>
                              </>
                            ) : (
                              <span className="text-muted-foreground">--</span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedSDR && (
        <SDRDetailModal
          isOpen={!!selectedSDR}
          onClose={() => setSelectedSDR(null)}
          sdr={{
            rank: selectedSDR.rank,
            name: selectedSDR.name,
            initials: selectedSDR.initials,
            dials: selectedSDR.totalDials,
            answered: selectedSDR.totalAnswered,
            dms: selectedSDR.totalDMs,
            sqls: selectedSDR.totalSQLs,
            trend: selectedSDR.trend,
          }}
          globalDateRange={dateRange}
        />
      )}
    </>
  );
};
