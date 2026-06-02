"use client"

import { cn } from "@/lib/utils"

interface LanguageSwitcherProps {
  currentLang: "ar" | "en"
  onLanguageChange: (lang: "ar" | "en") => void
}

export function LanguageSwitcher({
  currentLang,
  onLanguageChange,
}: LanguageSwitcherProps) {
  return (
    <div className="flex items-center gap-1 p-1 rounded-xl bg-secondary/50 border border-border/50">
      <button
        onClick={() => onLanguageChange("ar")}
        className={cn(
          "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
          currentLang === "ar"
            ? "bg-card text-card-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
        aria-label="Arabic language"
      >
        العربية
      </button>
      <button
        onClick={() => onLanguageChange("en")}
        className={cn(
          "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
          currentLang === "en"
            ? "bg-card text-card-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
        aria-label="English language"
      >
        English
      </button>
    </div>
  )
}
