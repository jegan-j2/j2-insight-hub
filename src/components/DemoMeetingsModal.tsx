import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { Play, Square, Volume2 } from "lucide-react";
import { getRecordingUrlWithFallback } from "@/lib/sqlMeetings";
import type { DateRange } from "react-day-picker";

interface DemoRecord {
  id: string;
  contact_person: string | null;
  company_name: string | null;
  booking_date: string;
  meeting_date: string | null;
  meeting_time: string | null;
  demo_status: string;
  hubspot_engagement_id: string | null;
  created_at: string;
  // enriched
  recording_url?: string | null;
  call_duration?: number | null;
}

interface DemoMeetingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sdrName: string;
  clientId: string;
  dateRange: DateRange | undefined;
  metric?: "demoBooked" | "demoAttended";
}

export const DemoMeetingsModal = ({
  isOpen,
  onClose,
  sdrName,
  clientId,
  dateRange,
  metric = "demoBooked",
}: DemoMeetingsModalProps) => {
  const isMobile = useIsMobile();
  const [demos, setDemos] = useState<DemoRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !dateRange?.from || !dateRange?.to) return;
    const fetchDemos = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.rpc("get_sdr_demos", {
          p_sdr_name: sdrName,
          p_client_id: clientId,
          p_start_date: format(dateRange.from!, "yyyy-MM-dd"),
          p_end_date: format(dateRange.to!, "yyyy-MM-dd"),
        });
        if (error || !data) {
          setDemos([]);
          return;
        }

        // ── Recording enrichment — same 2-batch pattern as SQL drill-down ──────
        const rawDemos = data as DemoRecord[];

        // Batch 1: fetch by hubspot_engagement_id
        const engagementIds = rawDemos.map((d) => d.hubspot_engagement_id).filter((id): id is string => !!id);
        const engagementMap = new Map<string, { recording_url: string | null; call_duration: number | null }>();
        if (engagementIds.length > 0) {
          const { data: engData } = await supabase
            .from("activity_log")
            .select("hubspot_engagement_id, recording_url, call_duration")
            .in("hubspot_engagement_id", engagementIds);
          if (engData) {
            for (const row of engData) {
              if (row.hubspot_engagement_id && !engagementMap.has(row.hubspot_engagement_id)) {
                engagementMap.set(row.hubspot_engagement_id, {
                  recording_url: getRecordingUrlWithFallback({
                    recordingUrl: row.recording_url,
                    hubspotEngagementId: row.hubspot_engagement_id,
                  }),
                  call_duration: row.call_duration,
                });
              }
            }
          }
        }

        // Batch 2: fallback by contact_name for demos without engagement match
        const fallbackNames = rawDemos
          .filter((d) => !d.hubspot_engagement_id || !engagementMap.has(d.hubspot_engagement_id!))
          .map((d) => d.contact_person?.trim())
          .filter((n): n is string => !!n);
        const nameMap = new Map<string, { recording_url: string | null; call_duration: number | null }>();
        if (fallbackNames.length > 0) {
          const { data: nameData } = await supabase
            .from("activity_log")
            .select("contact_name, recording_url, call_duration")
            .eq("sdr_name", sdrName)
            .ilike("call_outcome", "connected")
            .in("contact_name", fallbackNames)
            .order("call_duration", { ascending: false });
          if (nameData) {
            for (const row of nameData) {
              const key = row.contact_name?.toLowerCase();
              if (key && !nameMap.has(key)) {
                nameMap.set(key, { recording_url: row.recording_url, call_duration: row.call_duration });
              }
            }
          }
        }

        // Merge recordings into demo records
        const enriched: DemoRecord[] = rawDemos.map((demo) => {
          let recording_url: string | null = null;
          let call_duration: number | null = null;
          if (demo.hubspot_engagement_id && engagementMap.has(demo.hubspot_engagement_id)) {
            const m = engagementMap.get(demo.hubspot_engagement_id)!;
            recording_url = m.recording_url;
            call_duration = m.call_duration;
          } else if (demo.contact_person) {
            const m = nameMap.get(demo.contact_person.trim().toLowerCase());
            if (m) {
              recording_url = m.recording_url;
              call_duration = m.call_duration;
            }
          }
          // Final fallback via engagement ID construction
          recording_url = getRecordingUrlWithFallback({
            recordingUrl: recording_url,
            hubspotEngagementId: demo.hubspot_engagement_id,
          });
          return { ...demo, recording_url, call_duration };
        });

        setDemos(enriched);
      } catch (err) {
        console.error("Error fetching demos:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDemos();
  }, [isOpen, sdrName, clientId, dateRange]);

  // Matches SQL drill-down: "29 Apr 2026 · 4:45 PM"
  const formatBookedAt = (dateStr: string, mode: "live" | "hist" = "hist") => {
    try {
      const d = new Date(dateStr);
      const dateLabel = d.toLocaleDateString("en-AU", {
        timeZone: "Australia/Melbourne",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      const timeLabel = d
        .toLocaleTimeString("en-AU", {
          timeZone: "Australia/Melbourne",
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        })
        .replace(" am", " AM")
        .replace(" pm", " PM");
      return `${dateLabel} · ${timeLabel}`;
    } catch {
      return dateStr;
    }
  };

  // Matches formatScheduledMeetingDateTime in ActivityMonitor
  const formatMeetingDate = (date: string | null, time: string | null) => {
    if (!date) return "-";
    const dateLabel = format(new Date(date + "T00:00:00"), "d MMM yyyy");
    if (!time) return dateLabel;
    const attempt = new Date(`${date}T${time}`);
    if (!isNaN(attempt.getTime())) return format(attempt, "d MMM yyyy, h:mm a");
    return `${dateLabel}, ${time}`;
  };

  const title = metric === "demoAttended" ? "Demo Attended" : "Demo Booked";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={cn(
          "bg-card border-border overflow-hidden flex flex-col",
          isMobile ? "w-full h-full max-w-full max-h-full rounded-none" : "sm:max-w-[900px] max-h-[80vh]",
        )}
      >
        {/* Header — identical to SQL drill-down */}
        <DialogHeader className="shrink-0">
          <DialogTitle>
            {sdrName} – {title}
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {loading ? "Loading..." : `${demos.length} record${demos.length !== 1 ? "s" : ""}`}
          </p>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="h-8 w-8 rounded-full border-2 border-[#0f172a] border-t-transparent animate-spin dark:border-white dark:border-t-transparent" />
            <span className="text-sm text-muted-foreground">Loading...</span>
          </div>
        ) : demos.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No {title.toLowerCase()} records found for this SDR in the selected time range.
          </p>
        ) : (
          <div className="overflow-y-auto overflow-x-hidden flex-1 max-w-full">
            {/* Columns identical to SQL drill-down: Booked At | Contact Person | Company | Meeting Date | Recording */}
            <Table className="table-fixed w-full">
              <TableHeader className="table-header-navy sticky top-0 z-10">
                <TableRow>
                  <TableHead className={cn("text-left", "w-[22%]")}>Booked At</TableHead>
                  <TableHead className={cn("text-left", "w-[20%]")}>Contact Person</TableHead>
                  <TableHead className={cn("text-left", "w-[18%]")}>Company</TableHead>
                  <TableHead className={cn("text-center", "w-[22%]")}>Meeting Date</TableHead>
                  <TableHead className={cn("text-center", "w-[18%]")}>Recording</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="table-striped">
                {demos.map((demo) => (
                  <>
                    <TableRow key={demo.id} className="border-border/50">
                      <TableCell className="text-left text-sm text-muted-foreground whitespace-nowrap tabular-nums">
                        {formatBookedAt(demo.created_at)}
                      </TableCell>
                      <TableCell className="text-left font-medium">{demo.contact_person || "-"}</TableCell>
                      <TableCell className="text-left">{demo.company_name || "-"}</TableCell>
                      <TableCell className="text-center whitespace-nowrap tabular-nums">
                        {formatMeetingDate(demo.meeting_date, demo.meeting_time)}
                      </TableCell>
                      <TableCell className="text-center">
                        {demo.recording_url ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-2 text-xs border-blue-500/30 text-blue-500 hover:bg-blue-500/10"
                            onClick={() => setPlayingId(playingId === demo.id ? null : demo.id)}
                          >
                            {playingId === demo.id ? (
                              <>
                                <Square className="h-3 w-3 mr-1" /> Stop
                              </>
                            ) : (
                              <>
                                <Play className="h-3 w-3 mr-1" /> Play
                              </>
                            )}
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">No recording</span>
                        )}
                      </TableCell>
                    </TableRow>
                    {playingId === demo.id && demo.recording_url && (
                      <TableRow key={`${demo.id}-audio`} className="border-border/50 bg-muted/30">
                        <TableCell colSpan={5} className="py-3">
                          <div className="flex items-center gap-3">
                            <Volume2 className="h-4 w-4 text-blue-500 shrink-0" />
                            <div className="flex-1">
                              <p className="text-xs text-muted-foreground mb-1.5">
                                Demo Recording - {demo.contact_person || "Unknown"}
                              </p>
                              <audio
                                controls
                                src={demo.recording_url}
                                className="w-full h-8"
                                autoPlay
                                onError={() => setPlayingId(null)}
                              />
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
