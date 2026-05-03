import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowUp, ArrowDown, ArrowUpDown, Users, ChevronDown } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { SDRDetailModal } from "@/components/SDRDetailModal";
import { DemoMeetingsModal } from "@/components/DemoMeetingsModal";
import { useDateFilter } from "@/contexts/DateFilterContext";
import { EmptyState } from "@/components/EmptyState";
import { SDRAvatar } from "@/components/SDRAvatar";
import { supabase } from "@/lib/supabase";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

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

// Demo counts per SDR — fetched separately when PEXA filter is active
interface DemoCounts {
  sdr_name: string;
  client_id: string;
  demo_booked: number;
  demo_attended: number;
}

type SortKey =
  | "totalSQLs"
  | "totalDials"
  | "totalAnswered"
  | "answerRate"
  | "totalDMs"
  | "conversionRate"
  | "avgDuration"
  | "name"
  | "clientName"
  | "demoBooked"
  | "demoAttended";
type SortDir = "asc" | "desc";

interface MostImprovedInfo {
  name: string;
  clientId: string;
  improvement: number;
}

interface ClientOption {
  client_id: string;
  client_name: string;
  logo_url: string | null;
}

interface SDRLeaderboardTableProps {
  leaderboardData?: LeaderboardEntry[];
  clientNameMap?: Record<string, string>;
  clientLogoMap?: Record<string, string>;
  showClientColumn?: boolean;
  mostImproved?: MostImprovedInfo | null;
  campaignDates?: { start: string; end: string } | null;
  clients?: ClientOption[];
  clientFilter?: string;
  onClientFilterChange?: (value: string) => void;
  showClientFilter?: boolean;
}

const PEXA_CLIENT_ID = "pexa-clear";

export const SDRLeaderboardTable = ({
  leaderboardData,
  clientNameMap = {},
  clientLogoMap = {},
  showClientColumn = true,
  campaignDates,
  clients = [],
  clientFilter = "all",
  onClientFilterChange,
  showClientFilter = false,
}: SDRLeaderboardTableProps) => {
  const data = leaderboardData || [];
  const isMobile = useIsMobile();
  const [selectedSDR, setSelectedSDR] = useState<LeaderboardEntry | null>(null);
  const { dateRange, filterType } = useDateFilter();
  const [photoMap, setPhotoMap] = useState<Record<string, string | null>>({});
  const [sortKey, setSortKey] = useState<SortKey>("totalSQLs");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [showAll, setShowAll] = useState(false);
  const [currentSdrName, setCurrentSdrName] = useState<string | null>(null);
  const [isSdrRole, setIsSdrRole] = useState(false);

  // Demo counts — only fetched when PEXA filter is active
  const [demoCounts, setDemoCounts] = useState<DemoCounts[]>([]);
  const [demoModalSdr, setDemoModalSdr] = useState<{
    sdr: LeaderboardEntry;
    metric: "demoBooked" | "demoAttended";
  } | null>(null);

  const isPexa = clientFilter === PEXA_CLIENT_ID;

  useEffect(() => {
    const fetchPhotos = async () => {
      const { data: members } = await supabase.from("team_members").select("sdr_name, profile_photo_url");
      if (members) {
        const map: Record<string, string | null> = {};
        for (const m of members) map[m.sdr_name] = m.profile_photo_url;
        setPhotoMap(map);
      }
    };
    fetchPhotos();
  }, []);

  // Fetch demo counts when PEXA is selected
  useEffect(() => {
    if (!isPexa || !dateRange?.from || !dateRange?.to) {
      setDemoCounts([]);
      return;
    }
    const fetchDemos = async () => {
      try {
        const { data: rows, error } = await supabase.rpc("get_sdr_demo_counts", {
          p_start_date: dateRange.from!.toISOString().split("T")[0],
          p_end_date: dateRange.to!.toISOString().split("T")[0],
          p_client_id: PEXA_CLIENT_ID,
        });
        if (!error && rows) {
          setDemoCounts(
            rows.map((r: any) => ({
              sdr_name: r.sdr_name,
              client_id: r.client_id,
              demo_booked: Number(r.demo_booked) || 0,
              demo_attended: Number(r.demo_attended) || 0,
            })),
          );
        }
      } catch (err) {
        console.error("Error fetching demo counts:", err);
      }
    };
    fetchDemos();
  }, [isPexa, dateRange, clientFilter]);

  // Helper to get demo counts for a specific SDR
  const getDemoCounts = (sdrName: string) => {
    const row = demoCounts.find((d) => d.sdr_name === sdrName);
    return { demoBooked: row?.demo_booked || 0, demoAttended: row?.demo_attended || 0 };
  };

  // Determine if current user is SDR role
  useEffect(() => {
    const resolveSelf = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: roleRow } = await supabase.from("user_roles").select("role").eq("user_id", user.id).single();
      const role = roleRow?.role?.toLowerCase();
      if (role !== "sdr") {
        setIsSdrRole(false);
        return;
      }
      setIsSdrRole(true);
      if (user.email) {
        const { data: tm } = await supabase
          .from("team_members")
          .select("sdr_name")
          .eq("email", user.email)
          .maybeSingle();
        if (tm?.sdr_name) setCurrentSdrName(tm.sdr_name);
      }
    };
    resolveSelf();
  }, []);

  const canOpenRow = (sdrName: string) => !isSdrRole || sdrName === currentSdrName;

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
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
        case "demoBooked":
          aVal = getDemoCounts(a.name).demoBooked;
          bVal = getDemoCounts(b.name).demoBooked;
          break;
        case "demoAttended":
          aVal = getDemoCounts(a.name).demoAttended;
          bVal = getDemoCounts(b.name).demoAttended;
          break;
        default:
          aVal = a[sortKey as keyof LeaderboardEntry] as number;
          bVal = b[sortKey as keyof LeaderboardEntry] as number;
      }

      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      if (a.totalDials !== b.totalDials) return b.totalDials - a.totalDials;
      return 0;
    });

    return sorted.map((sdr, idx) => ({ ...sdr, displayRank: idx + 1 }));
  }, [data, sortKey, sortDir, clientNameMap, demoCounts]);

  const displayData = isMobile && !showAll ? sortedData.slice(0, 5) : sortedData;

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return <ArrowUpDown className="h-3 w-3 ml-1 inline opacity-40" />;
    return sortDir === "asc" ? (
      <ArrowUp className="h-3 w-3 ml-1 inline" />
    ) : (
      <ArrowDown className="h-3 w-3 ml-1 inline" />
    );
  };

  const getAnswerRateBadge = (rate: string) => {
    const rateNum = parseFloat(rate);
    if (rateNum >= 85) {
      return (
        <Badge className="bg-[#D1FAE5] text-[#065F46] border-[#D1FAE5] dark:bg-[#065F46]/20 dark:text-emerald-400">
          {rate}%
        </Badge>
      );
    } else if (rateNum >= 70) {
      return (
        <Badge className="bg-[#DBEAFE] text-[#1E40AF] border-[#DBEAFE] dark:bg-[#1E40AF]/20 dark:text-blue-400">
          {rate}%
        </Badge>
      );
    } else if (rateNum >= 50) {
      return (
        <Badge className="bg-[#FEF3C7] text-[#92400E] border-[#FEF3C7] dark:bg-[#92400E]/20 dark:text-amber-400">
          {rate}%
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-[#FEE2E2] text-[#991B1B] border-[#FEE2E2] dark:bg-[#991B1B]/20 dark:text-red-400">
          {rate}%
        </Badge>
      );
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
          {showClientFilter && onClientFilterChange && (
            <Select value={clientFilter} onValueChange={onClientFilterChange}>
              <SelectTrigger
                className={cn(
                  "w-[180px] min-h-[40px] text-xs sm:text-sm rounded-md transition-all duration-200",
                  "bg-[#0f172a] text-white border-[#0f172a] hover:bg-[#1e293b] dark:bg-white dark:text-[#0f172a] dark:border-white dark:hover:bg-gray-100 font-semibold",
                )}
              >
                <SelectValue placeholder="All Clients" />
              </SelectTrigger>
              <SelectContent className="z-[100] bg-card">
                <SelectItem value="all">All Clients</SelectItem>
                {clients
                  .filter((c) => c.client_id && c.client_id.length > 0)
                  .map((c) => (
                    <SelectItem key={c.client_id} value={c.client_id}>
                      <span className="flex items-center gap-2">
                        {c.logo_url ? (
                          <img src={c.logo_url} alt="" className="w-4 h-4 rounded-sm object-contain flex-shrink-0" />
                        ) : (
                          <span className="w-4 h-4 rounded-sm bg-muted flex items-center justify-center text-[8px] font-bold text-muted-foreground flex-shrink-0">
                            {c.client_name.charAt(0)}
                          </span>
                        )}
                        {c.client_name}
                      </span>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          )}
        </CardHeader>
        <CardContent>
          {data.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No team data available"
              description="Add team members in Settings to see performance metrics"
            />
          ) : isMobile ? (
            /* Mobile: compact card layout */
            <div className="space-y-2">
              {displayData.map((sdr) => {
                const clientName = clientNameMap[sdr.clientId || ""] || sdr.clientId || "";
                const clickable = canOpenRow(sdr.name);
                const { demoBooked, demoAttended } = getDemoCounts(sdr.name);
                return (
                  <div
                    key={`${sdr.name}-${sdr.clientId}`}
                    className={cn(
                      "rounded-lg border border-border/50 p-3 transition-colors",
                      clickable ? "cursor-pointer hover:bg-muted/30" : "cursor-default",
                    )}
                    onClick={() => clickable && setSelectedSDR(sdr)}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg w-7 text-center shrink-0">{getRankDisplay(sdr.displayRank)}</span>
                      <SDRAvatar name={sdr.name} photoUrl={photoMap[sdr.name]} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground text-sm truncate">{sdr.name}</p>
                        {showClientColumn && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            {clientLogoMap[sdr.clientId || ""] && (
                              <img
                                src={clientLogoMap[sdr.clientId || ""]}
                                alt=""
                                className="w-3.5 h-3.5 rounded-sm object-contain"
                              />
                            )}
                            <span className="truncate">{clientName}</span>
                          </span>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xl font-bold text-foreground">{sdr.totalSQLs}</p>
                        <p className="text-[10px] text-muted-foreground uppercase">SQLs</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2 ml-9">
                      <span>
                        <span className="font-medium text-foreground">{sdr.totalDials.toLocaleString()}</span> Dials
                      </span>
                      <span>{getAnswerRateBadge(sdr.answerRate)}</span>
                      {isPexa && (demoBooked > 0 || demoAttended > 0) && (
                        <span
                          className="text-[#3b82f6] cursor-pointer hover:underline"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDemoModalSdr({ sdr, metric: demoAttended > 0 ? "demoAttended" : "demoBooked" });
                          }}
                        >
                          🎬 {demoBooked} / ✅ {demoAttended}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              {sortedData.length > 5 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-muted-foreground"
                  onClick={() => setShowAll(!showAll)}
                >
                  {showAll ? "Show top 5" : `Show all ${sortedData.length}`}
                  <ChevronDown className={cn("h-4 w-4 ml-1 transition-transform", showAll && "rotate-180")} />
                </Button>
              )}
            </div>
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
                  {isPexa && <col style={{ width: "100px" }} />}
                  {isPexa && <col style={{ width: "110px" }} />}
                </colgroup>
                <TableHeader className="table-header-navy">
                  <TableRow>
                    <TableHead
                      className="text-center cursor-pointer select-none h-[44px]"
                      style={{ padding: cellPad }}
                      onClick={() => handleSort("totalSQLs")}
                    >
                      Rank
                    </TableHead>
                    <TableHead
                      className="text-left cursor-pointer select-none h-[44px]"
                      style={{ padding: cellPad }}
                      onClick={() => handleSort("name")}
                    >
                      SDR Name <SortIcon column="name" />
                    </TableHead>
                    {showClientColumn && (
                      <TableHead
                        className="text-left cursor-pointer select-none h-[44px]"
                        style={{ padding: cellPad }}
                        onClick={() => handleSort("clientName")}
                      >
                        Client <SortIcon column="clientName" />
                      </TableHead>
                    )}
                    <TableHead
                      className="text-center cursor-pointer select-none h-[44px]"
                      style={{ padding: cellPad }}
                      onClick={() => handleSort("totalDials")}
                    >
                      Total Dials <SortIcon column="totalDials" />
                    </TableHead>
                    <TableHead
                      className="text-center cursor-pointer select-none h-[44px]"
                      style={{ padding: cellPad }}
                      onClick={() => handleSort("totalAnswered")}
                    >
                      Answered <SortIcon column="totalAnswered" />
                    </TableHead>
                    <TableHead
                      className="text-center cursor-pointer select-none h-[44px]"
                      style={{ padding: cellPad }}
                      onClick={() => handleSort("answerRate")}
                    >
                      Answer Rate <SortIcon column="answerRate" />
                    </TableHead>
                    <TableHead
                      className="text-center cursor-pointer select-none h-[44px]"
                      style={{ padding: cellPad }}
                      onClick={() => handleSort("totalDMs")}
                    >
                      DM Conv. <SortIcon column="totalDMs" />
                    </TableHead>
                    <TableHead
                      className="text-center cursor-pointer select-none h-[44px]"
                      style={{ padding: cellPad }}
                      onClick={() => handleSort("totalSQLs")}
                    >
                      SQLs <SortIcon column="totalSQLs" />
                    </TableHead>
                    {isPexa && (
                      <TableHead
                        className="text-center cursor-pointer select-none h-[44px]"
                        style={{ padding: cellPad }}
                        onClick={() => handleSort("demoBooked")}
                      >
                        Demo Booked <SortIcon column="demoBooked" />
                      </TableHead>
                    )}
                    {isPexa && (
                      <TableHead
                        className="text-center cursor-pointer select-none h-[44px]"
                        style={{ padding: cellPad }}
                        onClick={() => handleSort("demoAttended")}
                      >
                        Demo Attended <SortIcon column="demoAttended" />
                      </TableHead>
                    )}
                    <TableHead
                      className="text-center cursor-pointer select-none h-[44px]"
                      style={{ padding: cellPad }}
                      onClick={() => handleSort("conversionRate")}
                    >
                      Conv. Rate <SortIcon column="conversionRate" />
                    </TableHead>
                    <TableHead
                      className="text-center cursor-pointer select-none h-[44px]"
                      style={{ padding: cellPad }}
                      onClick={() => handleSort("avgDuration")}
                    >
                      Avg Talk <SortIcon column="avgDuration" />
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="table-striped">
                  {sortedData.map((sdr) => {
                    const clientName = clientNameMap[sdr.clientId || ""] || sdr.clientId || "";
                    const dmValue = Number(sdr.totalDMs);
                    const clickable = canOpenRow(sdr.name);
                    const { demoBooked, demoAttended } = getDemoCounts(sdr.name);

                    return (
                      <TableRow
                        key={`${sdr.name}-${sdr.clientId}`}
                        className={cn(
                          "transition-colors",
                          clickable ? "cursor-pointer" : "cursor-default hover:bg-transparent",
                        )}
                        style={{ height: "48px" }}
                      >
                        <TableCell
                          className="text-center"
                          style={{ padding: cellPad, fontVariantNumeric: "tabular-nums" }}
                        >
                          {getRankDisplay(sdr.displayRank)}
                        </TableCell>
                        <TableCell className="text-left" style={{ padding: cellPad }}>
                          <div
                            className={cn(
                              "flex items-center gap-2 transition-colors",
                              clickable ? "cursor-pointer hover:text-primary" : "cursor-default",
                            )}
                            onClick={() => clickable && setSelectedSDR(sdr)}
                          >
                            <SDRAvatar name={sdr.name} photoUrl={photoMap[sdr.name]} size="md" />
                            <span className="font-normal whitespace-nowrap truncate">{sdr.name}</span>
                          </div>
                        </TableCell>
                        {showClientColumn && (
                          <TableCell className="text-left whitespace-nowrap truncate" style={{ padding: cellPad }}>
                            <span className="flex items-center gap-1.5">
                              {clientLogoMap[sdr.clientId || ""] ? (
                                <img
                                  src={clientLogoMap[sdr.clientId || ""]}
                                  alt=""
                                  className="w-4 h-4 rounded-sm object-contain flex-shrink-0"
                                />
                              ) : clientName ? (
                                <span className="w-4 h-4 rounded-sm bg-muted flex items-center justify-center text-[8px] font-bold text-muted-foreground flex-shrink-0">
                                  {clientName.charAt(0)}
                                </span>
                              ) : null}
                              <span className="truncate">{clientName}</span>
                            </span>
                          </TableCell>
                        )}
                        <TableCell
                          className="text-center"
                          style={{ padding: cellPad, fontVariantNumeric: "tabular-nums" }}
                        >
                          {sdr.totalDials.toLocaleString()}
                        </TableCell>
                        <TableCell
                          className="text-center"
                          style={{ padding: cellPad, fontVariantNumeric: "tabular-nums" }}
                        >
                          {sdr.totalAnswered.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-center" style={{ padding: cellPad }}>
                          {getAnswerRateBadge(sdr.answerRate)}
                        </TableCell>
                        <TableCell
                          className="text-center"
                          style={{ padding: cellPad, fontVariantNumeric: "tabular-nums" }}
                        >
                          {dmValue.toLocaleString()}
                        </TableCell>
                        <TableCell
                          className="text-center"
                          style={{ padding: cellPad, fontVariantNumeric: "tabular-nums" }}
                        >
                          {sdr.totalSQLs.toLocaleString()}
                        </TableCell>
                        {isPexa && (
                          <TableCell className="text-center" style={{ padding: cellPad }}>
                            <button
                              className={cn(
                                "tabular-nums font-medium transition-colors",
                                demoBooked > 0
                                  ? "text-[#3b82f6] hover:text-[#2563eb] cursor-pointer hover:underline"
                                  : "text-muted-foreground cursor-default",
                              )}
                              onClick={() => demoBooked > 0 && setDemoModalSdr({ sdr, metric: "demoBooked" })}
                              disabled={demoBooked === 0}
                            >
                              {demoBooked}
                            </button>
                          </TableCell>
                        )}
                        {isPexa && (
                          <TableCell className="text-center" style={{ padding: cellPad }}>
                            <button
                              className={cn(
                                "tabular-nums font-medium transition-colors",
                                demoAttended > 0
                                  ? "text-[#10b981] hover:text-[#059669] cursor-pointer hover:underline"
                                  : "text-muted-foreground cursor-default",
                              )}
                              onClick={() => demoAttended > 0 && setDemoModalSdr({ sdr, metric: "demoAttended" })}
                              disabled={demoAttended === 0}
                            >
                              {demoAttended}
                            </button>
                          </TableCell>
                        )}
                        <TableCell
                          className="text-center"
                          style={{ padding: cellPad, fontVariantNumeric: "tabular-nums" }}
                        >
                          {sdr.conversionRate}%
                        </TableCell>
                        <TableCell
                          className="text-center"
                          style={{ padding: cellPad, fontVariantNumeric: "tabular-nums" }}
                        >
                          {sdr.avgDuration > 0 ? (
                            <span title={`${Math.round(sdr.avgDuration)} seconds avg`}>
                              {Math.floor(sdr.avgDuration / 60)}m {Math.round(sdr.avgDuration % 60)}s
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
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

      {/* SDR Detail Modal */}
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

      {/* Demo Meetings Modal — PEXA only */}
      {demoModalSdr && isPexa && (
        <DemoMeetingsModal
          isOpen={!!demoModalSdr}
          onClose={() => setDemoModalSdr(null)}
          sdrName={demoModalSdr.sdr.name}
          clientId={PEXA_CLIENT_ID}
          dateRange={dateRange}
          metric={demoModalSdr.metric}
        />
      )}
    </>
  );
};
