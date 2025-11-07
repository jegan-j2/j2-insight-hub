import { createContext, useContext, useState, ReactNode } from "react";
import { startOfMonth, endOfMonth } from "date-fns";
import type { DateRange } from "react-day-picker";

export type FilterType = "last7days" | "last30days" | "thisMonth" | "lastMonth" | "custom";

interface DateFilterContextType {
  dateRange: DateRange | undefined;
  setDateRange: (range: DateRange | undefined) => void;
  filterType: FilterType;
  setFilterType: (type: FilterType) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

const DateFilterContext = createContext<DateFilterContextType | undefined>(undefined);

export const DateFilterProvider = ({ children }: { children: ReactNode }) => {
  // Default to "This Month"
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [filterType, setFilterType] = useState<FilterType>("thisMonth");
  const [isLoading, setIsLoading] = useState(false);

  // Log date changes for testing
  const handleDateChange = (range: DateRange | undefined) => {
    setDateRange(range);
    console.log("📅 Date filter changed:", {
      from: range?.from,
      to: range?.to,
      filterType,
    });
  };

  const handleFilterTypeChange = (type: FilterType) => {
    setFilterType(type);
    console.log("🔄 Filter type changed:", type);
  };

  return (
    <DateFilterContext.Provider 
      value={{ 
        dateRange, 
        setDateRange: handleDateChange, 
        filterType, 
        setFilterType: handleFilterTypeChange,
        isLoading, 
        setIsLoading 
      }}
    >
      {children}
    </DateFilterContext.Provider>
  );
};

export const useDateFilter = () => {
  const context = useContext(DateFilterContext);
  if (context === undefined) {
    throw new Error("useDateFilter must be used within a DateFilterProvider");
  }
  return context;
};
