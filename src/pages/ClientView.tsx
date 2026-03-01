import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertCircle, RefreshCw, DatabaseZap, ChevronDown, CalendarIcon } from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth, subMonths, isSameDay } from "date-fns";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";
import { ClientBanner } from "@/components/ClientBanner";
import { ClientKPICards } from "@/components/ClientKPICards";
import { ClientCampaignCards } from "@/components/ClientCampaignCards";
import { ClientViewMeetingsTable } from "@/components/ClientViewMeetingsTable";
import { ClientDrillDownModal } from "@/components/ClientDrillDownModal";
import { EmptyState } from "@/components/EmptyState";
import { KPICardSkeleton, TableSkeleton } from "@/components/LoadingSkeletons";
import { useClientViewData } from "@/hooks/useClientViewData";
import { supabase } from "@/lib/supabase";

type FilterType = "last7days" | "last30days" | "thisMonth" | "lastMonth" | "custom";

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour <= 11) return "Good morning";
  if (hour >= 12 && hour <= 16) return "Good afternoon";
  if (hour >= 17 && hour <= 20) return "Good evening";
  return "Welcome back";
};

const ClientView = () => {
  const { clientSlug } = useParams();
  const [firstName, setFirstName] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<FilterType>("thisMonth");
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [customRange, setCustomRange] = useState<DateRange | undefined>(undefined);
  const [customPopoverOpen, setCustomPopoverOpen] = useState(false);
  const [answeredModalOpen, setAnsweredModalOpen] = useState(false);
  const [dmsModalOpen, setDmsModalOpen] = useState(false);

  const { loading, error, client, kpis, campaign, meetings, answeredCalls, dmConversations, meetingOutcomes, nextMeeting, refetch } =
    useClientViewData(clientSlug || "", dateRange);

  const clientName = client?.client_name || clientSlug?.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()) || "Unknown Client";

  useEffect(() => {
    document.title = `J2 Insights Dashboard - ${clientName}`;
  }, [clientName]);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const fullName = user.user_metadata?.full_name || user.user_metadata?.name;
      if (fullName && typeof fullName === "string") {
        setFirstName(fullName.split(" ")[0]);
      } else if (user.email) {
        const local = user.email.split("@")[0];
        setFirstName(local.charAt(0).toUpperCase() + local.slice(1));
      }
    };
    getUser();
  }, []);

  const filters = [
    { label: "Last 7 Days", type: "last7days" as FilterType, range: { from: subDays(new Date(), 7), to: new Date() } },
    { label: "Last 30 Days", type: "last30days" as FilterType, range: { from: subDays(new Date(), 30), to: new Date() } },
    { label: "This Month", type: "thisMonth" as FilterType, range: { from: startOfMonth(new Date()), to: endOfMonth(new Date()) } },
    { label: "Last Month", type: "lastMonth" as FilterType, range: { from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) } },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Section 1: Banner */}
      <ClientBanner
        clientSlug={clientSlug || ""}
        clientName={clientName}
        dateRange={dateRange}
      />

      {/* Section 2: Personalised Greeting */}
      <div>
        {firstName && (
          <p className="font-medium text-base text-muted-foreground mb-1">
            {getGreeting()}, {firstName}!
          </p>
        )}
        <h1 className="text-3xl font-bold text-foreground">Campaign Overview</h1>
      </div>

      {/* Section 3: Date Filters */}
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => {
            const isActive = filterType === filter.type && dateRange?.from && dateRange?.to && isSameDay(dateRange.from, filter.range.from) && isSameDay(dateRange.to, filter.range.to);
            return (
              <Button
                key={filter.type}
                variant={isActive ? "default" : "outline"}
                size="sm"
                onClick={() => { setDateRange(filter.range); setFilterType(filter.type); setCustomRange(undefined); }}
                className={cn(
                  "transition-all duration-200 min-h-[44px] active:scale-95 text-xs sm:text-sm",
                  isActive
                    ? "bg-[#0f172a] hover:bg-[#0f172a] text-white font-semibold shadow-md dark:bg-white dark:hover:bg-white dark:text-[#0f172a]"
                    : "bg-transparent text-muted-foreground border border-border hover:bg-muted/50 hover:text-foreground"
                )}
              >
                {filter.label}
              </Button>
            );
          })}
          <Popover open={customPopoverOpen} onOpenChange={setCustomPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant={filterType === "custom" ? "default" : "outline"}
                size="sm"
                className={cn(
                  "transition-all duration-200 min-h-[44px] active:scale-95 text-xs sm:text-sm",
                  filterType === "custom"
                    ? "bg-[#0f172a] hover:bg-[#0f172a] text-white font-semibold shadow-md dark:bg-white dark:hover:bg-white dark:text-[#0f172a]"
                    : "bg-transparent text-muted-foreground border border-border hover:bg-muted/50 hover:text-foreground"
                )}
              >
                Custom <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-card border-border z-[100]" align="start" sideOffset={8}>
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={new Date()}
                selected={customRange}
                onSelect={(range) => {
                  setCustomRange(range);
                  if (range?.from && range?.to) {
                    setDateRange(range);
                    setFilterType("custom");
                    setCustomPopoverOpen(false);
                  }
                }}
                numberOfMonths={2}
                className="pointer-events-auto p-3"
              />
            </PopoverContent>
          </Popover>
        </div>
        {dateRange?.from && dateRange?.to && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarIcon className="h-4 w-4" />
            <span>Filtered period: {format(dateRange.from, "MMM dd, yyyy")} – {format(dateRange.to, "MMM dd, yyyy")}</span>
          </div>
        )}
        {client?.campaign_start && client?.campaign_end && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarIcon className="h-4 w-4" />
            <span>Campaign Period: {format(new Date(client.campaign_start), "MMM dd")} – {format(new Date(client.campaign_end), "MMM dd, yyyy")}</span>
          </div>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-lg border border-destructive/50 bg-destructive/10 text-destructive animate-fade-in">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span className="text-sm flex-1">{error}</span>
          <Button variant="outline" size="sm" onClick={refetch} className="gap-2 shrink-0">
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        </div>
      )}

      {/* Section 4: KPI Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => <KPICardSkeleton key={i} />)}
        </div>
      ) : !error && kpis.totalDials === 0 && kpis.totalAnswered === 0 ? (
        <EmptyState
          icon={DatabaseZap}
          title="No activity data available yet"
          description="Data will appear once HubSpot sync is active for this client"
        />
      ) : (
        <>
          <ClientKPICards
            kpis={kpis}
            onAnsweredClick={() => setAnsweredModalOpen(true)}
            onDMsClick={() => setDmsModalOpen(true)}
          />

          {/* Section 6: Campaign Cards */}
          {campaign && <ClientCampaignCards campaign={campaign} meetingOutcomes={meetingOutcomes} nextMeeting={nextMeeting} />}
        </>
      )}

      {/* Section 7: SQL Meetings Table */}
      {loading ? (
        <TableSkeleton />
      ) : (
        <ClientViewMeetingsTable clientSlug={clientSlug || ""} meetings={meetings} />
      )}

      {/* Drill-down Modals */}
      <ClientDrillDownModal
        open={answeredModalOpen}
        onOpenChange={setAnsweredModalOpen}
        title="Answered Calls"
        records={answeredCalls}
      />
      <ClientDrillDownModal
        open={dmsModalOpen}
        onOpenChange={setDmsModalOpen}
        title="Decision Maker Conversations"
        records={dmConversations}
      />
    </div>
  );
};

export default ClientView;
