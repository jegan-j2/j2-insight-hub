import { createContext, useContext, useState, ReactNode } from "react";
import type { DateRange } from "react-day-picker";

interface DateFilterContextType {
  dateRange: DateRange | undefined;
  setDateRange: (range: DateRange | undefined) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

const DateFilterContext = createContext<DateFilterContextType | undefined>(undefined);

export const DateFilterProvider = ({ children }: { children: ReactNode }) => {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(2025, 9, 14), // October 14, 2025
    to: new Date(2025, 9, 21), // October 21, 2025
  });
  const [isLoading, setIsLoading] = useState(false);

  return (
    <DateFilterContext.Provider value={{ dateRange, setDateRange, isLoading, setIsLoading }}>
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
