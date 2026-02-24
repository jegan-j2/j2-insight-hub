import { useTheme } from "@/contexts/ThemeContext";

const LOGO_LIGHT = "https://eaeqkgjhgdykxwjkaxpj.supabase.co/storage/v1/object/public/branding/j2_logo_new_lightmode.png";
const LOGO_DARK = "https://eaeqkgjhgdykxwjkaxpj.supabase.co/storage/v1/object/public/branding/j2_logo_new_darkmode.png";

export const J2Loader = () => {
  const { resolvedTheme } = useTheme();

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] dark:bg-[#111827]">
      <div className="flex flex-col items-center gap-4">
        <img
          src={resolvedTheme === "dark" ? LOGO_DARK : LOGO_LIGHT}
          alt="J2 Group"
          className="w-[72px] h-[72px] rounded-full object-contain border-2 border-[#0f172a] dark:border-white animate-[spin_2s_linear_infinite]"
        />
        <p className="text-sm font-semibold text-[#64748b] dark:text-[rgba(255,255,255,0.5)]">
          Loading...
        </p>
      </div>
    </div>
  );
};
