import { useState, useMemo, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUpDown, Download, ChevronLeft, ChevronRight, CalendarX } from "lucide-react";
import { useMeetingUpdate } from "@/hooks/useMeetingUpdate";
import { format, isWithinInterval, parseISO } from "date-fns";
import type { DateRange } from "react-day-picker";
import type { SQLMeeting } from "@/lib/supabase-types";
import { EmptyState } from "@/components/EmptyState";

interface MeetingData {
  id: string;
  sqlDate: Date;
  contactPerson: string;
  companyName: string;
  sdr: string;
  meetingDate: Date;
  meetingHeld: boolean;
  remarks: string;
}


type SortField = "sqlDate" | "contactPerson" | "companyName" | "sdr" | "meetingDate" | "meetingHeld";
type SortOrder = "asc" | "desc";

interface ClientSQLMeetingsTableProps {
  clientSlug: string;
  dateRange?: DateRange;
  meetings?: SQLMeeting[];
}

const mapMeetingsToDisplay = (meetings: SQLMeeting[]): MeetingData[] =>
  meetings.map(m => ({
    id: m.id,
    sqlDate: parseISO(m.booking_date),
    contactPerson: m.contact_person,
    companyName: m.company_name,
    sdr: m.sdr_name,
    meetingDate: m.meeting_date ? parseISO(m.meeting_date) : parseISO(m.booking_date),
    meetingHeld: m.meeting_held,
    remarks: m.remarks || "",
  }));

export const ClientSQLMeetingsTable = ({ clientSlug, dateRange, meetings }: ClientSQLMeetingsTableProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("sqlDate");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [dateFilterType, setDateFilterType] = useState<string>("booking");
  const { updateMeetingHeld, updateClientNotes, updating } = useMeetingUpdate();
  
  const rowsPerPage = 10;

  const displayMeetings = useMemo(() => {
    if (meetings && meetings.length > 0) return mapMeetingsToDisplay(meetings);
    return [];
  }, [meetings]);

  const [localMeetings, setLocalMeetings] = useState<MeetingData[]>(displayMeetings);
  useEffect(() => { setLocalMeetings(displayMeetings); }, [displayMeetings]);

  const handleMeetingHeldChange = useCallback(async (meetingId: string, newValue: boolean) => {
    setLocalMeetings(prev => prev.map(m => m.id === meetingId ? { ...m, meetingHeld: newValue } : m));
    const success = await updateMeetingHeld(meetingId, newValue);
    if (!success) {
      setLocalMeetings(prev => prev.map(m => m.id === meetingId ? { ...m, meetingHeld: !newValue } : m));
    }
  }, [updateMeetingHeld]);

  const handleRemarksChange = useCallback(async (meetingId: string, newRemarks: string) => {
    const original = localMeetings.find(m => m.id === meetingId)?.remarks || "";
    if (newRemarks === original) return;
    setLocalMeetings(prev => prev.map(m => m.id === meetingId ? { ...m, remarks: newRemarks } : m));
    const success = await updateClientNotes(meetingId, newRemarks);
    if (!success) {
      setLocalMeetings(prev => prev.map(m => m.id === meetingId ? { ...m, remarks: original } : m));
    }
  }, [updateClientNotes, localMeetings]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const handleExportCSV = () => {
    const headers = ["SQL Date", "Contact Person", "Company", "SDR", "Meeting Date", "Meeting Held", "Remarks"];
    const csvData = sortedMeetings.map(meeting => [
      format(meeting.sqlDate, "MMM dd, yyyy"),
      meeting.contactPerson,
      meeting.companyName,
      meeting.sdr,
      format(meeting.meetingDate, "MMM dd, yyyy"),
      meeting.meetingHeld ? "Yes" : "No",
      meeting.remarks,
    ]);
    const csv = [headers.join(","), ...csvData.map(row => row.map(cell => `"${cell}"`).join(","))].join("\n");
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
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];
      if (sortField === "sqlDate" || sortField === "meetingDate") {
        aVal = aVal.getTime(); bVal = bVal.getTime();
      } else if (sortField === "meetingHeld") {
        aVal = aVal ? 1 : 0; bVal = bVal ? 1 : 0;
      } else if (typeof aVal === "string") {
        return sortOrder === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
    });
    return filtered;
  }, [localMeetings, dateRange, sortField, sortOrder]);

  const totalPages = Math.ceil(sortedMeetings.length / rowsPerPage);
  const paginatedMeetings = sortedMeetings.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const SortButton = ({ field, label }: { field: SortField; label: string }) => (
    <button onClick={() => handleSort(field)} className="flex items-center gap-1 hover:text-foreground transition-colors">
      {label}
      <ArrowUpDown className="h-3 w-3" />
    </button>
  );

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
              <Download className="h-4 w-4" />
              Export CSV
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
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground sticky left-0 bg-card z-20"><SortButton field="sqlDate" label="SQL Date" /></TableHead>
                <TableHead className="text-muted-foreground"><SortButton field="contactPerson" label="Contact Person" /></TableHead>
                <TableHead className="text-muted-foreground"><SortButton field="companyName" label="Company" /></TableHead>
                <TableHead className="text-muted-foreground"><SortButton field="sdr" label="SDR" /></TableHead>
                <TableHead className="text-muted-foreground"><SortButton field="meetingDate" label="Meeting Date" /></TableHead>
                <TableHead className="text-muted-foreground"><SortButton field="meetingHeld" label="Meeting Held" /></TableHead>
                <TableHead className="text-muted-foreground">Remarks</TableHead>
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
                  <TableCell>
                    <Checkbox
                      checked={meeting.meetingHeld}
                      onCheckedChange={(checked) => handleMeetingHeldChange(meeting.id, checked as boolean)}
                      disabled={updating === meeting.id}
                      className="border-border data-[state=checked]:bg-secondary data-[state=checked]:border-secondary"
                    />
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-xs">
                    <Input
                      defaultValue={meeting.remarks || ""}
                      onBlur={(e) => handleRemarksChange(meeting.id, e.target.value)}
                      placeholder="Add remarks..."
                      disabled={updating === meeting.id}
                      className="bg-transparent border-transparent hover:border-border focus:border-ring h-8 text-sm"
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
