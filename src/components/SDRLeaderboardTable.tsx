import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowUp, ArrowDown, ArrowUpDown, Users, TrendingUp } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { SDRDetailModal } from "@/components/SDRDetailModal";
import { useDateFilter } from "@/contexts/DateFilterContext";
import { EmptyState } from "@/components/EmptyState";
import { SDRAvatar } from "@/components/SDRAvatar";
import { supabase } from "@/lib/supabase";
import { differenceInDays } from "date-fns";

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

interface MostImprovedInfo {
  name: string;
  clientId: string;
  improvement: number;
}

interface SDRLeaderboardTableProps {
  leaderboardData?: LeaderboardEntry[];
  clientNameMap?: Record<string, string>;
  showClientColumn?: boolean;
  mostImproved?: MostImprovedInfo | null;
}

export const SDRLeaderboardTable = ({ leaderboardData, clientNameMap = {}, showClientColumn = true, mostImproved }: SDRLeaderboardTableProps) => {
  const data = leaderboardData || [];
  const [selectedSDR, setSelectedSDR] = useState<LeaderboardEntry | null>(null);
  const { dateRange } = useDateFilter();
  const [photoMap, setPhotoMap] = useState<Record<string, string | null>>({});
  const [sortKey, setSortKey] = useState<SortKey>("totalSQLs");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  // Map of "sdrName|||clientId" -> { lastBookingDate: string | null }
  const [lastSQLMap, setLastSQLMap] = useState<Record<string, string | null>>({});

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

  // Fetch last SQL booking date for SDRs with 0 SQLs in current period
  useEffect(() => {
    const zeroSQLSDRs = data.filter(sdr => sdr.totalSQLs === 0);
    if (zeroSQLSDRs.length === 0) {
      setLastSQLMap({});
      return;
    }

    const fetchLastSQLs = async () => {
      // Get most recent non-cancelled booking per SDR
      const sdrNames = [...new Set(zeroSQLSDRs.map(s => s.name))];
      const { data: meetings } = await supabase
        .from("sql_meetings")
        .select("sdr_name, client_id, booking_date")
        .in("sdr_name", sdrNames)
        .not("meeting_status", "eq", "cancelled")
        .order("booking_date", { ascending: false });

      const map: Record<string, string | null> = {};
      // Initialize all zero-SQL SDRs as null (no SQLs ever)
      for (const sdr of zeroSQLSDRs) {
        const key = `${sdr.name}|||${sdr.clientId || ""}`;
        if (!(key in map)) map[key] = null;
      }

      if (meetings) {
        for (const m of meetings) {
          const key = `${m.sdr_name}|||${m.client_id || ""}`;
          // Only keep the first (most recent) per key
          if (key in map && map[key] === null) {
            map[key] = m.booking_date;
          }
        }
      }
      setLastSQLMap(map);
    };
    fetchLastSQLs();
  }, [data]);

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
    if (rateNum === 0) {
      return <Badge className="bg-[#FEE2E2] text-[#991B1B] border-[#FEE2E2] dark:bg-[#991B1B]/20 dark:text-red-400">{rate}%</Badge>;
    } else if (rateNum >= 85) {
      return <Badge className="bg-[#D1FAE5] text-[#065F46] border-[#D1FAE5] dark:bg-[#065F46]/20 dark:text-emerald-400">{rate}%</Badge>;
    } else if (rateNum >= 70) {
      return <Badge className="bg-[#DBEAFE] text-[#1E40AF] border-[#DBEAFE] dark:bg-[#1E40AF]/20 dark:text-blue-400">{rate}%</Badge>;
    } else {
      return <Badge className="bg-[#FEF3C7] text-[#92400E] border-[#FEF3C7] dark:bg-[#92400E]/20 dark:text-amber-400">{rate}%</Badge>;
    }
  };

  const getRankDisplay = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return rank;
  };

  const getRowStyle = (rank: number) => {
    if (rank <= 3) return "h-[60px]";
    return "h-[48px]";
  };

  const getLastSQLText = (sdr: LeaderboardEntry & { displayRank: number }) => {
    if (sdr.totalSQLs > 0) return null;
    const key = `${sdr.name}|||${sdr.clientId || ""}`;
    const lastDate = lastSQLMap[key];
    if (lastDate === undefined) return null; // still loading
    if (lastDate === null) {
      return <span className="text-[11px] text-muted-foreground italic block mt-0.5">No SQLs yet</span>;
    }
    const daysAgo = differenceInDays(new Date(), new Date(lastDate));
    return <span className="text-[11px] text-muted-foreground block mt-0.5">Last SQL: {daysAgo} days ago</span>;
  };

  return (
    <>
      <Card className="bg-card border-border shadow-sm hover:border-yellow-500/20 transition-all">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl font-semibold">SDR Leaderboard</CardTitle>
          {mostImproved && (
            <div className="flex items-center gap-2 border-l-4 border-l-emerald-500 pl-3 py-1">
              <TrendingUp className="h-4 w-4 text-emerald-500 shrink-0" />
              <span className="text-sm font-semibold text-foreground">
                Most Improved: {mostImproved.name}
              </span>
              <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                +{mostImproved.improvement.toFixed(1)}%
              </span>
            </div>
          )}
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
                    <TableHead className="w-16 sticky left-0 z-10 text-center cursor-pointer select-none bg-[#0F172A] text-white font-bold text-[14px] h-[44px]" style={{ padding: "12px 16px" }} onClick={() => handleSort("totalSQLs")}>Rank</TableHead>
                    <TableHead className="sticky left-16 z-10 min-w-[180px] text-left cursor-pointer select-none bg-[#0F172A] text-white font-bold text-[14px] h-[44px]" style={{ padding: "12px 16px" }} onClick={() => handleSort("name")}>SDR Name <SortIcon column="name" /></TableHead>
                    {showClientColumn && (
                      <TableHead className="text-left cursor-pointer select-none bg-[#0F172A] text-white font-bold text-[14px] h-[44px]" style={{ padding: "12px 16px" }} onClick={() => handleSort("clientName")}>Client <SortIcon column="clientName" /></TableHead>
                    )}
                    <TableHead className="text-right cursor-pointer select-none bg-[#0F172A] text-white font-bold text-[14px] h-[44px]" style={{ padding: "12px 16px" }} onClick={() => handleSort("totalDials")}>Total Dials <SortIcon column="totalDials" /></TableHead>
                    <TableHead className="text-right cursor-pointer select-none bg-[#0F172A] text-white font-bold text-[14px] h-[44px]" style={{ padding: "12px 16px" }} onClick={() => handleSort("totalAnswered")}>Answered <SortIcon column="totalAnswered" /></TableHead>
                    <TableHead className="text-right cursor-pointer select-none bg-[#0F172A] text-white font-bold text-[14px] h-[44px]" style={{ padding: "12px 16px" }} onClick={() => handleSort("answerRate")}>Answer Rate <SortIcon column="answerRate" /></TableHead>
                    <TableHead className="text-right cursor-pointer select-none bg-[#0F172A] text-white font-bold text-[14px] h-[44px]" style={{ padding: "12px 16px" }} onClick={() => handleSort("totalDMs")}>DM Conversations <SortIcon column="totalDMs" /></TableHead>
                    <TableHead className="text-right cursor-pointer select-none bg-[#0F172A] text-white font-bold text-[14px] h-[44px]" style={{ padding: "12px 16px" }} onClick={() => handleSort("totalSQLs")}>SQLs <SortIcon column="totalSQLs" /></TableHead>
                    <TableHead className="text-right cursor-pointer select-none bg-[#0F172A] text-white font-bold text-[14px] h-[44px]" style={{ padding: "12px 16px" }} onClick={() => handleSort("conversionRate")}>Conv. Rate <SortIcon column="conversionRate" /></TableHead>
                    <TableHead className="text-right cursor-pointer select-none bg-[#0F172A] text-white font-bold text-[14px] h-[44px]" style={{ padding: "12px 16px" }} onClick={() => handleSort("avgDuration")}>Avg Talk Time <SortIcon column="avgDuration" /></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedData.map((sdr, idx) => {
                    const clientName = clientNameMap[sdr.clientId || ""] || sdr.clientId || "";
                    const isTop3 = sdr.displayRank <= 3;
                    const dmValue = Number(sdr.totalDMs);
                    const convValue = Number(parseFloat(sdr.conversionRate));

                    return (
                      <TableRow
                        key={`${sdr.name}-${sdr.clientId}`}
                        className={`transition-colors cursor-pointer hover:bg-[#EFF6FF] dark:hover:bg-[#1e293b] ${getRowStyle(sdr.displayRank)}`}
                        style={{ backgroundColor: isTop3 ? undefined : (idx % 2 === 0 ? "#FFFFFF" : "#F8FAFC") }}
                      >
                        <TableCell className="font-medium text-lg sticky left-0 z-10 text-center text-[14px]" style={{ padding: "12px 16px", fontVariantNumeric: "tabular-nums" }}>
                          {getRankDisplay(sdr.displayRank)}
                        </TableCell>
                        <TableCell className="sticky left-16 z-10 text-left text-[14px]" style={{ padding: "12px 16px" }}>
                          <div className="flex items-center gap-3 cursor-pointer hover:text-primary transition-colors" onClick={() => setSelectedSDR(sdr)}>
                            <SDRAvatar name={sdr.name} photoUrl={photoMap[sdr.name]} size="md" />
                            <span className="font-normal whitespace-nowrap">{sdr.name}</span>
                          </div>
                        </TableCell>
                        {showClientColumn && (
                          <TableCell className="text-left whitespace-nowrap text-[14px]" style={{ padding: "12px 16px" }}>{clientName}</TableCell>
                        )}
                        <TableCell className="text-right text-[14px]" style={{ padding: "12px 16px", fontVariantNumeric: "tabular-nums" }}>
                          {sdr.totalDials.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-[14px]" style={{ padding: "12px 16px", fontVariantNumeric: "tabular-nums" }}>
                          {sdr.totalAnswered.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-[14px]" style={{ padding: "12px 16px" }}>
                          {getAnswerRateBadge(sdr.answerRate)}
                        </TableCell>
                        <TableCell className="text-right text-[14px]" style={{ padding: "12px 16px", fontVariantNumeric: "tabular-nums" }}>
                          {dmValue > 0 ? dmValue.toLocaleString() : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-right text-[14px]" style={{ padding: "12px 16px", fontVariantNumeric: "tabular-nums" }}>
                          <div>
                            <span>{sdr.totalSQLs === 0 ? <span className="text-muted-foreground">—</span> : sdr.totalSQLs}</span>
                            {getLastSQLText(sdr)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-[14px]" style={{ padding: "12px 16px", fontVariantNumeric: "tabular-nums" }}>
                          {convValue > 0 ? `${sdr.conversionRate}%` : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-right text-[14px]" style={{ padding: "12px 16px", fontVariantNumeric: "tabular-nums" }}>
                          {sdr.avgDuration > 0 ? (
                            <span title={`${Math.round(sdr.avgDuration)} seconds avg`}>
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
