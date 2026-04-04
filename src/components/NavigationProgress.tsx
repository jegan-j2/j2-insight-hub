import { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";

export const NavigationProgress = () => {
  const location = useLocation();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const prevPath = useRef(location.pathname);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (location.pathname === prevPath.current) return;
    prevPath.current = location.pathname;

    // Start
    setVisible(true);
    setProgress(0);

    // Quick jump to ~70%
    requestAnimationFrame(() => setProgress(70));

    // Complete after a short delay
    timerRef.current = setTimeout(() => {
      setProgress(100);
      setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 300);
    }, 400);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [location.pathname]);

  if (!visible && progress === 0) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] h-[2px] pointer-events-none"
      role="progressbar"
      aria-valuenow={progress}
    >
      <div
        className="h-full bg-[#0f172a] dark:bg-white"
        style={{
          width: `${progress}%`,
          transition: progress === 0
            ? "none"
            : progress === 100
              ? "width 200ms ease-out, opacity 300ms ease-out"
              : "width 600ms cubic-bezier(0.4, 0, 0.2, 1)",
          opacity: progress === 100 ? 0 : 1,
        }}
      />
    </div>
  );
};
