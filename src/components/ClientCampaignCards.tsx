import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import type { ClientViewData } from "@/hooks/useClientViewData";

interface ClientCampaignCardsProps {
  campaign: NonNullable<ClientViewData["campaign"]>;
  meetingOutcomes?: ClientViewData["meetingOutcomes"];
  nextMeeting?: ClientViewData["nextMeeting"];
  weekActivity?: ClientViewData["weekActivity"];
}

export const ClientCampaignCards = ({ campaign, meetingOutcomes, nextMeeting, weekActivity }: ClientCampaignCardsProps) => {
  const sqlPct = Math.min(campaign.sqlPercentage, 100);
  const timePct = Math.min(campaign.timePercentage, 100);
  const daysLabel = campaign.daysRemaining === 1 ? "day" : "days";

  const nextMeetingValue = nextMeeting
    ? `${format(new Date(nextMeeting.date), "MMM d, yyyy")} – ${nextMeeting.company}`
    : "Coming soon";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
      {/* SQL Progress */}
      <Card className="bg-card/50 backdrop-blur-sm border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold text-[#0f172a] dark:text-[#f1f5f9]">SQL Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* ROW 1: Progress bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Progress</span>
              <span className="text-sm font-semibold text-[#3b82f6]">{campaign.sqlPercentage.toFixed(1)}%</span>
            </div>
            <Progress value={sqlPct} className="h-3 [&>div]:bg-[#3b82f6]" />
            <p className="text-sm text-muted-foreground">
              {campaign.achievedSQLs} of {campaign.targetSQLs} SQLs achieved
            </p>
          </div>

          {/* ROW 2: SQLs Generated / Leads Remaining */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-muted/20 border border-border">
              <p className="text-xs text-muted-foreground mb-1">SQLs Generated</p>
              <p className="text-lg font-bold text-foreground">{campaign.achievedSQLs}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/20 border border-border">
              <p className="text-xs text-muted-foreground mb-1">Leads Remaining</p>
              <p className="text-lg font-bold text-foreground">{campaign.remaining}</p>
            </div>
          </div>

          {/* ROW 3: Next/Last Meeting */}
          <div className="p-3 rounded-lg bg-muted/20 border border-border">
            <p className="text-xs text-muted-foreground mb-1">
              {nextMeeting ? nextMeeting.label : "First Meeting"}
            </p>
            <p className={`font-bold ${nextMeeting ? "text-foreground" : "text-muted-foreground"}`}>
              {nextMeetingValue}
            </p>
          </div>

          {/* ROW 4: Meeting Outcomes */}
          {meetingOutcomes && (
            <div>
              <p className="text-xs text-muted-foreground mb-2 mt-4">Meeting Outcomes</p>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 rounded-lg bg-muted/20 border border-border text-center">
                  <p className="text-xs text-muted-foreground mb-1">Held ✓</p>
                  <p className="text-lg font-bold text-foreground">{meetingOutcomes.held}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/20 border border-border text-center">
                  <p className="text-xs text-muted-foreground mb-1">Pending</p>
                  <p className="text-lg font-bold text-foreground">{meetingOutcomes.pending}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/20 border border-border text-center">
                  <p className="text-xs text-muted-foreground mb-1">No Show</p>
                  <p className="text-lg font-bold text-foreground">{meetingOutcomes.noShow}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Time Progress */}
      <Card className="bg-card/50 backdrop-blur-sm border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold text-[#0f172a] dark:text-[#f1f5f9]">Time Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* ROW 1: Progress bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Progress</span>
              <span className="text-sm font-semibold text-[#3b82f6]">{Math.round(campaign.timePercentage)}%</span>
            </div>
            <Progress value={timePct} className="h-3 [&>div]:bg-[#3b82f6]" />
            <p className="text-sm text-muted-foreground">
              {campaign.elapsedWorkingDays} of {campaign.totalWorkingDays} days elapsed
            </p>
          </div>

          {/* ROW 2: Campaign Start / End */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-muted/20 border border-border">
              <p className="text-xs text-muted-foreground mb-1">Campaign Start</p>
              <p className="text-lg font-bold text-foreground">
                {campaign.campaignStart ? format(new Date(campaign.campaignStart), "MMM d") : "—"}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted/20 border border-border">
              <p className="text-xs text-muted-foreground mb-1">Campaign End</p>
              <p className="text-lg font-bold text-foreground">
                {campaign.campaignEnd ? format(new Date(campaign.campaignEnd), "MMM d") : "—"}
              </p>
            </div>
          </div>

          {/* ROW 3: Days Remaining */}
          <div className="p-3 rounded-lg bg-muted/20 border border-border">
            <p className="text-xs text-muted-foreground mb-1">Days Remaining</p>
            <p className={`text-lg text-foreground ${campaign.daysRemaining <= 10 ? "font-bold" : "font-bold"}`}>
              {campaign.daysRemaining} {daysLabel}
            </p>
          </div>

          {/* ROW 4: SQLs Booked */}
          {weekActivity && (
            <div>
              <p className="text-xs text-muted-foreground mb-2 mt-4">SQLs Booked</p>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 rounded-lg bg-muted/20 border border-border text-center">
                  <p className="text-xs text-muted-foreground mb-1">This Campaign</p>
                  <p className="text-lg font-bold text-foreground">{weekActivity.thisCampaign}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/20 border border-border text-center">
                  <p className="text-xs text-muted-foreground mb-1">This Week</p>
                  <p className="text-lg font-bold text-foreground">{weekActivity.thisWeek}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/20 border border-border text-center">
                  <p className="text-xs text-muted-foreground mb-1">Last Week</p>
                  <p className="text-lg font-bold text-foreground">{weekActivity.lastWeek}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
