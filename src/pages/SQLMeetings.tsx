import { SQLBookedMeetingsTable } from "@/components/SQLBookedMeetingsTable";
import { useDateFilter } from "@/contexts/DateFilterContext";
import { useState, useEffect } from "react";

const SQLMeetings = () => {
  const { dateRange } = useDateFilter();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    document.title = "J2 Dashboard - SQL Meetings";
  }, []);

  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, [dateRange]);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">SQL Meetings</h1>
        <p className="text-muted-foreground mt-2">
          Track and manage all SQL booked meetings across clients
        </p>
      </div>
      
      <SQLBookedMeetingsTable dateRange={dateRange} isLoading={isLoading} />
    </div>
  );
};

export default SQLMeetings;
