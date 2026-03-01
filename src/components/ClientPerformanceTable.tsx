import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ArrowUpDown, Search, DatabaseZap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { EmptyState } from "@/components/EmptyState";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { DailySnapshot } from "@/lib/supabase-types";

type SortField = "name" | "dials" | "answered" | "answeredPercent" | "dms" | "sqls" | "progress" | "daysLeft" | "campaignPeriod";
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
  signal: "red" | "amber" | null;
}

interface ClientPerformanceTableProps {
  snapshots: DailySnapshot[];
  dmsByClient: Record<string, number>;
  sqlCountsByClient: Record<string, number>;
  clients: Array<{
    client_id: string;
    client_name: string;
    campaign_start?: string | null;
    campaign_end?: string | null;
    target_sqls?: number | null;
    logo_url?: string | null;
  }>;
}

export const ClientPerformanceTable = ({ snapshots, dmsByClient, sqlCountsByClient, clients }: ClientPerformanceTableProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const navigate = useNavigate();

  const getWorkingDaysLeft = (endDate: string | null): number | null => {
    if (!endDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);
    if (end < today) return 0;
    let count = 0;
    const current = new Date(today);
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
    const startDate = new Date(start);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(end);
    endDate.setHours(0, 0, 0, 0);
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
    elapsedPercent: number,
    sqls: number,
    target: number
  ): "red" | "amber" | null => {
    if (target === 0 || elapsedPercent === 0) return null;
    const expectedSQLs = target * (elapsedPercent / 100);
    if (expectedSQLs === 0) return null;
    const achievementPercent = (sqls / expectedSQLs) * 100;
    if (elapsedPercent > 60 && achievementPercent < 60) return "red";
    if (elapsedPercent > 40 && achievementPercent < 80) return "amber";
    return null;
  };

  const formatCampaignPeriod = (start: string | null, end: string | null): string => {
    if (!start || !end) return "-";
    const s = new Date(start);
    const e = new Date(end);
    return `${format(s, "MMM d")} – ${format(e, "MMM d")}`;
  };

  const clientsData: ClientData[] = useMemo(() => {
    return clients.map((client) => {
      const clientSnapshots = (snapshots || []).filter((s) => s.client_id === client.client_id);
      const totalDials = clientSnapshots.reduce((sum, s) => sum + (s.dials || 0), 0);
      const totalAnswered = clientSnapshots.reduce((sum, s) => sum + (s.answered || 0), 0);
      const totalDMs = (dmsByClient || {})[client.client_id] || 0;
      const totalSQLs = (sqlCountsByClient || {})[client.client_id] || 0;
      const target = client.target_sqls || 0;

      return {
        name: client.client_name,
        slug: client.client_id,
        logoUrl: client.logo_url || null,
        dials: totalDials,
        answered: totalAnswered,
        answeredPercent: totalDials > 0 ? (totalAnswered / totalDials) * 100 : 0,
        dms: totalDMs,
        sqls: totalSQLs,
        sqlsPercent: totalDMs > 0 ? (totalSQLs / totalDMs) * 100 : 0,
        target,
        progress: target > 0 ? (totalSQLs / target) * 100 : 0,
        campaignStart: client.campaign_start || null,
        campaignEnd: client.campaign_end || null,
        daysLeft: getWorkingDaysLeft(client.campaign_end || null),
        elapsedPercent: getCampaignElapsed(client.campaign_start || null, client.campaign_end || null),
        signal: getHealthSignal(
          getCampaignElapsed(client.campaign_start || null, client.campaign_end || null),
          totalSQLs,
          target
        ),
      };
    });
  }, [clients, snapshots, dmsByClient, sqlCountsByClient]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const filteredAndSortedClients = useMemo(() => {
    let filtered = clientsData.filter((client) =>
      client.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    filtered.sort((a, b) => {
      if (sortField === "name" || sortField === "campaignPeriod") {
        const aVal = sortField === "name" ? a.name : (a.campaignStart || "");
        const bVal = sortField === "name" ? b.name : (b.campaignStart || "");
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
      className="flex items-center gap-1 hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded px-2 py-1"
      aria-label={`Sort by ${label}`}
    >
      {label}
      <ArrowUpDown className="h-3 w-3" aria-hidden="true" />
    </button>
  );

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border animate-fade-in" style={{ animationDelay: "500ms" }}>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="text-foreground">Client Performance</CardTitle>
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
      </CardHeader>
      <CardContent>
        {clients.length === 0 ? (
          <EmptyState
            icon={DatabaseZap}
            title="No clients found"
            description="Client data will appear once clients are added to the database"
          />
        ) : (
          <div className="overflow-x-auto scrollbar-thin scroll-gradient">
            <TooltipProvider>
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10" role="rowgroup">
                  <TableRow className="border-border/50 bg-[#f1f5f9] dark:bg-[#1e293b]">
                    <TableHead className="px-4 py-2 font-bold text-[#0f172a] dark:text-[#f1f5f9] sticky left-0 bg-card z-20" style={{ minWidth: "200px" }}>
                      <SortButton field="name" label="Client" />
                    </TableHead>
                    <TableHead className="px-4 py-2 font-bold text-[#0f172a] dark:text-[#f1f5f9]">Campaign Period</TableHead>
                    <TableHead className="px-4 py-2 font-bold text-[#0f172a] dark:text-[#f1f5f9] text-center">
                      <SortButton field="daysLeft" label="Days Left" />
                    </TableHead>
                    <TableHead className="px-4 py-2 font-bold text-[#0f172a] dark:text-[#f1f5f9] text-center">
                      <SortButton field="dials" label="Dials" />
                    </TableHead>
                    <TableHead className="px-4 py-2 font-bold text-[#0f172a] dark:text-[#f1f5f9] text-center">
                      <SortButton field="answered" label="Answered" />
                    </TableHead>
                    <TableHead className="px-4 py-2 font-bold text-[#0f172a] dark:text-[#f1f5f9] text-center">
                      <SortButton field="answeredPercent" label="Answer Rate" />
                    </TableHead>
                    <TableHead className="px-4 py-2 font-bold text-[#0f172a] dark:text-[#f1f5f9] text-center">
                      <SortButton field="dms" label="DM Conversations" />
                    </TableHead>
                    <TableHead className="px-4 py-2 font-bold text-[#0f172a] dark:text-[#f1f5f9] text-center">
                      <SortButton field="sqls" label="SQLs" />
                    </TableHead>
                    <TableHead className="px-4 py-2 font-bold text-[#0f172a] dark:text-[#f1f5f9] text-center">
                      Campaign Progress
                    </TableHead>
                    <TableHead className="px-4 py-2 font-bold text-[#0f172a] dark:text-[#f1f5f9] text-right" style={{ textAlign: "right" }}>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedClients.map((client, index) => (
                    <TableRow
                      key={client.slug}
                      className="border-border/50 hover:bg-muted/20 transition-colors cursor-pointer"
                      style={{ animationDelay: `${600 + index * 50}ms` }}
                      onClick={() => navigate(`/client/${client.slug}`)}
                    >
                      <TableCell className="sticky left-0 bg-card z-10" style={{ minWidth: "200px" }}>
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
                            {client.signal === "red" && (
                              <span className="absolute bottom-0 left-0 w-2.5 h-2.5 rounded-full bg-rose-500 border-2 border-white dark:border-[#0f172a]" />
                            )}
                            {client.signal === "amber" && (
                              <span className="absolute bottom-0 left-0 w-2.5 h-2.5 rounded-full bg-amber-500 border-2 border-white dark:border-[#0f172a]" />
                            )}
                          </div>
                          <span className="font-medium text-foreground whitespace-nowrap">{client.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatCampaignPeriod(client.campaignStart, client.campaignEnd)}
                      </TableCell>
                      {(() => {
                        const days = client.daysLeft;
                        if (days === null) return (
                          <TableCell className="text-center px-4 py-2 text-muted-foreground">-</TableCell>
                        );
                        const isBold = days <= 10;
                        return (
                          <TableCell className="text-center px-4 py-2">
                            <span className={`text-sm ${isBold ? "font-bold text-foreground" : "font-normal text-muted-foreground"}`}>
                              {days}
                            </span>
                            <span className={`text-sm ml-1 ${isBold ? "font-bold text-foreground" : "text-muted-foreground"}`}>
                              {days === 1 ? "day" : "days"}
                            </span>
                          </TableCell>
                        );
                      })()}
                      <TableCell className="text-sm font-medium text-foreground text-center">{client.dials.toLocaleString()}</TableCell>
                      <TableCell className="text-sm font-medium text-foreground text-center">{client.answered.toLocaleString()}</TableCell>
                      <TableCell className="text-sm font-medium text-foreground text-center">{client.answeredPercent.toFixed(1)}%</TableCell>
                      <TableCell className="text-sm font-medium text-foreground text-center">{client.dms.toLocaleString()}</TableCell>
                      <TableCell className="text-sm font-medium text-foreground text-center">{client.sqls.toLocaleString()}</TableCell>
                      <TableCell className="text-center px-4 py-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex flex-col gap-1.5 min-w-[130px] cursor-default mx-auto">
                              <Progress value={client.elapsedPercent} className="h-2" />
                              <span className="text-xs text-muted-foreground text-center">
                                {client.elapsedPercent.toFixed(0)}% of campaign
                              </span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            {(() => {
                              const signal = client.signal;
                              const color = signal === "red"
                                ? "text-rose-500"
                                : signal === "amber"
                                ? "text-amber-500"
                                : "text-emerald-500";
                              const message = signal === "red"
                                ? "At risk - behind pace"
                                : signal === "amber"
                                ? "Needs attention - slightly behind"
                                : "On track";
                              return (
                                <div className="flex flex-col gap-1 text-xs">
                                  <span className={`font-semibold ${color}`}>
                                    {message}
                                  </span>
                                  <span className="text-muted-foreground">
                                    {client.sqls} / {client.target} SQLs achieved
                                  </span>
                                </div>
                              );
                            })()}
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell className="text-right">
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TooltipProvider>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
