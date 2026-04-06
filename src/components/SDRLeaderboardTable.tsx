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
  clientLogoMap?: Record<string, string>;
  showClientColumn?: boolean;
  mostImproved?: MostImprovedInfo | null;
  campaignDates?: { start: string; end: string } | null;
}

export const SDRLeaderboardTable = ({ leaderboardData, clientNameMap = {}, clientLogoMap = {}, showClientColumn = true, mostImproved, campaignDates }: SDRLeaderboardTableProps) => {
  const data = leaderboardData || [];
  const [selectedSDR, setSelectedSDR] = useState<LeaderboardEntry | null>(null);
  const { dateRange, filterType } = useDateFilter();
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
    if (rateNum >= 85) {
      return <Badge className="bg-[#D1FAE5] text-[#065F46] border-[#D1FAE5] dark:bg-[#065F46]/20 dark:text-emerald-400">{rate}%</Badge>;
    } else if (rateNum >= 70) {
      return <Badge className="bg-[#DBEAFE] text-[#1E40AF] border-[#DBEAFE] dark:bg-[#1E40AF]/20 dark:text-blue-400">{rate}%</Badge>;
    } else if (rateNum >= 50) {
      return <Badge className="bg-[#FEF3C7] text-[#92400E] border-[#FEF3C7] dark:bg-[#92400E]/20 dark:text-amber-400">{rate}%</Badge>;
    } else {
      return <Badge className="bg-[#FEE2E2] text-[#991B1B] border-[#FEE2E2] dark:bg-[#991B1B]/20 dark:text-red-400">{rate}%</Badge>;
    }
  };

  const getRankDisplay = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return rank;
  };

  const cellPad = "10px";

  return (
    <>
      <Card className="bg-card border-border shadow-sm hover:border-yellow-500/20 transition-all">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl font-semibold">SDR Leaderboard</CardTitle>
          {mostImproved && (
            <div className="flex items-center gap-2 border-l-4 border-l-emerald-500 pl-3 py-1">
              <TrendingUp className="h-4 w-4 text-emerald-500 shrink-0" />
              <span className="text-sm font-semibold text-foreground">
                Most Improved: {mostImproved.name} · <span className="text-emerald-600 dark:text-emerald-400">Answer Rate +{mostImproved.improvement.toFixed(1)}%</span>
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
              <Table style={{ tableLayout: "fixed" }}>
                <colgroup>
                  <col style={{ width: "50px" }} />
                  <col style={{ width: "180px" }} />
                  {showClientColumn && <col style={{ width: "100px" }} />}
                  <col style={{ width: "85px" }} />
                  <col style={{ width: "85px" }} />
                  <col style={{ width: "95px" }} />
                  <col style={{ width: "85px" }} />
                  <col style={{ width: "60px" }} />
                  <col style={{ width: "85px" }} />
                  <col style={{ width: "90px" }} />
                </colgroup>
                <TableHeader className="table-header-navy">
                  <TableRow>
                    <TableHead className="text-center cursor-pointer select-none h-[44px]" style={{ padding: cellPad }} onClick={() => handleSort("totalSQLs")}>Rank</TableHead>
                    <TableHead className="text-left cursor-pointer select-none h-[44px]" style={{ padding: cellPad }} onClick={() => handleSort("name")}>SDR Name <SortIcon column="name" /></TableHead>
                    {showClientColumn && (
                      <TableHead className="text-left cursor-pointer select-none h-[44px]" style={{ padding: cellPad }} onClick={() => handleSort("clientName")}>Client <SortIcon column="clientName" /></TableHead>
                    )}
                    <TableHead className="text-center cursor-pointer select-none h-[44px]" style={{ padding: cellPad }} onClick={() => handleSort("totalDials")}>Total Dials <SortIcon column="totalDials" /></TableHead>
                    <TableHead className="text-center cursor-pointer select-none h-[44px]" style={{ padding: cellPad }} onClick={() => handleSort("totalAnswered")}>Answered <SortIcon column="totalAnswered" /></TableHead>
                    <TableHead className="text-center cursor-pointer select-none h-[44px]" style={{ padding: cellPad }} onClick={() => handleSort("answerRate")}>Answer Rate <SortIcon column="answerRate" /></TableHead>
                    <TableHead className="text-center cursor-pointer select-none h-[44px]" style={{ padding: cellPad }} onClick={() => handleSort("totalDMs")}>DM Conv. <SortIcon column="totalDMs" /></TableHead>
                    <TableHead className="text-center cursor-pointer select-none h-[44px]" style={{ padding: cellPad }} onClick={() => handleSort("totalSQLs")}>SQLs <SortIcon column="totalSQLs" /></TableHead>
                    <TableHead className="text-center cursor-pointer select-none h-[44px]" style={{ padding: cellPad }} onClick={() => handleSort("conversionRate")}>Conv. Rate <SortIcon column="conversionRate" /></TableHead>
                    <TableHead className="text-center cursor-pointer select-none h-[44px]" style={{ padding: cellPad }} onClick={() => handleSort("avgDuration")}>Avg Talk <SortIcon column="avgDuration" /></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="table-striped">
                  {sortedData.map((sdr, idx) => {
                    const clientName = clientNameMap[sdr.clientId || ""] || sdr.clientId || "";
                    const dmValue = Number(sdr.totalDMs);

                    return (
                      <TableRow
                        key={`${sdr.name}-${sdr.clientId}`}
                        className="transition-colors cursor-pointer"
                        style={{ height: "48px" }}
                      >
                        <TableCell className="text-center" style={{ padding: cellPad, fontVariantNumeric: "tabular-nums" }}>
                          {getRankDisplay(sdr.displayRank)}
                        </TableCell>
                        <TableCell className="text-left" style={{ padding: cellPad }}>
                          <div className="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors" onClick={() => setSelectedSDR(sdr)}>
                            <SDRAvatar name={sdr.name} photoUrl={photoMap[sdr.name]} size="md" />
                            <span className="font-normal whitespace-nowrap truncate">{sdr.name}</span>
                          </div>
                        </TableCell>
                        {showClientColumn && (
                          <TableCell className="text-left whitespace-nowrap truncate" style={{ padding: cellPad }}>
                            <span className="flex items-center gap-1.5">
                              {clientLogoMap[sdr.clientId || ""] ? (
                                <img src={clientLogoMap[sdr.clientId || ""]} alt="" className="w-4 h-4 rounded-sm object-contain flex-shrink-0" />
                              ) : clientName ? (
                                <span className="w-4 h-4 rounded-sm bg-muted flex items-center justify-center text-[8px] font-bold text-muted-foreground flex-shrink-0">{clientName.charAt(0)}</span>
                              ) : null}
                              <span className="truncate">{clientName}</span>
                            </span>
                          </TableCell>
                        )}
                        <TableCell className="text-center" style={{ padding: cellPad, fontVariantNumeric: "tabular-nums" }}>
                          {sdr.totalDials.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-center" style={{ padding: cellPad, fontVariantNumeric: "tabular-nums" }}>
                          {sdr.totalAnswered.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-center" style={{ padding: cellPad }}>
                          {getAnswerRateBadge(sdr.answerRate)}
                        </TableCell>
                        <TableCell className="text-center" style={{ padding: cellPad, fontVariantNumeric: "tabular-nums" }}>
                          {dmValue.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-center" style={{ padding: cellPad, fontVariantNumeric: "tabular-nums" }}>
                          {sdr.totalSQLs.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-center" style={{ padding: cellPad, fontVariantNumeric: "tabular-nums" }}>
                          {sdr.conversionRate}%
                        </TableCell>
                        <TableCell className="text-center" style={{ padding: cellPad, fontVariantNumeric: "tabular-nums" }}>
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
            clientId: selectedSDR.clientId,
          }}
          globalDateRange={dateRange}
          campaignDates={campaignDates}
          parentFilterType={filterType}
        />
      )}
    </>
  );
};
