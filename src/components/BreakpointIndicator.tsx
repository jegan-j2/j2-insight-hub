import { useEffect, useState } from "react";

export const BreakpointIndicator = () => {
  const [breakpoint, setBreakpoint] = useState<string>("");

  useEffect(() => {
    const updateBreakpoint = () => {
      const width = window.innerWidth;
      if (width < 640) setBreakpoint("XS");
      else if (width < 768) setBreakpoint("SM");
      else if (width < 1024) setBreakpoint("MD");
      else if (width < 1280) setBreakpoint("LG");
      else if (width < 1536) setBreakpoint("XL");
      else setBreakpoint("2XL");
    };

    updateBreakpoint();
    window.addEventListener("resize", updateBreakpoint);
    return () => window.removeEventListener("resize", updateBreakpoint);
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-[9999] pointer-events-none">
      <div className="bg-red-500 text-white text-xs font-mono px-2 py-1 rounded-full shadow-lg flex items-center gap-2">
        <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
        <span className="font-semibold">{breakpoint}</span>
        <span className="opacity-75">{window.innerWidth}px</span>
      </div>
    </div>
  );
};
