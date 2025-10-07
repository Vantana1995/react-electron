/**
 * Theme Toggle Button Component
 * Allows users to switch between light and dark themes
 */

import { useTheme } from "../../contexts/ThemeContext";
import { useLanguage } from "../../contexts/LanguageContext";
import "./ThemeToggle.css";

export const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();
  const { t } = useLanguage();

  return (
    <button
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={`Switch to ${
        theme === "light" ? t("theme.dark") : t("theme.light")
      } theme`}
      title={`Current theme: ${theme}. Click to switch.`}
    >
      <span className="theme-icon">
        {theme === "light" ? t("theme.dark") : t("theme.light")}
      </span>
    </button>
  );
};
