"use client"

import { useState } from "react"
import { Palette, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface ColorThemeSwitcherProps {
  currentTheme: string
  onThemeChange: (theme: string) => void
  label: string
}

const colorThemes = [
  {
    id: "executive-corporate",
    name: "Executive Corporate",
    nameAr: "كوربوريت تنفيذي",
    colors: ["#0a0d14", "#c9a227", "#1a1f2e"],
  },
  {
    id: "banking-luxury",
    name: "Banking Luxury",
    nameAr: "فخامة بنكية",
    colors: ["#0a1410", "#2e8b57", "#1a2a24"],
  },
  {
    id: "modern-fintech",
    name: "Modern Fintech",
    nameAr: "فينتك حديث",
    colors: ["#080c14", "#00b4d8", "#101828"],
  },
  {
    id: "professional-government",
    name: "Professional Government",
    nameAr: "حكومي احترافي",
    colors: ["#0d1117", "#4a90d9", "#161b22"],
  },
  {
    id: "premium-saas",
    name: "Premium SaaS",
    nameAr: "SaaS متميز",
    colors: ["#100a14", "#e8576e", "#1a1424"],
  },
  {
    id: "executive-dark",
    name: "Executive Dark",
    nameAr: "داكن تنفيذي",
    colors: ["#0a0a0a", "#d4d4d4", "#141414"],
  },
]

export function ColorThemeSwitcher({
  currentTheme,
  onThemeChange,
  label,
}: ColorThemeSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false)

  const currentThemeData = colorThemes.find((t) => t.id === currentTheme) || colorThemes[0]

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium",
          "bg-secondary/50 border border-border/50",
          "text-muted-foreground hover:text-foreground",
          "transition-all duration-200"
        )}
        aria-label={label}
        aria-expanded={isOpen}
      >
        <Palette className="h-4 w-4" />
        <div className="flex items-center gap-1">
          {currentThemeData.colors.map((color, i) => (
            <div
              key={i}
              className="w-3 h-3 rounded-full border border-border/30"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full mt-2 right-0 z-50 w-64 p-2 rounded-xl bg-card border border-border shadow-xl">
            <div className="space-y-1">
              {colorThemes.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => {
                    onThemeChange(theme.id)
                    setIsOpen(false)
                  }}
                  className={cn(
                    "w-full flex items-center justify-between p-3 rounded-lg text-sm",
                    "transition-all duration-200",
                    currentTheme === theme.id
                      ? "bg-primary/10 text-card-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-card-foreground"
                  )}
                >
                  <span className="font-medium">{theme.nameAr}</span>
                  <div className="flex items-center gap-1">
                    {theme.colors.map((color, i) => (
                      <div
                        key={i}
                        className="w-4 h-4 rounded-full border border-border/30"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
