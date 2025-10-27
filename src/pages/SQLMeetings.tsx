import { SQLBookedMeetingsTable } from "@/components/SQLBookedMeetingsTable";
import { useDateFilter } from "@/contexts/DateFilterContext";

const SQLMeetings = () => {
  const { dateRange } = useDateFilter();

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">SQL Meetings</h1>
        <p className="text-muted-foreground mt-2">
          Track and manage all SQL booked meetings across clients
        </p>
      </div>
      
      <SQLBookedMeetingsTable dateRange={dateRange} />
    </div>
  );
};

export default SQLMeetings;
