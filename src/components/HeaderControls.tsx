import { Button } from "@/components/ui/button";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  MinusIcon,
  MoonIcon,
  MonitorIcon,
  SettingsIcon,
  SquareIcon,
  SunIcon,
  XIcon,
} from "lucide-react";

type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "theme";

function applyTheme(theme: Theme) {
  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  document.documentElement.classList.toggle("dark", isDark);
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system")
      return stored;
    return "system";
  });

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    localStorage.setItem(STORAGE_KEY, t);
  }, []);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("system");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  return { theme, setTheme };
}

const themeIcons: Record<Theme, typeof SunIcon> = {
  light: SunIcon,
  dark: MoonIcon,
  system: MonitorIcon,
};

const nextTheme: Record<Theme, Theme> = {
  light: "dark",
  dark: "system",
  system: "light",
};

const isTauri = "__TAURI_INTERNALS__" in window;

async function handleMinimize() {
  if (!isTauri) return;
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  getCurrentWindow().minimize();
}

async function handleToggleMaximize() {
  if (!isTauri) return;
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  getCurrentWindow().toggleMaximize();
}

async function handleClose() {
  if (!isTauri) return;
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  getCurrentWindow().close();
}

export default function HeaderControls() {
  const { theme, setTheme } = useTheme();
  const ThemeIcon = themeIcons[theme];
  const navigate = useNavigate();
  const location = useLocation();
  const isSettings = location.pathname.startsWith("/settings");

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setTheme(nextTheme[theme])}
        title="切换主题"
      >
        <ThemeIcon className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => navigate(isSettings ? "/" : "/settings")}
        className={isSettings ? "bg-muted" : ""}
        title="设置"
      >
        <SettingsIcon className="size-4" />
      </Button>
      {isTauri && (
        <>
          <Button variant="ghost" size="icon" onClick={handleMinimize}>
            <MinusIcon className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleToggleMaximize}>
            <SquareIcon className="size-3.5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <XIcon className="size-4" />
          </Button>
        </>
      )}
    </>
  );
}
