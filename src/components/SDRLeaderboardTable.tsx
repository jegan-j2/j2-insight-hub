import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowUp, ArrowDown, Users } from "lucide-react";
import { useState } from "react";
import { SDRDetailModal } from "@/components/SDRDetailModal";
import { useDateFilter } from "@/contexts/DateFilterContext";
import { EmptyState } from "@/components/EmptyState";

interface SDRData {
  rank: number;
  name: string;
  initials: string;
  dials: number;
  answered: number;
  dms: number;
  sqls: number;
  trend: number;
}

const initialData: SDRData[] = [
  { rank: 1, name: "Ava Monyebane", initials: "AM", dials: 320, answered: 75, dms: 48, sqls: 12, trend: 15.2 },
  { rank: 2, name: "Reggie Makhanya", initials: "RM", dials: 285, answered: 68, dms: 42, sqls: 10, trend: 8.5 },
  { rank: 3, name: "Clive Sambane", initials: "CS", dials: 310, answered: 72, dms: 45, sqls: 9, trend: 12.3 },
  { rank: 4, name: "Barry Geduld", initials: "BG", dials: 265, answered: 60, dms: 38, sqls: 8, trend: 45.0 },
  { rank: 5, name: "Ivory Geduld", initials: "IG", dials: 290, answered: 65, dms: 40, sqls: 5, trend: -5.2 },
  { rank: 6, name: "Ben De Beer", initials: "BD", dials: 255, answered: 66, dms: 35, sqls: 2, trend: -12.8 },
];

export const SDRLeaderboardTable = () => {
  const [sortedData] = useState(initialData);
  const [selectedSDR, setSelectedSDR] = useState<SDRData | null>(null);
  const { dateRange } = useDateFilter();

  const getAnswerRateBadge = (answered: number, dials: number) => {
    const rate = (answered / dials) * 100;
    if (rate > 25) {
      return <Badge className="bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30">{rate.toFixed(1)}%</Badge>;
    } else if (rate >= 15) {
      return <Badge className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30">{rate.toFixed(1)}%</Badge>;
    } else {
      return <Badge className="bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30">{rate.toFixed(1)}%</Badge>;
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
          {sortedData.length === 0 ? (
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
                    <TableHead className="text-right">Trend</TableHead>
                  </TableRow>
                </TableHeader>
            <TableBody>
              {sortedData.map((sdr) => {
                const conversionRate = ((sdr.sqls / sdr.dials) * 100).toFixed(2);
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
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {sdr.initials}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium whitespace-nowrap">{sdr.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{sdr.dials}</TableCell>
                    <TableCell className="text-right">
                      {getAnswerRateBadge(sdr.answered, sdr.dials)}
                    </TableCell>
                    <TableCell className="text-right">{sdr.dms}</TableCell>
                    <TableCell className="text-right">
                      <span className="text-lg font-bold">{sdr.sqls}</span>
                    </TableCell>
                    <TableCell className="text-right">{conversionRate}%</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {sdr.trend > 0 ? (
                          <>
                            <ArrowUp className="h-4 w-4 text-green-600" />
                            <span className="text-green-600 font-medium">
                              {sdr.trend.toFixed(1)}%
                            </span>
                          </>
                        ) : (
                          <>
                            <ArrowDown className="h-4 w-4 text-red-600" />
                            <span className="text-red-600 font-medium">
                              {Math.abs(sdr.trend).toFixed(1)}%
                            </span>
                          </>
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
          sdr={selectedSDR}
          globalDateRange={dateRange}
        />
      )}
    </>
  );
};
