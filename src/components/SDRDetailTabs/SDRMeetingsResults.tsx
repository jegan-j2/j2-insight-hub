import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle, Calendar, TrendingUp, Play } from "lucide-react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { format, differenceInDays } from "date-fns";

interface SDRMeetingsResultsProps {
  sdrName: string;
}

interface SqlMeeting {
  id: string;
  booking_date: string;
  client_id: string | null;
  contact_person: string;
  company_name: string | null;
  contact_email: string | null;
  meeting_date: string | null;
  meeting_status: string | null;
  remarks: string | null;
  client_notes: string | null;
  sdr_name: string | null;
  hubspot_engagement_id: string | null;
  edited_in_dashboard: boolean | null;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: "#DBEAFE", text: "#1E40AF", label: "Pending" },
  held: { bg: "#D1FAE5", text: "#065F46", label: "Held" },
  no_show: { bg: "#FEF3C7", text: "#92400E", label: "No Show" },
  reschedule: { bg: "#EDE9FE", text: "#5B21B6", label: "Rescheduled" },
  cancelled: { bg: "#F1F5F9", text: "#475569", label: "Cancelled" },
};

export const SDRMeetingsResults = ({ sdrName }: SDRMeetingsResultsProps) => {
  const [meetings, setMeetings] = useState<SqlMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientNames, setClientNames] = useState<Record<string, string>>({});
  const [recordingMap, setRecordingMap] = useState<Record<string, string>>({});
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const { toast } = useToast();
  const itemsPerPage = 15;

  const fetchMeetings = useCallback(async () => {
    setLoading(true);
    const [{ data: mtgs }, { data: clients }] = await Promise.all([
      supabase
        .from("sql_meetings")
        .select("*")
        .eq("sdr_name", sdrName)
        .order("booking_date", { ascending: false })
        .order("meeting_date", { ascending: false }),
      supabase.from("clients").select("client_id, client_name"),
    ]);

    if (mtgs) setMeetings(mtgs);
    if (clients) {
      const map: Record<string, string> = {};
      for (const c of clients) map[c.client_id] = c.client_name;
      setClientNames(map);
    }

    // Fetch recordings via hubspot_engagement_id
    if (mtgs && mtgs.length > 0) {
      const engagementIds = mtgs
        .map((m) => m.hubspot_engagement_id)
        .filter((id): id is string => !!id);

      if (engagementIds.length > 0) {
        const { data: recordings } = await supabase
          .from("activity_log")
          .select("hubspot_engagement_id, recording_url")
          .in("hubspot_engagement_id", engagementIds)
          .not("recording_url", "is", null);

        if (recordings) {
          const rMap: Record<string, string> = {};
          for (const r of recordings) {
            if (r.hubspot_engagement_id && r.recording_url) {
              rMap[r.hubspot_engagement_id] = r.recording_url;
            }
          }
          setRecordingMap(rMap);
        }
      }
    }

    setLoading(false);
  }, [sdrName]);

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  // Subscribe to realtime changes
  useEffect(() => {
    const channel = supabase
      .channel("sdr-meetings-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sql_meetings", filter: `sdr_name=eq.${sdrName}` },
        () => fetchMeetings()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [sdrName, fetchMeetings]);

  // Unique clients for filter
  const clientOptions = useMemo(() => {
    const ids = [...new Set(meetings.map((m) => m.client_id).filter(Boolean))];
    return ids.map((id) => ({ id: id!, name: clientNames[id!] || id! }));
  }, [meetings, clientNames]);

  // Filter & sort
  const filteredMeetings = useMemo(() => {
    return meetings.filter((m) => {
      if (statusFilter !== "all" && m.meeting_status !== statusFilter) return false;
      if (clientFilter !== "all" && m.client_id !== clientFilter) return false;
      return true;
    });
  }, [meetings, statusFilter, clientFilter]);

  // KPIs — exclude cancelled
  const kpis = useMemo(() => {
    const eligible = meetings.filter((m) => m.meeting_status !== "cancelled");
    const heldOrNoShow = eligible.filter((m) => m.meeting_status === "held" || m.meeting_status === "no_show");
    const held = heldOrNoShow.filter((m) => m.meeting_status === "held");
    const showUpRate = heldOrNoShow.length > 0 ? (held.length / heldOrNoShow.length) * 100 : 0;

    // Avg days from booking to meeting (only for meetings with both dates)
    let totalDays = 0;
    let dayCount = 0;
    for (const m of eligible) {
      if (m.booking_date && m.meeting_date) {
        const diff = differenceInDays(new Date(m.meeting_date), new Date(m.booking_date));
        if (diff >= 0) {
          totalDays += diff;
          dayCount += 1;
        }
      }
    }
    const avgDays = dayCount > 0 ? (totalDays / dayCount).toFixed(1) : "—";

    return {
      showUpRate: showUpRate.toFixed(0),
      heldCount: held.length,
      totalEligible: eligible.length,
      avgDays,
    };
  }, [meetings]);

  // Pagination
  const totalPages = Math.ceil(filteredMeetings.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedMeetings = filteredMeetings.slice(startIndex, startIndex + itemsPerPage);

  // Inline remarks editing
  const handleSaveRemarks = async (meetingId: string) => {
    const prev = meetings.find((m) => m.id === meetingId);
    // Optimistic update
    setMeetings((prev) =>
      prev.map((m) => (m.id === meetingId ? { ...m, remarks: editValue, edited_in_dashboard: true } : m))
    );
    setEditingId(null);

    const { error } = await supabase
      .from("sql_meetings")
      .update({ remarks: editValue, edited_in_dashboard: true, last_edited_at: new Date().toISOString() })
      .eq("id", meetingId);

    if (error) {
      // Revert
      if (prev) {
        setMeetings((all) => all.map((m) => (m.id === meetingId ? prev : m)));
      }
      toast({ title: "Failed to save remarks", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Remarks saved", className: "border-[#10b981]" });
    }
  };

  const getStatusBadge = (status: string | null) => {
    const s = STATUS_STYLES[status || "pending"] || STATUS_STYLES.pending;
    return (
      <Badge
        className="border-0 font-medium"
        style={{ backgroundColor: s.bg, color: s.text }}
      >
        {s.label}
      </Badge>
    );
  };

  if (loading) {
    return <div className="text-center text-sm text-muted-foreground py-8">Loading meetings…</div>;
  }

  return (
    <>
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <p className="text-sm text-muted-foreground">Meeting Show-up Rate</p>
            </div>
            <p className="text-3xl font-bold text-foreground">{kpis.showUpRate}%</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              <p className="text-sm text-muted-foreground">Meetings Held</p>
            </div>
            <p className="text-3xl font-bold text-foreground">
              {kpis.heldCount} <span className="text-lg text-muted-foreground">of {kpis.totalEligible}</span>
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              <p className="text-sm text-muted-foreground">Avg Days to Meeting</p>
            </div>
            <p className="text-3xl font-bold text-foreground">{kpis.avgDays}</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle>SQL Meetings ({filteredMeetings.length})</CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={clientFilter} onValueChange={(v) => { setClientFilter(v); setCurrentPage(1); }}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by client" />
                </SelectTrigger>
                <SelectContent className="z-[100] bg-card">
                  <SelectItem value="all">All Clients</SelectItem>
                  {clientOptions.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="z-[100] bg-card">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="held">Held</SelectItem>
                  <SelectItem value="no_show">No Show</SelectItem>
                  <SelectItem value="reschedule">Rescheduled</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={() => { setClientFilter("all"); setStatusFilter("all"); setCurrentPage(1); }}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="table-header-navy">
                <TableRow>
                  <TableHead className="text-left">Booking Date</TableHead>
                  <TableHead className="text-left">Client</TableHead>
                  <TableHead className="text-left">Contact</TableHead>
                  <TableHead className="text-left">Company</TableHead>
                  <TableHead className="text-left">Meeting Date</TableHead>
                  <TableHead className="text-left">Status</TableHead>
                  <TableHead className="text-center">Recording</TableHead>
                  <TableHead className="text-left min-w-[200px]">Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="table-striped">
                {paginatedMeetings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      No meetings found
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedMeetings.map((meeting) => {
                    const recordingUrl = meeting.hubspot_engagement_id
                      ? recordingMap[meeting.hubspot_engagement_id]
                      : undefined;

                    return (
                      <TableRow key={meeting.id}>
                        <TableCell className="text-left whitespace-nowrap">
                          {format(new Date(meeting.booking_date), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell className="text-left whitespace-nowrap">
                          {clientNames[meeting.client_id || ""] || meeting.client_id || "—"}
                        </TableCell>
                        <TableCell className="text-left">{meeting.contact_person}</TableCell>
                        <TableCell className="text-left">{meeting.company_name || "—"}</TableCell>
                        <TableCell className="text-left whitespace-nowrap">
                          {meeting.meeting_date
                            ? format(new Date(meeting.meeting_date), "MMM dd, yyyy")
                            : "TBC"}
                        </TableCell>
                        <TableCell className="text-left">
                          {getStatusBadge(meeting.meeting_status)}
                        </TableCell>
                        <TableCell className="text-center">
                          {recordingUrl ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => window.open(recordingUrl, "_blank")}
                              title="Play recording"
                            >
                              <Play className="h-4 w-4 text-primary" />
                            </Button>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-left min-w-[200px]">
                          {editingId === meeting.id ? (
                            <Input
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => handleSaveRemarks(meeting.id)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSaveRemarks(meeting.id);
                                if (e.key === "Escape") setEditingId(null);
                              }}
                              autoFocus
                              className="h-8 text-sm"
                            />
                          ) : (
                            <span
                              className="cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5 -mx-1 block truncate max-w-[300px]"
                              onClick={() => {
                                setEditingId(meeting.id);
                                setEditValue(meeting.remarks || "");
                              }}
                              title={meeting.remarks || "Click to add remarks"}
                            >
                              {meeting.remarks || <span className="text-muted-foreground italic">Add remarks…</span>}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Showing {startIndex + 1}–{Math.min(startIndex + itemsPerPage, filteredMeetings.length)} of{" "}
                {filteredMeetings.length} meetings
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
};
