import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useMeetingUpdate } from "@/hooks/useMeetingUpdate";
import { Pencil } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ArrowUpDown, Download, ChevronLeft, ChevronRight, Calendar as CalendarIcon, X, CalendarDays } from "lucide-react";
import { format, isWithinInterval } from "date-fns";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/EmptyState";
import { TableSkeleton } from "@/components/LoadingSkeletons";
import type { DateRange } from "react-day-picker";
import { CalendarX, Search as SearchIcon } from "lucide-react";

interface MeetingData {
  id: string;
  sqlDate: Date;
  clientName: string;
  contactPerson: string;
  companyName: string;
  sdr: string;
  meetingDate: Date;
  meetingHeld: boolean;
  remarks: string;
}

const mockMeetingsData: MeetingData[] = [
  {
    id: "1",
    sqlDate: new Date(2025, 9, 15),
    clientName: "Inxpress",
    contactPerson: "John Smith",
    companyName: "Global Shipping Co",
    sdr: "Ava Monyebane",
    meetingDate: new Date(2025, 9, 18),
    meetingHeld: true,
    remarks: "Positive discussion, follow-up scheduled",
  },
  {
    id: "2",
    sqlDate: new Date(2025, 9, 16),
    clientName: "Congero",
    contactPerson: "Sarah Johnson",
    companyName: "TechVision Inc",
    sdr: "Reggie Makhanya",
    meetingDate: new Date(2025, 9, 20),
    meetingHeld: true,
    remarks: "Interested in premium package",
  },
  {
    id: "3",
    sqlDate: new Date(2025, 9, 16),
    clientName: "Inxpress",
    contactPerson: "Michael Brown",
    companyName: "Express Logistics Ltd",
    sdr: "Clive Sambane",
    meetingDate: new Date(2025, 9, 19),
    meetingHeld: false,
    remarks: "Rescheduled to next week",
  },
  {
    id: "4",
    sqlDate: new Date(2025, 9, 17),
    clientName: "TechCorp Solutions",
    contactPerson: "Emily Davis",
    companyName: "Digital Dynamics",
    sdr: "Ava Monyebane",
    meetingDate: new Date(2025, 9, 22),
    meetingHeld: true,
    remarks: "Strong lead, proposal sent",
  },
  {
    id: "5",
    sqlDate: new Date(2025, 9, 17),
    clientName: "Congero",
    contactPerson: "David Wilson",
    companyName: "Cloud Systems Pro",
    sdr: "Reggie Makhanya",
    meetingDate: new Date(2025, 9, 21),
    meetingHeld: false,
    remarks: "Waiting for decision maker availability",
  },
  {
    id: "6",
    sqlDate: new Date(2025, 9, 18),
    clientName: "Global Logistics",
    contactPerson: "Lisa Anderson",
    companyName: "International Freight Co",
    sdr: "Clive Sambane",
    meetingDate: new Date(2025, 9, 23),
    meetingHeld: true,
    remarks: "Budget approved, moving to contract",
  },
  {
    id: "7",
    sqlDate: new Date(2025, 9, 18),
    clientName: "FinServe Group",
    contactPerson: "Robert Taylor",
    companyName: "Capital Finance Ltd",
    sdr: "Ava Monyebane",
    meetingDate: new Date(2025, 9, 24),
    meetingHeld: true,
    remarks: "Compliance review in progress",
  },
  {
    id: "8",
    sqlDate: new Date(2025, 9, 19),
    clientName: "Inxpress",
    contactPerson: "Jennifer Martinez",
    companyName: "Rapid Delivery Services",
    sdr: "Reggie Makhanya",
    meetingDate: new Date(2025, 9, 25),
    meetingHeld: false,
    remarks: "Technical questions raised",
  },
  {
    id: "9",
    sqlDate: new Date(2025, 9, 19),
    clientName: "HealthCare Plus",
    contactPerson: "Thomas Garcia",
    companyName: "MedTech Solutions",
    sdr: "Clive Sambane",
    meetingDate: new Date(2025, 9, 26),
    meetingHeld: true,
    remarks: "Integration discussion completed",
  },
  {
    id: "10",
    sqlDate: new Date(2025, 9, 20),
    clientName: "Congero",
    contactPerson: "Patricia Lee",
    companyName: "Enterprise Software Group",
    sdr: "Ava Monyebane",
    meetingDate: new Date(2025, 9, 27),
    meetingHeld: false,
    remarks: "Awaiting stakeholder approval",
  },
  {
    id: "11",
    sqlDate: new Date(2025, 9, 20),
    clientName: "TechCorp Solutions",
    contactPerson: "Christopher White",
    companyName: "Innovation Labs",
    sdr: "Reggie Makhanya",
    meetingDate: new Date(2025, 9, 28),
    meetingHeld: true,
    remarks: "Demo scheduled for next phase",
  },
  {
    id: "12",
    sqlDate: new Date(2025, 9, 21),
    clientName: "Global Logistics",
    contactPerson: "Amanda Harris",
    companyName: "Worldwide Transport",
    sdr: "Clive Sambane",
    meetingDate: new Date(2025, 9, 29),
    meetingHeld: true,
    remarks: "Contract negotiations ongoing",
  },
];

type SortField = "sqlDate" | "clientName" | "contactPerson" | "companyName" | "sdr" | "meetingDate" | "meetingHeld";
type SortOrder = "asc" | "desc";

interface SQLBookedMeetingsTableProps {
  dateRange?: DateRange;
  isLoading?: boolean;
}

export const SQLBookedMeetingsTable = ({ dateRange, isLoading = false }: SQLBookedMeetingsTableProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("sqlDate");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sdrFilter, setSdrFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [bookingDateFilter, setBookingDateFilter] = useState<Date | undefined>();
  const [meetingDateFilter, setMeetingDateFilter] = useState<Date | undefined>();
  const [localMeetings, setLocalMeetings] = useState<MeetingData[]>(mockMeetingsData);
  const { updateMeetingHeld, updateRemarks, updating } = useMeetingUpdate();

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
    const success = await updateRemarks(meetingId, newRemarks);
    if (!success) {
      setLocalMeetings(prev => prev.map(m => m.id === meetingId ? { ...m, remarks: original } : m));
    }
  }, [updateRemarks, localMeetings]);
  
  const rowsPerPage = 10;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const handleExportCSV = () => {
    const headers = ["SQL Date", "Client", "Contact Person", "Company", "SDR", "Meeting Date", "Meeting Held", "Remarks"];
    const csvData = filteredMeetings.map(meeting => [
      format(meeting.sqlDate, "MMM dd, yyyy"),
      meeting.clientName,
      meeting.contactPerson,
      meeting.companyName,
      meeting.sdr,
      format(meeting.meetingDate, "MMM dd, yyyy"),
      meeting.meetingHeld ? "Yes" : "No",
      meeting.remarks,
    ]);

    const csv = [
      headers.join(","),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sql-meetings-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const clearAllFilters = () => {
    setClientFilter("all");
    setStatusFilter("all");
    setSdrFilter("all");
    setSearchQuery("");
    setBookingDateFilter(undefined);
    setMeetingDateFilter(undefined);
    setCurrentPage(1);
  };

  const activeFiltersCount = [
    clientFilter !== "all",
    statusFilter !== "all",
    sdrFilter !== "all",
    searchQuery !== "",
    bookingDateFilter !== undefined,
    meetingDateFilter !== undefined,
  ].filter(Boolean).length;

  const filteredMeetings = useMemo(() => {
    let filtered = [...localMeetings];

    // Apply date range filter from context
    if (dateRange?.from && dateRange?.to) {
      filtered = filtered.filter(m => 
        isWithinInterval(m.sqlDate, { start: dateRange.from!, end: dateRange.to! })
      );
    }

    if (clientFilter !== "all") {
      filtered = filtered.filter(m => m.clientName === clientFilter);
    }

    if (statusFilter === "held") {
      filtered = filtered.filter(m => m.meetingHeld);
    } else if (statusFilter === "not-held") {
      filtered = filtered.filter(m => !m.meetingHeld);
    }

    if (sdrFilter !== "all") {
      filtered = filtered.filter(m => m.sdr === sdrFilter);
    }

    if (bookingDateFilter) {
      filtered = filtered.filter(m => 
        format(m.sqlDate, "yyyy-MM-dd") === format(bookingDateFilter, "yyyy-MM-dd")
      );
    }

    if (meetingDateFilter) {
      filtered = filtered.filter(m => 
        format(m.meetingDate, "yyyy-MM-dd") === format(meetingDateFilter, "yyyy-MM-dd")
      );
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(m =>
        m.contactPerson.toLowerCase().includes(query) ||
        m.companyName.toLowerCase().includes(query) ||
        m.sdr.toLowerCase().includes(query)
      );
    }

    filtered.sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      if (sortField === "sqlDate" || sortField === "meetingDate") {
        aVal = aVal.getTime();
        bVal = bVal.getTime();
      } else if (sortField === "meetingHeld") {
        aVal = aVal ? 1 : 0;
        bVal = bVal ? 1 : 0;
      } else if (typeof aVal === "string") {
        return sortOrder === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
    });

    return filtered;
  }, [localMeetings, dateRange, clientFilter, statusFilter, sdrFilter, searchQuery, bookingDateFilter, meetingDateFilter, sortField, sortOrder]);

  const totalPages = Math.ceil(filteredMeetings.length / rowsPerPage);
  const paginatedMeetings = filteredMeetings.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const clients = Array.from(new Set(localMeetings.map(m => m.clientName))).sort();
  const sdrs = Array.from(new Set(localMeetings.map(m => m.sdr))).sort();

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

  if (isLoading) {
    return <TableSkeleton />;
  }

  const hasActiveFilters = activeFiltersCount > 0;
  const showEmptyState = filteredMeetings.length === 0;

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border animate-fade-in" style={{ animationDelay: "600ms" }}>
      <CardHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-foreground">SQL Booked Meetings - All Clients</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Showing {filteredMeetings.length} of {localMeetings.length} meetings
              </p>
            </div>
            <div className="flex gap-2">
              {activeFiltersCount > 0 && (
                <Button
                  onClick={clearAllFilters}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <X className="h-4 w-4" />
                  Clear Filters ({activeFiltersCount})
                </Button>
              )}
              <Button
                onClick={handleExportCSV}
                variant="outline"
                size="sm"
                className="gap-2 border-secondary text-secondary hover:bg-secondary/10"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            <Input
              placeholder="Search contact, company..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-background/50 border-border min-h-[44px]"
              aria-label="Search meetings"
            />
            
            {/* Booking Date Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal min-h-[44px]",
                    !bookingDateFilter && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {bookingDateFilter ? format(bookingDateFilter, "MMM dd, yyyy") : "Booking Date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-card border-border z-50" align="start">
                <Calendar
                  mode="single"
                  selected={bookingDateFilter}
                  onSelect={(date) => {
                    setBookingDateFilter(date);
                    setCurrentPage(1);
                  }}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>

            {/* Meeting Date Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal min-h-[44px]",
                    !meetingDateFilter && "text-muted-foreground"
                  )}
                >
                  <CalendarDays className="mr-2 h-4 w-4" />
                  {meetingDateFilter ? format(meetingDateFilter, "MMM dd, yyyy") : "Meeting Date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-card border-border z-50" align="start">
                <Calendar
                  mode="single"
                  selected={meetingDateFilter}
                  onSelect={(date) => {
                    setMeetingDateFilter(date);
                    setCurrentPage(1);
                  }}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>

            <Select value={clientFilter} onValueChange={(v) => { setClientFilter(v); setCurrentPage(1); }}>
              <SelectTrigger className="bg-background/50 border-border min-h-[44px]" aria-label="Filter by client">
                <SelectValue placeholder="All Clients" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border z-50">
                <SelectItem value="all">All Clients</SelectItem>
                {clients.map(client => (
                  <SelectItem key={client} value={client}>{client}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sdrFilter} onValueChange={(v) => { setSdrFilter(v); setCurrentPage(1); }}>
              <SelectTrigger className="bg-background/50 border-border min-h-[44px]" aria-label="Filter by SDR">
                <SelectValue placeholder="All SDRs" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border z-50">
                <SelectItem value="all">All SDRs</SelectItem>
                {sdrs.map(sdr => (
                  <SelectItem key={sdr} value={sdr}>{sdr}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
              <SelectTrigger className="bg-background/50 border-border min-h-[44px]" aria-label="Filter by meeting status">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border z-50">
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="held">Meeting Held</SelectItem>
                <SelectItem value="not-held">Not Held</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Active Filter Badges */}
          {activeFiltersCount > 0 && (
            <div className="flex flex-wrap gap-2">
              {clientFilter !== "all" && (
                <Badge variant="secondary" className="gap-1">
                  Client: {clientFilter}
                  <button
                    onClick={() => setClientFilter("all")}
                    className="ml-1 hover:text-destructive"
                    aria-label="Remove client filter"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {statusFilter !== "all" && (
                <Badge variant="secondary" className="gap-1">
                  Status: {statusFilter === "held" ? "Held" : "Not Held"}
                  <button
                    onClick={() => setStatusFilter("all")}
                    className="ml-1 hover:text-destructive"
                    aria-label="Remove status filter"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {sdrFilter !== "all" && (
                <Badge variant="secondary" className="gap-1">
                  SDR: {sdrFilter}
                  <button
                    onClick={() => setSdrFilter("all")}
                    className="ml-1 hover:text-destructive"
                    aria-label="Remove SDR filter"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {bookingDateFilter && (
                <Badge variant="secondary" className="gap-1">
                  Booked: {format(bookingDateFilter, "MMM dd, yyyy")}
                  <button
                    onClick={() => setBookingDateFilter(undefined)}
                    className="ml-1 hover:text-destructive"
                    aria-label="Remove booking date filter"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {meetingDateFilter && (
                <Badge variant="secondary" className="gap-1">
                  Meeting: {format(meetingDateFilter, "MMM dd, yyyy")}
                  <button
                    onClick={() => setMeetingDateFilter(undefined)}
                    className="ml-1 hover:text-destructive"
                    aria-label="Remove meeting date filter"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {searchQuery && (
                <Badge variant="secondary" className="gap-1">
                  Search: "{searchQuery}"
                  <button
                    onClick={() => setSearchQuery("")}
                    className="ml-1 hover:text-destructive"
                    aria-label="Remove search filter"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto scrollbar-thin scroll-gradient">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground sticky left-0 bg-card z-20">
                  <SortButton field="sqlDate" label="SQL Date" />
                </TableHead>
                <TableHead className="text-muted-foreground">
                  <SortButton field="clientName" label="Client" />
                </TableHead>
                <TableHead className="text-muted-foreground">
                  <SortButton field="contactPerson" label="Contact Person" />
                </TableHead>
                <TableHead className="text-muted-foreground">
                  <SortButton field="companyName" label="Company" />
                </TableHead>
                <TableHead className="text-muted-foreground">
                  <SortButton field="sdr" label="SDR" />
                </TableHead>
                <TableHead className="text-muted-foreground">
                  <SortButton field="meetingDate" label="Meeting Date" />
                </TableHead>
                <TableHead className="text-muted-foreground">
                  <SortButton field="meetingHeld" label="Meeting Held" />
                </TableHead>
                <TableHead className="text-muted-foreground">Remarks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedMeetings.map((meeting, index) => (
                <TableRow
                  key={meeting.id}
                  className={`border-border/50 hover:bg-muted/20 transition-colors ${
                    index % 2 === 0 ? "bg-muted/5" : ""
                  } ${updating === meeting.id ? "opacity-60" : ""}`}
                >
                  <TableCell className="text-foreground whitespace-nowrap sticky left-0 bg-card z-10">
                    {format(meeting.sqlDate, "MMM dd, yyyy")}
                  </TableCell>
                  <TableCell className="text-foreground font-medium whitespace-nowrap">
                    {meeting.clientName}
                  </TableCell>
                  <TableCell className="text-foreground whitespace-nowrap">
                    {meeting.contactPerson}
                  </TableCell>
                  <TableCell className="text-foreground">
                    {meeting.companyName}
                  </TableCell>
                  <TableCell className="text-foreground whitespace-nowrap">
                    {meeting.sdr}
                  </TableCell>
                  <TableCell className="text-foreground whitespace-nowrap">
                    {format(meeting.meetingDate, "MMM dd, yyyy")}
                  </TableCell>
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
                  <TableCell colSpan={8} className="py-12">
                    {hasActiveFilters ? (
                      <EmptyState 
                        icon={SearchIcon}
                        title="No results found"
                        description="Try adjusting your search terms or filters"
                        actionLabel="Clear Filters"
                        onAction={clearAllFilters}
                      />
                    ) : localMeetings.length === 0 ? (
                      <EmptyState 
                        icon={CalendarX}
                        title="No meetings booked yet"
                        description="SQL meetings will appear here once leads are generated"
                      />
                    ) : (
                      <EmptyState 
                        icon={CalendarX}
                        title="No meetings in this period"
                        description="No SQL booked meetings found for the selected date range"
                      />
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="border-border"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="border-border"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
