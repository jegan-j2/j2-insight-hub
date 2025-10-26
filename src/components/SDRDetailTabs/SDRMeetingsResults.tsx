import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { CheckCircle, Clock, Calendar, TrendingUp } from "lucide-react";
import { useState } from "react";

interface SDRMeetingsResultsProps {
  sdrName: string;
}

// Mock meetings data
const mockMeetings = [
  {
    id: 1,
    bookingDate: "Oct 18, 2025",
    client: "Inxpress",
    contactPerson: "Sarah Johnson",
    company: "Global Shipping Co",
    meetingDate: "Oct 22, 2025",
    status: "held",
    remarks: "Very interested in our services",
  },
  {
    id: 2,
    bookingDate: "Oct 17, 2025",
    client: "Congero",
    contactPerson: "Michael Chen",
    company: "Tech Innovations Inc",
    meetingDate: "Oct 25, 2025",
    status: "pending",
    remarks: "Follow-up scheduled",
  },
  {
    id: 3,
    bookingDate: "Oct 15, 2025",
    client: "Inxpress",
    contactPerson: "Emily Davis",
    company: "Logistics Plus",
    meetingDate: "Oct 20, 2025",
    status: "held",
    remarks: "Excellent conversation, moving to next stage",
  },
  {
    id: 4,
    bookingDate: "Oct 14, 2025",
    client: "TechCorp Solutions",
    contactPerson: "James Wilson",
    company: "Software Systems Ltd",
    meetingDate: "Oct 19, 2025",
    status: "held",
    remarks: "Requested proposal",
  },
  {
    id: 5,
    bookingDate: "Oct 12, 2025",
    client: "FinServe Group",
    contactPerson: "Lisa Anderson",
    company: "Financial Services Co",
    meetingDate: "Oct 23, 2025",
    status: "pending",
    remarks: "Budget discussion needed",
  },
  {
    id: 6,
    bookingDate: "Oct 10, 2025",
    client: "Inxpress",
    contactPerson: "Robert Brown",
    company: "Express Freight",
    meetingDate: "Oct 16, 2025",
    status: "held",
    remarks: "Strong interest shown",
  },
  {
    id: 7,
    bookingDate: "Oct 9, 2025",
    client: "Congero",
    contactPerson: "Jennifer Lee",
    company: "Marketing Solutions",
    meetingDate: "Oct 24, 2025",
    status: "pending",
    remarks: "Decision maker confirmed",
  },
  {
    id: 8,
    bookingDate: "Oct 8, 2025",
    client: "TechCorp Solutions",
    contactPerson: "David Martinez",
    company: "Cloud Services Inc",
    meetingDate: "Oct 15, 2025",
    status: "held",
    remarks: "Product demo successful",
  },
  {
    id: 9,
    bookingDate: "Oct 7, 2025",
    client: "FinServe Group",
    contactPerson: "Amanda Taylor",
    company: "Investment Partners",
    meetingDate: "Oct 21, 2025",
    status: "held",
    remarks: "Pricing discussion",
  },
  {
    id: 10,
    bookingDate: "Oct 5, 2025",
    client: "Inxpress",
    contactPerson: "Christopher White",
    company: "Transport Solutions",
    meetingDate: "Oct 18, 2025",
    status: "held",
    remarks: "Excellent fit for our solution",
  },
];

export const SDRMeetingsResults = ({ sdrName }: SDRMeetingsResultsProps) => {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filter meetings
  const filteredMeetings = mockMeetings.filter((meeting) => {
    if (statusFilter !== "all" && meeting.status !== statusFilter) return false;
    if (clientFilter !== "all" && meeting.client !== clientFilter) return false;
    return true;
  });

  const heldMeetings = mockMeetings.filter((m) => m.status === "held").length;
  const totalMeetings = mockMeetings.length;
  const showUpRate = ((heldMeetings / totalMeetings) * 100).toFixed(0);
  const avgDaysToMeeting = 5.2;

  // Pagination
  const totalPages = Math.ceil(filteredMeetings.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedMeetings = filteredMeetings.slice(startIndex, startIndex + itemsPerPage);

  return (
    <>
      {/* Success Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <p className="text-sm text-muted-foreground">Meeting Show-up Rate</p>
            </div>
            <p className="text-3xl font-bold text-foreground">{showUpRate}%</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              <p className="text-sm text-muted-foreground">Meetings Held</p>
            </div>
            <p className="text-3xl font-bold text-foreground">
              {heldMeetings} <span className="text-lg text-muted-foreground">of {totalMeetings}</span>
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              <p className="text-sm text-muted-foreground">Avg Days to Meeting</p>
            </div>
            <p className="text-3xl font-bold text-foreground">{avgDaysToMeeting}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle>SQL Meetings ({filteredMeetings.length})</CardTitle>
            <div className="flex items-center gap-2">
              <Select value={clientFilter} onValueChange={setClientFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  <SelectItem value="Inxpress">Inxpress</SelectItem>
                  <SelectItem value="Congero">Congero</SelectItem>
                  <SelectItem value="TechCorp Solutions">TechCorp Solutions</SelectItem>
                  <SelectItem value="FinServe Group">FinServe Group</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="held">✓ Held</SelectItem>
                  <SelectItem value="pending">⏱ Pending</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setClientFilter("all");
                  setStatusFilter("all");
                }}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Booking Date</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Contact Person</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Meeting Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedMeetings.map((meeting) => (
                  <TableRow key={meeting.id}>
                    <TableCell className="font-medium">{meeting.bookingDate}</TableCell>
                    <TableCell>{meeting.client}</TableCell>
                    <TableCell>{meeting.contactPerson}</TableCell>
                    <TableCell>{meeting.company}</TableCell>
                    <TableCell>{meeting.meetingDate}</TableCell>
                    <TableCell>
                      {meeting.status === "held" ? (
                        <Badge className="bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30">
                          ✓ Held
                        </Badge>
                      ) : (
                        <Badge className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30">
                          ⏱ Pending
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{meeting.remarks}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredMeetings.length)} of{" "}
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
