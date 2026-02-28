import { useState, useMemo, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowUpDown, Download, ChevronLeft, ChevronRight, CalendarX, Check } from "lucide-react";
import { useMeetingUpdate } from "@/hooks/useMeetingUpdate";
import { usePermissions } from "@/hooks/useUserRole";
import { format, isWithinInterval, parseISO } from "date-fns";
import type { DateRange } from "react-day-picker";
import type { SQLMeeting } from "@/lib/supabase-types";
import { EmptyState } from "@/components/EmptyState";

interface MeetingData {
  id: string;
  sqlDate: Date;
  clientId: string;
  contactPerson: string;
  companyName: string;
  sdr: string;
  meetingDate: Date;
  meetingStatus: string;
  clientNotes: string;
}

const STATUS_OPTIONS: { value: string; label: string; color: string; icon?: typeof Check }[] = [
  { value: "pending", label: "Pending", color: "#f59e0b" },
  { value: "held", label: "Held", color: "#10b981", icon: Check },
  { value: "no_show", label: "No Show", color: "#f43f5e" },
  { value: "reschedule", label: "Reschedule", color: "#3b82f6" },
];

const getStatusConfig = (status: string) =>
  STATUS_OPTIONS.find(s => s.value === status) ?? STATUS_OPTIONS[0];

type SortField = "sqlDate" | "contactPerson" | "companyName" | "sdr" | "meetingDate" | "meetingStatus";
type SortOrder = "asc" | "desc";

interface ClientSQLMeetingsTableProps {
  clientSlug: string;
  dateRange?: DateRange;
  meetings?: SQLMeeting[];
}

const mapMeetings = (meetings: SQLMeeting[]): MeetingData[] =>
  meetings.map(m => ({
    id: m.id,
    sqlDate: parseISO(m.booking_date),
    clientId: m.client_id || "",
    contactPerson: m.contact_person,
    companyName: m.company_name || "",
    sdr: m.sdr_name || "",
    meetingDate: m.meeting_date ? parseISO(m.meeting_date) : parseISO(m.booking_date),
    meetingStatus: m.meeting_status ?? "pending",
    clientNotes: m.client_notes ?? "",
  }));

export const ClientSQLMeetingsTable = ({ clientSlug, dateRange, meetings }: ClientSQLMeetingsTableProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("sqlDate");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [dateFilterType, setDateFilterType] = useState<string>("booking");
  const { canEditSQL, isSdr } = usePermissions();
  const { updateMeetingStatus, updateClientNotes, createRescheduleRow, updating } = useMeetingUpdate();

  const rowsPerPage = 15;

  const displayMeetings = useMemo(() => {
    if (meetings && meetings.length > 0) return mapMeetings(meetings);
    return [];
  }, [meetings]);

  const [localMeetings, setLocalMeetings] = useState<MeetingData[]>(displayMeetings);
  useEffect(() => { setLocalMeetings(displayMeetings); }, [displayMeetings]);

  const handleStatusChange = useCallback(async (meeting: MeetingData, newStatus: string) => {
    const oldStatus = meeting.meetingStatus;
    setLocalMeetings(prev => prev.map(m => m.id === meeting.id ? { ...m, meetingStatus: newStatus } : m));
    const success = await updateMeetingStatus(meeting.id, newStatus);
    if (!success) {
      setLocalMeetings(prev => prev.map(m => m.id === meeting.id ? { ...m, meetingStatus: oldStatus } : m));
      return;
    }
    if (newStatus === "reschedule") {
      const newRow = await createRescheduleRow({
        client_id: meeting.clientId,
        contact_person: meeting.contactPerson,
        company_name: meeting.companyName,
        sdr_name: meeting.sdr,
      });
      if (newRow) {
        setLocalMeetings(prev => [{
          id: newRow.id,
          sqlDate: parseISO(newRow.booking_date),
          clientId: newRow.client_id || "",
          contactPerson: newRow.contact_person,
          companyName: newRow.company_name || "",
          sdr: newRow.sdr_name || "",
          meetingDate: newRow.meeting_date ? parseISO(newRow.meeting_date) : parseISO(newRow.booking_date),
          meetingStatus: newRow.meeting_status ?? "pending",
          clientNotes: newRow.client_notes ?? "",
        }, ...prev]);
      }
    }
  }, [updateMeetingStatus, createRescheduleRow]);

  const handleNotesChange = useCallback(async (meetingId: string, newNotes: string) => {
    const original = localMeetings.find(m => m.id === meetingId)?.clientNotes || "";
    if (newNotes === original) return;
    setLocalMeetings(prev => prev.map(m => m.id === meetingId ? { ...m, clientNotes: newNotes } : m));
    const success = await updateClientNotes(meetingId, newNotes);
    if (!success) {
      setLocalMeetings(prev => prev.map(m => m.id === meetingId ? { ...m, clientNotes: original } : m));
    }
  }, [updateClientNotes, localMeetings]);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortOrder("asc"); }
  };

  const handleExportCSV = () => {
    const headers = ["SQL Date", "Contact Person", "Company", "SDR", "Meeting Date", "Status", "Notes"];
    const csvData = sortedMeetings.map(m => [
      format(m.sqlDate, "MMM dd, yyyy"), m.contactPerson, m.companyName, m.sdr,
      format(m.meetingDate, "MMM dd, yyyy"), getStatusConfig(m.meetingStatus).label, m.clientNotes,
    ]);
    const csv = [headers.join(","), ...csvData.map(r => r.map(c => `"${c}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${clientSlug}-sql-meetings-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const sortedMeetings = useMemo(() => {
    let filtered = [...localMeetings];
    if (dateRange?.from && dateRange?.to) {
      filtered = filtered.filter(m => isWithinInterval(m.sqlDate, { start: dateRange.from!, end: dateRange.to! }));
    }
    filtered.sort((a, b) => {
      let aVal: any = a[sortField]; let bVal: any = b[sortField];
      if (sortField === "sqlDate" || sortField === "meetingDate") { aVal = aVal.getTime(); bVal = bVal.getTime(); }
      else if (typeof aVal === "string") return sortOrder === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
    });
    return filtered;
  }, [localMeetings, dateRange, sortField, sortOrder]);

  const totalPages = Math.ceil(sortedMeetings.length / rowsPerPage);
  const paginatedMeetings = sortedMeetings.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const SortButton = ({ field, label }: { field: SortField; label: string }) => (
    <button onClick={() => handleSort(field)} className="flex items-center gap-1 hover:text-foreground transition-colors">
      {label} <ArrowUpDown className="h-3 w-3" />
    </button>
  );

  const StatusBadge = ({ meeting }: { meeting: MeetingData }) => {
    const config = getStatusConfig(meeting.meetingStatus);
    const canEdit = !isSdr && canEditSQL(meeting.clientId);
    const badge = (
      <Badge className="gap-1 text-white text-xs cursor-default" style={{ backgroundColor: config.color }}>
        {config.icon && <config.icon className="h-3 w-3" />}
        {config.label}
      </Badge>
    );
    if (!canEdit || updating === meeting.id) return badge;
    return (
      <Select value={meeting.meetingStatus} onValueChange={(v) => handleStatusChange(meeting, v)}>
        <SelectTrigger className="border-0 bg-transparent p-0 h-auto w-auto shadow-none focus:ring-0 [&>svg]:hidden">
          <Badge className="gap-1 text-white text-xs cursor-pointer hover:opacity-90 transition-opacity" style={{ backgroundColor: config.color }}>
            {config.icon && <config.icon className="h-3 w-3" />}
            {config.label}
          </Badge>
        </SelectTrigger>
        <SelectContent className="bg-popover border-border z-50">
          {STATUS_OPTIONS.map(opt => (
            <SelectItem key={opt.value} value={opt.value}>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: opt.color }} />
                {opt.label}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  };

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border animate-fade-in" style={{ animationDelay: "400ms" }}>
      <CardHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-foreground">SQL Booked Meetings</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {sortedMeetings.length} meeting{sortedMeetings.length !== 1 ? 's' : ''} booked
              </p>
            </div>
            <Button onClick={handleExportCSV} variant="outline" size="sm" className="gap-2 border-secondary text-secondary hover:bg-secondary/10">
              <Download className="h-4 w-4" /> Export CSV
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Filter by:</span>
            <Select value={dateFilterType} onValueChange={setDateFilterType}>
              <SelectTrigger className="w-[180px] bg-background/50 border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border z-50">
                <SelectItem value="booking">Booking Date</SelectItem>
                <SelectItem value="meeting">Meeting Date</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto scrollbar-thin scroll-gradient">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent bg-[#f1f5f9] dark:bg-[#1e293b]">
                <TableHead className="px-4 py-2 font-bold text-[#0f172a] dark:text-[#f1f5f9] sticky left-0 z-20 bg-[#f1f5f9] dark:bg-[#1e293b]">
                  <SortButton field="sqlDate" label="SQL Date" />
                </TableHead>
                <TableHead className="px-4 py-2 font-bold text-[#0f172a] dark:text-[#f1f5f9]">
                  <SortButton field="contactPerson" label="Contact Person" />
                </TableHead>
                <TableHead className="px-4 py-2 font-bold text-[#0f172a] dark:text-[#f1f5f9]">
                  <SortButton field="companyName" label="Company" />
                </TableHead>
                <TableHead className="px-4 py-2 font-bold text-[#0f172a] dark:text-[#f1f5f9]">
                  <SortButton field="sdr" label="SDR" />
                </TableHead>
                <TableHead className="px-4 py-2 font-bold text-[#0f172a] dark:text-[#f1f5f9]">
                  <SortButton field="meetingDate" label="Meeting Date" />
                </TableHead>
                <TableHead className="px-4 py-2 font-bold text-[#0f172a] dark:text-[#f1f5f9]">
                  <SortButton field="meetingStatus" label="Status" />
                </TableHead>
                <TableHead className="px-4 py-2 font-bold text-[#0f172a] dark:text-[#f1f5f9]" style={{ minWidth: 200 }}>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedMeetings.map((meeting, index) => (
                <TableRow key={meeting.id} className={`border-border/50 hover:bg-muted/20 transition-colors ${index % 2 === 0 ? "bg-muted/5" : ""} ${updating === meeting.id ? "opacity-60" : ""}`}>
                  <TableCell className="text-foreground whitespace-nowrap sticky left-0 bg-card z-10">{format(meeting.sqlDate, "MMM dd, yyyy")}</TableCell>
                  <TableCell className="text-foreground whitespace-nowrap">{meeting.contactPerson}</TableCell>
                  <TableCell className="text-foreground">{meeting.companyName}</TableCell>
                  <TableCell className="text-foreground whitespace-nowrap">{meeting.sdr}</TableCell>
                  <TableCell className="text-foreground whitespace-nowrap">{format(meeting.meetingDate, "MMM dd, yyyy")}</TableCell>
                  <TableCell><StatusBadge meeting={meeting} /></TableCell>
                  <TableCell style={{ minWidth: 200 }}>
                    <Input
                      defaultValue={meeting.clientNotes}
                      onBlur={(e) => handleNotesChange(meeting.id, e.target.value)}
                      placeholder={!isSdr && canEditSQL(meeting.clientId) ? "Add notes..." : ""}
                      disabled={updating === meeting.id || isSdr || !canEditSQL(meeting.clientId)}
                      className="bg-transparent border border-border/40 hover:border-border focus:border-ring h-8 text-sm rounded px-2"
                    />
                  </TableCell>
                </TableRow>
              ))}
              {paginatedMeetings.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-12">
                    <EmptyState icon={CalendarX} title="No meetings in this period" description="No SQL booked meetings found for the selected date range" />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="border-border">
                <ChevronLeft className="h-4 w-4" /> Previous
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="border-border">
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
