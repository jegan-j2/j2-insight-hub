import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, CalendarIcon } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { melbourneStartOfDay, melbourneEndOfDay } from "@/lib/melbourneTime";
import type { DateRange } from "react-day-picker";
import { SDRPerformanceOverview } from "@/components/SDRDetailTabs/SDRPerformanceOverview";
import { SDRActivityTimeline } from "@/components/SDRDetailTabs/SDRActivityTimeline";
import { SDRMeetingsResults } from "@/components/SDRDetailTabs/SDRMeetingsResults";
import { SDRNotesCoaching } from "@/components/SDRDetailTabs/SDRNotesCoaching";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/lib/supabase";
import { format, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ACTIVE_SQL_MEETING_STATUSES } from "@/lib/sqlMeetings";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

type FilterPreset = "last7days" | "last30days" | "thisMonth" | "lastMonth" | "campaign";

interface SDRDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  sdr: {
    name: string;
    initials: string;
    rank: number;
    dials: number;
    answered: number;
    dms: number;
    sqls: number;
    trend: number;
    clientId?: string;
  };
  globalDateRange?: DateRange;
  campaignDates?: { start: string; end: string } | null;
  parentFilterType?: string;
}

const getPresetRange = (preset: FilterPreset, campaignDates?: { start: string; end: string } | null): DateRange => {
  const now = new Date();
  switch (preset) {
    case "last7days":
      return { from: subDays(now, 6), to: now };
    case "last30days":
      return { from: subDays(now, 29), to: now };
    case "thisMonth":
      return { from: startOfMonth(now), to: endOfMonth(now) };
    case "lastMonth": {
      const prev = subMonths(now, 1);
      return { from: startOfMonth(prev), to: endOfMonth(prev) };
    }
    case "campaign": {
      if (campaignDates?.start && campaignDates?.end) {
        try {
          return { from: new Date(campaignDates.start + "T00:00:00"), to: new Date(campaignDates.end + "T00:00:00") };
        } catch {
          console.warn("Invalid campaign dates:", campaignDates);
          return { from: startOfMonth(now), to: endOfMonth(now) };
        }
      }
      return { from: startOfMonth(now), to: endOfMonth(now) };
    }
  }
};

export const SDRDetailModal = ({ isOpen, onClose, sdr, globalDateRange, campaignDates: campaignDatesProp, parentFilterType }: SDRDetailModalProps) => {
  const isMobile = useIsMobile();
  // Auto-fetch campaign dates from SDR's client if not passed as prop
  const [fetchedCampaignDates, setFetchedCampaignDates] = useState<{ start: string; end: string } | null>(null);
  
  useEffect(() => {
    if (campaignDatesProp) {
      setFetchedCampaignDates(null);
      return;
    }
    if (!sdr.clientId || !isOpen) return;
    const fetchCampaign = async () => {
      const { data } = await supabase
        .from("clients")
        .select("campaign_start, campaign_end")
        .eq("client_id", sdr.clientId!)
        .maybeSingle();
      if (data?.campaign_start && data?.campaign_end) {
        setFetchedCampaignDates({ start: data.campaign_start, end: data.campaign_end });
      }
    };
    fetchCampaign();
  }, [sdr.clientId, isOpen, campaignDatesProp]);

  const campaignDates = campaignDatesProp || fetchedCampaignDates;

  const defaultPreset: FilterPreset = parentFilterType === "campaign" && campaignDates ? "campaign" : "thisMonth";
  const [activePreset, setActivePreset] = useState<FilterPreset>(defaultPreset);
  
  useEffect(() => {
    if (isOpen) {
      setActivePreset(parentFilterType === "campaign" && campaignDates ? "campaign" : "thisMonth");
    }
  }, [isOpen, parentFilterType, campaignDates]);

  const dateRange = useMemo(() => getPresetRange(activePreset, campaignDates), [activePreset, campaignDates]);
  const { isAdmin, isManager, isSdr } = useUserRole();
  const [dynamicStats, setDynamicStats] = useState<{ rank: number; sqls: number; convRate: string } | null>(null);
  const [teamAverages, setTeamAverages] = useState<{ dials: number; answered: number; dms: number; sqls: number } | undefined>();
  const [latestSQL, setLatestSQL] = useState<{ contact_person: string; company_name: string; booking_date: string } | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  const showNotesTab = isAdmin || isManager || isSdr;
  const isSdrViewingOwn = isSdr;

  // Log warning if clientId missing
  useEffect(() => {
    if (isOpen && !sdr.clientId) {
      console.warn(`SDRDetailModal opened for "${sdr.name}" without clientId — falling back to all clients`);
    }
  }, [isOpen, sdr.clientId, sdr.name]);

  const tabs = [
    { id: "overview", label: "Performance Overview", shortLabel: "Overview" },
    { id: "timeline", label: "Activity Timeline", shortLabel: "Timeline" },
    { id: "meetings", label: "Meetings & Results", shortLabel: "Meetings" },
    ...(showNotesTab ? [{ id: "notes", label: isSdrViewingOwn ? "My Goals" : "Notes & Coaching", shortLabel: isSdrViewingOwn ? "Goals" : "Notes" }] : []),
  ];

  const datePresets: { id: FilterPreset; label: string }[] = [
    { id: "last7days", label: "Last 7 Days" },
    { id: "last30days", label: "Last 30 Days" },
    { id: "thisMonth", label: "This Month" },
    { id: "lastMonth", label: "Last Month" },
    ...(campaignDates?.start && campaignDates?.end ? [{ id: "campaign" as FilterPreset, label: "Campaign" }] : []),
  ];

  // Fetch latest SQL meeting within filtered period + client
  useEffect(() => {
    const fetchLatestSQL = async () => {
      if (!dateRange?.from || !dateRange?.to) return;
      const startDate = format(dateRange.from, "yyyy-MM-dd");
      const endDate = format(dateRange.to, "yyyy-MM-dd");
      let query = supabase
        .from("sql_meetings")
        .select("contact_person, company_name, booking_date")
        .eq("sdr_name", sdr.name)
        .in("meeting_status", [...ACTIVE_SQL_MEETING_STATUSES])
        .gte("booking_date", startDate)
        .lte("booking_date", endDate);
      if (sdr.clientId) query = query.eq("client_id", sdr.clientId);
      const { data } = await query
        .order("booking_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      setLatestSQL(data);
    };
    if (isOpen) fetchLatestSQL();
  }, [sdr.name, sdr.clientId, isOpen, dateRange]);

  // Fetch team averages for comparison — filtered by SDR's client
  useEffect(() => {
    const fetchTeamAvg = async () => {
      if (!dateRange?.from || !dateRange?.to) return;
      const startDate = format(dateRange.from, "yyyy-MM-dd");
      const endDate = format(dateRange.to, "yyyy-MM-dd");

      const { data } = await supabase.rpc("get_team_leaderboard", {
        p_start_date: melbourneStartOfDay(startDate),
        p_end_date: melbourneEndOfDay(endDate),
        p_client_id: sdr.clientId || null,
      });

      if (data && data.length > 0) {
        const sdrCount = data.length;
        let totalDials = 0, totalAnswered = 0, totalDMs = 0, totalSQLs = 0;
        for (const row of data) {
          totalDials += Number(row.total_dials) || 0;
          totalAnswered += Number(row.answered) || 0;
          totalDMs += Number(row.dm_conversations) || 0;
          totalSQLs += Number(row.sqls) || 0;
        }
        setTeamAverages({
          dials: Math.round(totalDials / sdrCount),
          answered: Math.round(totalAnswered / sdrCount),
          dms: Math.round(totalDMs / sdrCount),
          sqls: Math.round(totalSQLs / sdrCount),
        });

        // Dynamic badges: rank within same client team
        const sorted = [...data].sort((a, b) => (Number(b.sqls) || 0) - (Number(a.sqls) || 0) || (Number(b.total_dials) || 0) - (Number(a.total_dials) || 0));
        const sdrRow = sorted.find((r: any) => r.sdr_name === sdr.name);
        const sdrRank = sorted.findIndex((r: any) => r.sdr_name === sdr.name) + 1;
        if (sdrRow) {
          const d = Number(sdrRow.total_dials) || 0;
          const s = Number(sdrRow.sqls) || 0;
          setDynamicStats({
            rank: sdrRank || sdr.rank,
            sqls: s,
            convRate: d > 0 ? ((s / d) * 100).toFixed(2) : "0.00",
          });
        } else {
          setDynamicStats(null);
        }
      } else {
        setTeamAverages(undefined);
        setDynamicStats(null);
      }
    };
    if (isOpen) fetchTeamAvg();
  }, [dateRange, sdr.name, sdr.clientId, isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[90vw] max-w-[1400px] h-screen md:h-auto md:max-h-[90vh] overflow-y-auto p-0 gap-0">
        {/* Header */}
        <DialogHeader className="p-4 sm:p-6 pb-3 sm:pb-4 border-b border-border sticky top-0 bg-card z-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
            {/* Left: Avatar + name + badges */}
            <div className="flex items-center gap-3 sm:gap-4 flex-1 w-full sm:w-auto">
              <Avatar className="h-12 w-12 sm:h-16 sm:w-16 shrink-0">
                <AvatarFallback className="text-base sm:text-lg bg-primary/20 text-primary">
                  {sdr.initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <h2 className="text-xl sm:text-2xl font-bold text-foreground truncate">{sdr.name}</h2>
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-2">
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-xs sm:text-sm">
                    Rank: #{dynamicStats?.rank ?? sdr.rank}
                  </Badge>
                  <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30 text-xs sm:text-sm">
                    {dynamicStats?.sqls ?? sdr.sqls} SQLs
                  </Badge>
                  <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30 text-xs sm:text-sm hidden sm:inline-flex">
                    {dynamicStats?.convRate ?? (sdr.dials > 0 ? ((sdr.sqls / sdr.dials) * 100).toFixed(2) : "0.00")}% Conversion
                  </Badge>
                </div>
              </div>
            </div>

            {/* Right: Date tabs + close button */}
            <div className="flex flex-col items-end gap-2 w-full sm:w-auto">
              <div className="flex items-center gap-2">
                <div className="flex flex-wrap items-center gap-1">
                  {datePresets.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => setActivePreset(preset.id)}
                      className={`px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                        activePreset === preset.id
                          ? "bg-[#0f172a] text-white dark:bg-white dark:text-[#0f172a]"
                          : "bg-white text-[#0f172a] hover:bg-muted/50 dark:bg-transparent dark:text-foreground border border-border"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                <Button variant="ghost" size="icon" onClick={onClose} className="min-h-[44px] min-w-[44px] shrink-0">
                  <X className="h-5 w-5" />
                </Button>
              </div>
              {/* Filtered period — below date tabs */}
              {dateRange?.from && dateRange?.to && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground self-start">
                  <CalendarIcon className="h-4 w-4" />
                  <span>Filtered period: {format(dateRange.from, "MMM dd, yyyy")} – {format(dateRange.to, "MMM dd, yyyy")}{activePreset === "campaign" ? " (Campaign)" : ""}</span>
                </div>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="p-4 sm:p-6">
          {/* Pill-toggle tab bar */}
          <div className="overflow-x-auto scrollbar-thin -mx-4 sm:mx-0 px-4 sm:px-0 mb-4 sm:mb-6">
            <div className="inline-flex items-center gap-1 rounded-lg p-1 border border-border">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? "bg-[#0f172a] text-white dark:bg-white dark:text-[#0f172a]"
                      : "bg-white text-[#0f172a] hover:bg-muted/50 dark:bg-transparent dark:text-foreground"
                  }`}
                >
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.shortLabel}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Tab content */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              <SDRPerformanceOverview sdr={sdr} teamAverages={teamAverages} latestSQL={latestSQL} dateRange={dateRange} clientId={sdr.clientId} />
            </div>
          )}

          {activeTab === "timeline" && (
            <div className="space-y-6">
              <SDRActivityTimeline sdrName={sdr.name} dateRange={dateRange} clientId={sdr.clientId} />
            </div>
          )}

          {activeTab === "meetings" && (
            <div className="space-y-6">
              <SDRMeetingsResults sdrName={sdr.name} dateRange={dateRange} clientId={sdr.clientId} />
            </div>
          )}

          {activeTab === "notes" && showNotesTab && (
            <div className="space-y-6">
              <SDRNotesCoaching sdrName={sdr.name} isSdrView={isSdrViewingOwn} />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
