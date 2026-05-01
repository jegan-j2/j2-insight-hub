import { useState, useMemo, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ClientPerformanceRow } from "@/hooks/useOverviewData";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ArrowUpDown, ArrowUp, ArrowDown, Search, DatabaseZap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { EmptyState } from "@/components/EmptyState";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type SortField =
  | "name"
  | "dials"
  | "answered"
  | "answeredPercent"
  | "dms"
  | "sqls"
  | "progress"
  | "daysLeft"
  | "campaignPeriod";
type SortOrder = "asc" | "desc";

interface ClientData {
  name: string;
  slug: string;
  logoUrl: string | null;
  dials: number;
  answered: number;
  answeredPercent: number;
  dms: number;
  sqls: number;
  sqlsPercent: number;
  target: number;
  progress: number;
  campaignStart: string | null;
  campaignEnd: string | null;
  daysLeft: number | null;
  elapsedPercent: number;
  signal: "red" | "amber" | "green" | "grey";
}

interface ClientPerformanceTableProps {
  clientPerformance: ClientPerformanceRow[];
  clientFilter?: string;
}

export const ClientPerformanceTable = ({ clientPerformance, clientFilter = "all" }: ClientPerformanceTableProps) => {
  const isPexa = clientFilter === "pexa-clear";
  const [searchQuery, setSearchQuery] = useState("");
  const [demoCounts, setDemoCounts] = useState<Record<string, { demo_booked: number; demo_attended: number }>>({});

  // Fetch demo counts for PEXA client when filter is active
  useEffect(() => {
    if (!isPexa) {
      setDemoCounts({});
      return;
    }
    const fetchDemos = async () => {
      try {
        const today = new Date();
        const yearAgo = new Date(today);
        yearAgo.setFullYear(yearAgo.getFullYear() - 1);
        const { data: rows, error } = await supabase.rpc("get_client_demo_counts", {
          p_client_id: "pexa-clear",
          p_start_date: yearAgo.toISOString().split("T")[0],
          p_end_date: today.toISOString().split("T")[0],
        });
        if (!error && rows && rows.length > 0) {
          setDemoCounts({
            "pexa-clear": {
              demo_booked: Number(rows[0].demo_booked) || 0,
              demo_attended: Number(rows[0].demo_attended) || 0,
            },
          });
        }
      } catch (err) {
        console.error("Error fetching demo counts:", err);
      }
    };
    fetchDemos();
  }, [isPexa]);
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const navigate = useNavigate();

  const parseDateStr = (dateStr: string): Date => {
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, m - 1, d);
  };

  const getWorkingDaysLeft = (endDate: string | null): number | null => {
    if (!endDate) return null;
    const end = parseDateStr(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (end < today) return 0;
    let count = 0;
    const current = new Date(today);
    current.setDate(current.getDate() + 1);
    while (current <= end) {
      const dow = current.getDay();
      if (dow !== 0 && dow !== 6) count++;
      current.setDate(current.getDate() + 1);
    }
    return count;
  };

  const getCampaignElapsed = (start: string | null, end: string | null): number => {
    if (!start || !end) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = parseDateStr(start);
    const endDate = parseDateStr(end);
    if (today <= startDate) return 0;
    if (today > endDate) return 100;

    const countWorkingDays = (from: Date, to: Date) => {
      let count = 0;
      const curr = new Date(from);
      while (curr <= to) {
        const dow = curr.getDay();
        if (dow !== 0 && dow !== 6) count++;
        curr.setDate(curr.getDate() + 1);
      }
      return count;
    };

    const total = countWorkingDays(startDate, endDate);
    const elapsed = countWorkingDays(startDate, new Date(today.getTime() - 86400000));
    return total > 0 ? (elapsed / total) * 100 : 0;
  };

  const getHealthSignal = (
    campaignStart: string | null,
    campaignEnd: string | null,
    sqls: number,
    target: number,
    dials: number,
  ): "red" | "amber" | "green" | "grey" => {
    if (dials === 0) return "grey";
    if (!target || target === 0) return "green";
    if (!campaignStart || !campaignEnd) return "green";

    const start = parseDateStr(campaignStart);
    const end = parseDateStr(campaignEnd);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const countWorkingDays = (from: Date, to: Date) => {
      let count = 0;
      const curr = new Date(from);
      while (curr <= to) {
        const dow = curr.getDay();
        if (dow !== 0 && dow !== 6) count++;
        curr.setDate(curr.getDate() + 1);
      }
      return count;
    };

    const totalWorkingDays = countWorkingDays(start, end);
    const elapsedWorkingDays = countWorkingDays(start, today > end ? end : new Date(today.getTime() - 86400000));

    if (totalWorkingDays === 0 || elapsedWorkingDays === 0) return "green";

    const requiredDailyRate = target / totalWorkingDays;
    const actualDailyRate = sqls / elapsedWorkingDays;
    const pacePercentage = (actualDailyRate / requiredDailyRate) * 100;

    if (pacePercentage <= 50) return "red";
    if (pacePercentage <= 70) return "amber";
    return "green";
  };

  const formatCampaignPeriod = (start: string | null, end: string | null): string => {
    if (!start || !end) return "-";
    const s = new Date(start);
    const e = new Date(end);
    return `${format(s, "MMM d")} – ${format(e, "MMM d")}`;
  };

  const clientsData: ClientData[] = useMemo(() => {
    return clientPerformance.map((row) => {
      const campStart = row.campaign_start || null;
      const campEnd = row.campaign_end || null;
      const totalDials = row.dials || 0;
      const totalAnswered = row.answered || 0;
      const totalDMs = row.dm_conversations || 0;
      const totalSQLs = row.sqls || 0;
      const target = row.target_sqls || 0;

      return {
        name: row.client_name,
        slug: row.client_id,
        logoUrl: row.logo_url || null,
        dials: totalDials,
        answered: totalAnswered,
        answeredPercent: totalDials > 0 ? (totalAnswered / totalDials) * 100 : 0,
        dms: totalDMs,
        sqls: totalSQLs,
        sqlsPercent: totalDMs > 0 ? (totalSQLs / totalDMs) * 100 : 0,
        target,
        progress: target > 0 ? (totalSQLs / target) * 100 : 0,
        campaignStart: campStart,
        campaignEnd: campEnd,
        daysLeft: getWorkingDaysLeft(campEnd),
        elapsedPercent: getCampaignElapsed(campStart, campEnd),
        signal: getHealthSignal(campStart, campEnd, totalSQLs, target, totalDials),
      };
    });
  }, [clientPerformance]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const filteredAndSortedClients = useMemo(() => {
    let filtered = clientsData.filter((client) => client.name.toLowerCase().includes(searchQuery.toLowerCase()));

    filtered.sort((a, b) => {
      if (sortField === "name" || sortField === "campaignPeriod") {
        const aVal = sortField === "name" ? a.name : a.campaignStart || "";
        const bVal = sortField === "name" ? b.name : b.campaignStart || "";
        return sortOrder === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      if (sortField === "daysLeft") {
        const aVal = a.daysLeft ?? -1;
        const bVal = b.daysLeft ?? -1;
        return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
      }
      const aVal = a[sortField] as number;
      const bVal = b[sortField] as number;
      return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
    });

    return filtered;
  }, [clientsData, searchQuery, sortField, sortOrder]);

  const SortButton = ({ field, label }: { field: SortField; label: string }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center justify-center gap-1 hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded px-2 py-1"
      aria-label={`Sort by ${label}`}
    >
      {label}
      {sortField === field ? (
        sortOrder === "asc" ? (
          <ArrowUp className="ml-1 h-3 w-3 text-[#0f172a] dark:text-white" />
        ) : (
          <ArrowDown className="ml-1 h-3 w-3 text-[#0f172a] dark:text-white" />
        )
      ) : (
        <ArrowUpDown className="h-3 w-3 text-muted-foreground/50" aria-hidden="true" />
      )}
    </button>
  );

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border animate-fade-in" style={{ animationDelay: "500ms" }}>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="text-foreground">Client Performance</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search clients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-background/50 border-border"
                aria-label="Search clients"
              />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {clientPerformance.length === 0 ? (
          <EmptyState
            icon={DatabaseZap}
            title="No clients found"
            description="Client data will appear once clients are added to the database"
          />
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
              {filteredAndSortedClients.map((client) => (
                <div
                  key={client.slug}
                  className="rounded-lg border border-border bg-card p-4 cursor-pointer active:scale-[0.98] transition-transform"
                  onClick={() => navigate(`/client/${client.slug}`)}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="relative flex-shrink-0">
                      {client.logoUrl ? (
                        <img
                          src={client.logoUrl}
                          alt={client.name}
                          className="w-9 h-9 rounded-full object-contain bg-white"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
                          <span className="text-xs font-bold text-white">
                            {client.name.substring(0, 2).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <span
                        className={cn(
                          "absolute bottom-0 left-0 w-2.5 h-2.5 rounded-full border-2 border-card",
                          client.signal === "red" && "bg-rose-500",
                          client.signal === "amber" && "bg-amber-500",
                          client.signal === "green" && "bg-emerald-500",
                          client.signal === "grey" && "bg-gray-400",
                        )}
                      />
                    </div>
                    <span className="font-semibold text-foreground text-sm">{client.name}</span>
                  </div>

                  {client.dials === 0 ? (
                    <p className="text-sm text-muted-foreground italic text-center py-2">
                      Campaign active - no calls recorded yet
                    </p>
                  ) : (
                    <>
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        <div className="text-center">
                          <p className="text-lg font-bold text-foreground tabular-nums">
                            {client.dials.toLocaleString()}
                          </p>
                          <p className="text-[11px] text-muted-foreground">Dials</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold text-foreground tabular-nums">
                            {client.answeredPercent.toFixed(1)}%
                          </p>
                          <p className="text-[11px] text-muted-foreground">Answer Rate</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold text-foreground tabular-nums">
                            {client.sqls.toLocaleString()}
                          </p>
                          <p className="text-[11px] text-muted-foreground">SQLs</p>
                        </div>
                      </div>

                      {client.target > 0 ? (
                        <div className="space-y-1">
                          <div className="relative w-full h-4 overflow-hidden rounded-full bg-secondary">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all flex items-center justify-center",
                                client.signal === "red"
                                  ? "bg-[#EF4444]"
                                  : client.signal === "amber"
                                    ? "bg-[#F59E0B]"
                                    : "bg-[#10B981]",
                              )}
                              style={{ width: `${Math.min(client.progress, 100)}%` }}
                            >
                              {client.progress >= 20 && (
                                <span className="text-[9px] font-semibold text-white leading-none">
                                  {client.progress.toFixed(0)}%
                                </span>
                              )}
                            </div>
                            {client.progress < 20 && (
                              <span className="absolute inset-0 flex items-center justify-center text-[9px] font-semibold text-muted-foreground leading-none">
                                {client.progress.toFixed(0)}%
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground text-center">
                            {client.sqls} of {client.target} SQLs
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic text-center">No target set</p>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto scrollbar-thin scroll-gradient">
              <TooltipProvider>
                <Table>
                  <TableHeader className="table-header-navy sticky top-0 z-10" role="rowgroup">
                    <TableRow>
                      <TableHead
                        className="px-4 py-3 sticky left-0 z-20 bg-[#0F172A] dark:bg-[#1E293B] text-left"
                        style={{ minWidth: "200px" }}
                      >
                        <SortButton field="name" label="Client" />
                      </TableHead>
                      <TableHead className="px-4 py-3 text-left">Campaign Period</TableHead>
                      <TableHead className="px-4 py-3 text-center">
                        <SortButton field="daysLeft" label="Days Left" />
                      </TableHead>
                      <TableHead className="px-4 py-3 text-center">
                        <SortButton field="dials" label="Dials" />
                      </TableHead>
                      <TableHead className="px-4 py-3 text-center">
                        <SortButton field="answered" label="Answered" />
                      </TableHead>
                      <TableHead className="px-4 py-3 text-center">
                        <SortButton field="answeredPercent" label="Answer Rate" />
                      </TableHead>
                      <TableHead className="px-4 py-3 text-center">
                        <SortButton field="dms" label="DM Conversations" />
                      </TableHead>
                      <TableHead className="px-4 py-3 text-center">
                        <SortButton field="sqls" label="SQLs" />
                      </TableHead>
                      <TableHead className="px-4 py-3 text-left">Campaign Progress</TableHead>
                      <TableHead className="px-4 py-3 text-center">Action</TableHead>
                      {isPexa && <TableHead className="px-4 py-3 text-center">🎬 Demo Booked</TableHead>}
                      {isPexa && <TableHead className="px-4 py-3 text-center">✅ Demo Attended</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody className="table-striped">
                    {filteredAndSortedClients.map((client, index) => (
                      <TableRow
                        key={client.slug}
                        className="border-border/50 transition-colors cursor-pointer"
                        onClick={() => navigate(`/client/${client.slug}`)}
                      >
                        <TableCell className="sticky left-0 z-10" style={{ minWidth: "200px" }}>
                          <div className="flex items-center gap-3">
                            <div className="relative flex-shrink-0">
                              {client.logoUrl ? (
                                <img
                                  src={client.logoUrl}
                                  alt={client.name}
                                  className="w-8 h-8 rounded-full object-contain bg-white"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
                                  <span className="text-xs font-bold text-white">
                                    {client.name.substring(0, 2).toUpperCase()}
                                  </span>
                                </div>
                              )}
                              <span
                                className={cn(
                                  "absolute bottom-0 left-0 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-[#0f172a]",
                                  client.signal === "red" && "bg-rose-500",
                                  client.signal === "amber" && "bg-amber-500",
                                  client.signal === "green" && "bg-emerald-500",
                                  client.signal === "grey" && "bg-gray-400",
                                )}
                              />
                            </div>
                            <span className="font-medium text-foreground whitespace-nowrap">{client.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {formatCampaignPeriod(client.campaignStart, client.campaignEnd)}
                        </TableCell>
                        {client.dials === 0 ? (
                          <TableCell colSpan={8} className="text-sm text-muted-foreground italic text-center py-4">
                            Campaign active - no calls recorded yet
                          </TableCell>
                        ) : (
                          <>
                            {(() => {
                              const days = client.daysLeft;
                              if (days === null)
                                return <TableCell className="text-center px-4 text-muted-foreground">-</TableCell>;
                              const isBold = days <= 10;
                              return (
                                <TableCell className="text-center px-4">
                                  <span
                                    className={`text-sm ${isBold ? "font-bold text-foreground" : "font-normal text-muted-foreground"}`}
                                  >
                                    {days}
                                  </span>
                                  <span
                                    className={`text-sm ml-1 ${isBold ? "font-bold text-foreground" : "text-muted-foreground"}`}
                                  >
                                    {days === 1 ? "day" : "days"}
                                  </span>
                                </TableCell>
                              );
                            })()}
                            <TableCell className="text-sm font-medium text-foreground text-center tabular-nums">
                              {client.dials.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-foreground text-center tabular-nums">
                              {client.answered.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-foreground text-center tabular-nums">
                              {client.answeredPercent.toFixed(1)}%
                            </TableCell>
                            <TableCell className="text-sm font-medium text-foreground text-center tabular-nums">
                              {client.dms.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-foreground text-center tabular-nums">
                              {client.sqls.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-left px-4 py-2">
                              {client.target === 0 ? (
                                <span className="text-xs text-muted-foreground italic">No target set</span>
                              ) : (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex flex-col gap-1.5 min-w-[150px] cursor-default">
                                      <div className="relative w-full h-5 overflow-hidden rounded-full bg-secondary">
                                        <div
                                          className={cn(
                                            "h-full rounded-full transition-all flex items-center justify-center",
                                            client.signal === "red"
                                              ? "bg-[#EF4444]"
                                              : client.signal === "amber"
                                                ? "bg-[#F59E0B]"
                                                : "bg-[#10B981]",
                                          )}
                                          style={{ width: `${Math.min(client.progress, 100)}%` }}
                                        >
                                          {client.progress >= 15 && (
                                            <span className="text-[10px] font-semibold text-white leading-none">
                                              {client.progress.toFixed(0)}%
                                            </span>
                                          )}
                                        </div>
                                        {client.progress < 15 && (
                                          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-muted-foreground leading-none">
                                            {client.progress.toFixed(0)}%
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-xs text-muted-foreground text-center">
                                        {client.sqls} of {client.target} SQLs
                                      </span>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">
                                    <div className="flex flex-col gap-1 text-xs">
                                      <span className="font-semibold">
                                        {client.sqls.toLocaleString()} of {client.target.toLocaleString()} SQLs booked -{" "}
                                        {client.progress.toFixed(0)}% of target
                                      </span>
                                      <span
                                        className={cn(
                                          "font-medium",
                                          client.signal === "red"
                                            ? "text-rose-500"
                                            : client.signal === "amber"
                                              ? "text-amber-500"
                                              : client.signal === "grey"
                                                ? "text-gray-400"
                                                : "text-emerald-500",
                                        )}
                                      >
                                        {client.signal === "red"
                                          ? "Behind - at risk"
                                          : client.signal === "amber"
                                            ? "At risk - slightly behind"
                                            : client.signal === "grey"
                                              ? "No activity recorded"
                                              : "On track"}
                                      </span>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/client/${client.slug}`);
                                }}
                              >
                                View →
                              </Button>
                            </TableCell>
                            {isPexa && client.slug === "pexa-clear" && (
                              <TableCell className="text-center font-medium tabular-nums text-[#3b82f6]">
                                {demoCounts["pexa-clear"]?.demo_booked ?? "-"}
                              </TableCell>
                            )}
                            {isPexa && client.slug !== "pexa-clear" && (
                              <TableCell className="text-center text-muted-foreground">-</TableCell>
                            )}
                            {isPexa && client.slug === "pexa-clear" && (
                              <TableCell className="text-center font-medium tabular-nums text-[#10b981]">
                                {demoCounts["pexa-clear"]?.demo_attended ?? "-"}
                              </TableCell>
                            )}
                            {isPexa && client.slug !== "pexa-clear" && (
                              <TableCell className="text-center text-muted-foreground">-</TableCell>
                            )}
                          </>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TooltipProvider>
            </div>
            <div className="flex items-center justify-start gap-4 mt-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> On track
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> At risk
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Behind
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-gray-400 inline-block" /> No activity
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
