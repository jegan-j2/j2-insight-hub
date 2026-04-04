import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, CalendarIcon } from "lucide-react";
import { DateRangePicker } from "@/components/DateRangePicker";
import { useState, useEffect } from "react";
import type { DateRange } from "react-day-picker";
import { SDRPerformanceOverview } from "@/components/SDRDetailTabs/SDRPerformanceOverview";
import { SDRActivityTimeline } from "@/components/SDRDetailTabs/SDRActivityTimeline";
import { SDRMeetingsResults } from "@/components/SDRDetailTabs/SDRMeetingsResults";
import { SDRNotesCoaching } from "@/components/SDRDetailTabs/SDRNotesCoaching";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/lib/supabase";
import { format, parseISO } from "date-fns";

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
  };
  globalDateRange?: DateRange;
}

export const SDRDetailModal = ({ isOpen, onClose, sdr, globalDateRange }: SDRDetailModalProps) => {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(globalDateRange);
  const { isAdmin, isManager, isSdr } = useUserRole();
  const conversionRate = sdr.dials > 0 ? ((sdr.sqls / sdr.dials) * 100).toFixed(2) : "0.00";
  const [teamAverages, setTeamAverages] = useState<{ dials: number; answered: number; dms: number; sqls: number } | undefined>();
  const [latestSQL, setLatestSQL] = useState<{ contact_person: string; company_name: string; booking_date: string } | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  const showNotesTab = isAdmin || isManager || isSdr;
  const isSdrViewingOwn = isSdr;
  const isClientRole = isClient;

  const tabs = [
    { id: "overview", label: "Performance Overview", shortLabel: "Overview" },
    { id: "timeline", label: "Activity Timeline", shortLabel: "Timeline" },
    { id: "meetings", label: "Meetings & Results", shortLabel: "Meetings" },
    ...(showNotesTab ? [{ id: "notes", label: isSdrViewingOwn ? "My Goals" : "Notes & Coaching", shortLabel: isSdrViewingOwn ? "Goals" : "Notes" }] : []),
  ];

  // Fetch latest SQL meeting for this SDR
  useEffect(() => {
    const fetchLatestSQL = async () => {
      const { data } = await supabase
        .from("sql_meetings")
        .select("contact_person, company_name, booking_date")
        .eq("sdr_name", sdr.name)
        .not("meeting_status", "eq", "cancelled")
        .order("booking_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      setLatestSQL(data);
    };
    if (isOpen) fetchLatestSQL();
  }, [sdr.name, isOpen]);

  // Fetch team averages for comparison
  useEffect(() => {
    const fetchTeamAvg = async () => {
      if (!dateRange?.from || !dateRange?.to) return;
      const startDate = format(dateRange.from, "yyyy-MM-dd");
      const endDate = format(dateRange.to, "yyyy-MM-dd");

      const { data } = await supabase.rpc("get_team_leaderboard", {
        p_start_date: startDate + "T00:00:00+11:00",
        p_end_date: endDate + "T23:59:59+11:00",
        p_client_id: null,
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
      }
    };
    fetchTeamAvg();
  }, [dateRange]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[90vw] max-w-[1400px] h-screen md:h-auto md:max-h-[90vh] overflow-y-auto p-0 gap-0">
        {/* Header */}
        <DialogHeader className="p-4 sm:p-6 pb-3 sm:pb-4 border-b border-border sticky top-0 bg-card z-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
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
                    Rank: #{sdr.rank}
                  </Badge>
                  <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30 text-xs sm:text-sm">
                    {sdr.sqls} SQLs
                  </Badge>
                  <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30 text-xs sm:text-sm hidden sm:inline-flex">
                    {conversionRate}% Conversion
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-end">
              <div className="hidden md:block">
                <DateRangePicker date={dateRange} onDateChange={setDateRange} />
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} className="min-h-[44px] min-w-[44px]">
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
          <div className="md:hidden mt-3 w-full">
            <DateRangePicker date={dateRange} onDateChange={setDateRange} className="w-full" />
          </div>
          {/* Filtered period */}
          {dateRange?.from && dateRange?.to && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
              <CalendarIcon className="h-4 w-4" />
              <span>Filtered period: {format(dateRange.from, "MMM dd, yyyy")} – {format(dateRange.to, "MMM dd, yyyy")}</span>
            </div>
          )}
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
              <SDRPerformanceOverview sdr={sdr} teamAverages={teamAverages} latestSQL={latestSQL} />
            </div>
          )}

          {activeTab === "timeline" && (
            <div className="space-y-6">
              <SDRActivityTimeline sdrName={sdr.name} />
            </div>
          )}

          {activeTab === "meetings" && (
            <div className="space-y-6">
              <SDRMeetingsResults sdrName={sdr.name} />
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
