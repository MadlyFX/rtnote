import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { useColorScheme } from "react-native";
import { readMobileThemePreference, writeMobileThemePreference, type MobileThemePreference } from "./preferences";
import {
  getMobileBrandColorKey,
  subscribeMobileBrandColors,
  type MobileResolvedTheme,
} from "./mobile-theme-colors";
export { mobileThemeStylesKey, resolveMobileThemeColor, resolveMobileThemeStyles, type MobileResolvedTheme } from "./mobile-theme-colors";

type MobileThemeContextValue = {
  preference: MobileThemePreference;
  resolvedTheme: MobileResolvedTheme;
  /** Changes with the theme and with the server branding colours; use it to cache resolved styles. */
  themeKey: string;
  setPreference: (preference: MobileThemePreference) => void;
  toggleTheme: () => void;
};

const MobileThemeContext = createContext<MobileThemeContextValue | null>(null);

export const MobileThemeProvider = ({ children }: { children: ReactNode }) => {
  const systemTheme = useColorScheme();
  const [preference, setPreferenceState] = useState<MobileThemePreference>("system");

  useEffect(() => {
    let active = true;
    void readMobileThemePreference().then((storedPreference) => {
      if (active) {
        setPreferenceState(storedPreference);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  // Branding colours live in the colour layer; a change re-renders every themed screen.
  const brandColorKey = useSyncExternalStore(subscribeMobileBrandColors, getMobileBrandColorKey, getMobileBrandColorKey);
  const resolvedTheme: MobileResolvedTheme = preference === "system" ? (systemTheme === "dark" ? "dark" : "light") : preference;
  const value = useMemo<MobileThemeContextValue>(() => ({
    preference,
    resolvedTheme,
    themeKey: brandColorKey ? `${resolvedTheme}|${brandColorKey}` : resolvedTheme,
    setPreference: (nextPreference) => {
      setPreferenceState(nextPreference);
      void writeMobileThemePreference(nextPreference);
    },
    toggleTheme: () => {
      const nextPreference = resolvedTheme === "dark" ? "light" : "dark";
      setPreferenceState(nextPreference);
      void writeMobileThemePreference(nextPreference);
    },
  }), [brandColorKey, preference, resolvedTheme]);

  return <MobileThemeContext.Provider value={value}>{children}</MobileThemeContext.Provider>;
};

export const useMobileTheme = () => {
  const context = useContext(MobileThemeContext);
  if (!context) {
    throw new Error("useMobileTheme must be used within MobileThemeProvider");
  }
  return context;
};
