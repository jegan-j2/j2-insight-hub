import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowUp, ArrowDown, ArrowUpDown, Users } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { SDRDetailModal } from "@/components/SDRDetailModal";
import { useDateFilter } from "@/contexts/DateFilterContext";
import { EmptyState } from "@/components/EmptyState";
import { SDRAvatar } from "@/components/SDRAvatar";
import { supabase } from "@/lib/supabase";

interface LeaderboardEntry {
  rank: number;
  name: string;
  clientId?: string;
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

type SortKey = "totalSQLs" | "totalDials" | "totalAnswered" | "answerRate" | "totalDMs" | "conversionRate" | "avgDuration" | "name" | "clientName";
type SortDir = "asc" | "desc";

interface SDRLeaderboardTableProps {
  leaderboardData?: LeaderboardEntry[];
  clientNameMap?: Record<string, string>;
  showClientColumn?: boolean;
}

export const SDRLeaderboardTable = ({ leaderboardData, clientNameMap = {}, showClientColumn = true }: SDRLeaderboardTableProps) => {
  const data = leaderboardData || [];
  const [selectedSDR, setSelectedSDR] = useState<LeaderboardEntry | null>(null);
  const { dateRange } = useDateFilter();
  const [photoMap, setPhotoMap] = useState<Record<string, string | null>>({});
  const [sortKey, setSortKey] = useState<SortKey>("totalSQLs");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

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

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir(key === "name" || key === "clientName" ? "asc" : "desc");
    }
  };

  const sortedData = useMemo(() => {
    const sorted = [...data].sort((a, b) => {
      let aVal: number | string;
      let bVal: number | string;

      switch (sortKey) {
        case "name":
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case "clientName":
          aVal = (clientNameMap[a.clientId || ""] || a.clientId || "").toLowerCase();
          bVal = (clientNameMap[b.clientId || ""] || b.clientId || "").toLowerCase();
          break;
        case "answerRate":
          aVal = parseFloat(a.answerRate);
          bVal = parseFloat(b.answerRate);
          break;
        case "conversionRate":
          aVal = parseFloat(a.conversionRate);
          bVal = parseFloat(b.conversionRate);
          break;
        default:
          aVal = a[sortKey];
          bVal = b[sortKey];
      }

      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;

      // Tiebreaker: totalDials desc
      if (a.totalDials !== b.totalDials) return b.totalDials - a.totalDials;
      return 0;
    });

    return sorted.map((sdr, idx) => ({ ...sdr, displayRank: idx + 1 }));
  }, [data, sortKey, sortDir, clientNameMap]);

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return <ArrowUpDown className="h-3 w-3 ml-1 inline opacity-40" />;
    return sortDir === "asc"
      ? <ArrowUp className="h-3 w-3 ml-1 inline" />
      : <ArrowDown className="h-3 w-3 ml-1 inline" />;
  };

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
                <TableHeader className="table-header-navy">
                  <TableRow>
                    <TableHead className="w-16 sticky left-0 z-10 px-4 py-3 text-center bg-[#0F172A] cursor-pointer select-none" onClick={() => handleSort("totalSQLs")}>
                      Rank
                    </TableHead>
                    <TableHead className="sticky left-16 z-10 min-w-[180px] px-4 py-3 text-left bg-[#0F172A] cursor-pointer select-none" onClick={() => handleSort("name")}>
                      SDR Name <SortIcon column="name" />
                    </TableHead>
                    {showClientColumn && (
                      <TableHead className="px-4 py-3 text-left cursor-pointer select-none" onClick={() => handleSort("clientName")}>
                        Client <SortIcon column="clientName" />
                      </TableHead>
                    )}
                    <TableHead className="px-4 py-3 text-right cursor-pointer select-none" onClick={() => handleSort("totalDials")}>
                      Total Dials <SortIcon column="totalDials" />
                    </TableHead>
                    <TableHead className="px-4 py-3 text-right cursor-pointer select-none" onClick={() => handleSort("totalAnswered")}>
                      Answered <SortIcon column="totalAnswered" />
                    </TableHead>
                    <TableHead className="px-4 py-3 text-right cursor-pointer select-none" onClick={() => handleSort("answerRate")}>
                      Answer Rate <SortIcon column="answerRate" />
                    </TableHead>
                    <TableHead className="px-4 py-3 text-right cursor-pointer select-none" onClick={() => handleSort("totalDMs")}>
                      DM Conversations <SortIcon column="totalDMs" />
                    </TableHead>
                    <TableHead className="px-4 py-3 text-right cursor-pointer select-none" onClick={() => handleSort("totalSQLs")}>
                      SQLs <SortIcon column="totalSQLs" />
                    </TableHead>
                    <TableHead className="px-4 py-3 text-right cursor-pointer select-none" onClick={() => handleSort("conversionRate")}>
                      Conv. Rate <SortIcon column="conversionRate" />
                    </TableHead>
                    <TableHead className="px-4 py-3 text-right cursor-pointer select-none" onClick={() => handleSort("avgDuration")}>
                      Avg Talk Time <SortIcon column="avgDuration" />
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="table-striped">
                  {sortedData.map((sdr) => {
                    const clientName = clientNameMap[sdr.clientId || ""] || sdr.clientId || "";

                    return (
                      <TableRow
                        key={`${sdr.name}-${sdr.clientId}`}
                        className="transition-colors cursor-pointer"
                      >
                        <TableCell className="font-medium text-lg sticky left-0 z-10 text-center">
                          {getRankDisplay(sdr.displayRank)}
                        </TableCell>
                        <TableCell className="sticky left-16 z-10 text-left">
                          <div
                            className="flex items-center gap-3 cursor-pointer hover:text-primary transition-colors"
                            onClick={() => setSelectedSDR(sdr)}
                          >
                            <SDRAvatar name={sdr.name} photoUrl={photoMap[sdr.name]} size="md" />
                            <span className="font-medium whitespace-nowrap">{sdr.name}</span>
                          </div>
                        </TableCell>
                        {showClientColumn && (
                          <TableCell className="text-left whitespace-nowrap">{clientName}</TableCell>
                        )}
                        <TableCell className="text-right">{sdr.totalDials.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{sdr.totalAnswered.toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          {getAnswerRateBadge(sdr.answerRate)}
                        </TableCell>
                        <TableCell className="text-right">
                          {sdr.totalDMs === 0
                            ? <span className="text-muted-foreground">—</span>
                            : sdr.totalDMs}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-lg font-bold">{sdr.totalSQLs}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          {sdr.conversionRate === "0.00" || sdr.conversionRate === "0"
                            ? <span className="text-muted-foreground">—</span>
                            : `${sdr.conversionRate}%`}
                        </TableCell>
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
