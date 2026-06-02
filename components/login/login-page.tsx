"use client"

import { useState } from "react"
import { Eye, EyeOff, Mail, Lock, MessageSquare, KeyRound } from "lucide-react"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"
import { ThemeSwitcher } from "@/components/login/theme-switcher"
import { LanguageSwitcher } from "@/components/login/language-switcher"
import { ColorThemeSwitcher } from "@/components/login/color-theme-switcher"

interface LoginPageProps {
  lang?: "ar" | "en"
}

const translations = {
  ar: {
    systemTitle: "نظام الإدارة المالية",
    systemSubtitle: "Financial Management System",
    description: "منصة Diwan Finance للإدارة المالية المتكاملة بكفاءة وشفافية.",
    copyright: "© 2026–2027 All Rights Reserved",
    developer: "Developed by Maher Mohamad Taha",
    welcome: "مرحباً بك",
    loginSubtitle: "سجل الدخول للوصول إلى النظام",
    emailOrPhone: "البريد الإلكتروني أو رقم الهاتف",
    emailPlaceholder: "أدخل البريد الإلكتروني أو رقم الهاتف",
    password: "كلمة المرور",
    passwordPlaceholder: "أدخل كلمة المرور",
    rememberMe: "تذكرني",
    login: "تسجيل الدخول",
    contactAdmin: "تواصل مع الـ Admin",
    changePassword: "تغيير كلمة المرور",
    colorTheme: "نمط الألوان",
  },
  en: {
    systemTitle: "Financial Management System",
    systemSubtitle: "نظام الإدارة المالية",
    description: "Diwan Finance platform for integrated financial management with efficiency and transparency.",
    copyright: "© 2026–2027 All Rights Reserved",
    developer: "Developed by Maher Mohamad Taha",
    welcome: "Welcome",
    loginSubtitle: "Sign in to access the system",
    emailOrPhone: "Email or Phone Number",
    emailPlaceholder: "Enter email or phone number",
    password: "Password",
    passwordPlaceholder: "Enter password",
    rememberMe: "Remember me",
    login: "Sign In",
    contactAdmin: "Contact Admin",
    changePassword: "Change Password",
    colorTheme: "Color Theme",
  },
}

export function LoginPage({ lang = "ar" }: LoginPageProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(false)
  const [currentLang, setCurrentLang] = useState<"ar" | "en">(lang)
  const [colorTheme, setColorTheme] = useState("executive-corporate")
  const { theme } = useTheme()

  const t = translations[currentLang]
  const isRTL = currentLang === "ar"

  const handleLanguageChange = (newLang: "ar" | "en") => {
    setCurrentLang(newLang)
    document.documentElement.lang = newLang
    document.documentElement.dir = newLang === "ar" ? "rtl" : "ltr"
  }

  const handleColorThemeChange = (newTheme: string) => {
    setColorTheme(newTheme)
    if (newTheme === "executive-corporate") {
      document.documentElement.removeAttribute("data-theme")
    } else {
      document.documentElement.setAttribute("data-theme", newTheme)
    }
  }

  return (
    <div
      className={cn(
        "min-h-screen flex flex-col lg:flex-row",
        isRTL ? "font-sans" : "font-sans"
      )}
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* Left Section - Information Panel */}
      <div className="relative flex-1 flex flex-col justify-between p-8 lg:p-12 overflow-hidden">
        {/* Subtle Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-secondary/20" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-glow/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        
        {/* Top Controls */}
        <div className="relative z-10 flex items-center justify-between gap-4 flex-wrap">
          <LanguageSwitcher
            currentLang={currentLang}
            onLanguageChange={handleLanguageChange}
          />
          <div className="flex items-center gap-3">
            <ColorThemeSwitcher
              currentTheme={colorTheme}
              onThemeChange={handleColorThemeChange}
              label={t.colorTheme}
            />
            <ThemeSwitcher />
          </div>
        </div>

        {/* Main Content */}
        <div className="relative z-10 flex-1 flex flex-col justify-center py-12 lg:py-0">
          <div className="space-y-6">
            {/* Title with Glow Effect */}
            <div className="space-y-2">
              <h1 className="text-4xl lg:text-5xl xl:text-6xl font-bold tracking-tight">
                <span className="glow-text glow-underline">
                  {currentLang === "ar" ? "نظام الإدارة المالية" : "Financial Management System"}
                </span>
              </h1>
              <p className="text-xl lg:text-2xl text-muted-foreground font-medium mt-6">
                {currentLang === "ar" ? "Financial Management System" : "نظام الإدارة المالية"}
              </p>
            </div>

            {/* Description */}
            <p className="text-lg text-muted-foreground max-w-md leading-relaxed">
              {t.description}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 space-y-3">
          <p className="text-sm text-muted-foreground">{t.copyright}</p>
          <p className="text-xs text-muted-foreground/70">{t.developer}</p>
        </div>
      </div>

      {/* Right Section - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-secondary/30">
        <div className="w-full max-w-md">
          {/* Login Card */}
          <div className="relative bg-card/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-border/50 overflow-hidden animated-border-glow">
            <div className="p-8 lg:p-10">
              {/* Card Header */}
              <div className="text-center space-y-2 mb-8">
                <h2 className="text-3xl font-bold text-card-foreground">
                  {t.welcome}
                </h2>
                <p className="text-muted-foreground">
                  {t.loginSubtitle}
                </p>
              </div>

              {/* Login Form */}
              <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
                {/* Email/Phone Field */}
                <div className="space-y-2">
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-card-foreground"
                  >
                    {t.emailOrPhone}
                  </label>
                  <div className="relative">
                    <input
                      id="email"
                      type="text"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t.emailPlaceholder}
                      className={cn(
                        "w-full px-4 py-3 rounded-xl bg-input/50 border border-border",
                        "text-card-foreground placeholder:text-muted-foreground",
                        "focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent",
                        "transition-all duration-200",
                        isRTL ? "pr-12" : "pl-12"
                      )}
                      dir={isRTL ? "rtl" : "ltr"}
                    />
                    <Mail
                      className={cn(
                        "absolute top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground",
                        isRTL ? "right-4" : "left-4"
                      )}
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-card-foreground"
                  >
                    {t.password}
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t.passwordPlaceholder}
                      className={cn(
                        "w-full px-4 py-3 rounded-xl bg-input/50 border border-border",
                        "text-card-foreground placeholder:text-muted-foreground",
                        "focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent",
                        "transition-all duration-200",
                        isRTL ? "pr-12 pl-12" : "pl-12 pr-12"
                      )}
                      dir={isRTL ? "rtl" : "ltr"}
                    />
                    <Lock
                      className={cn(
                        "absolute top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground",
                        isRTL ? "right-4" : "left-4"
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className={cn(
                        "absolute top-1/2 -translate-y-1/2 p-1 rounded-md",
                        "text-muted-foreground hover:text-card-foreground",
                        "transition-colors duration-200",
                        isRTL ? "left-3" : "right-3"
                      )}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Remember Me */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setRememberMe(!rememberMe)}
                    className={cn(
                      "w-5 h-5 rounded-md border-2 transition-all duration-200 flex items-center justify-center",
                      rememberMe
                        ? "bg-primary border-primary"
                        : "border-border bg-transparent hover:border-primary/50"
                    )}
                    aria-checked={rememberMe}
                    role="checkbox"
                  >
                    {rememberMe && (
                      <svg
                        className="w-3 h-3 text-primary-foreground"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </button>
                  <label
                    onClick={() => setRememberMe(!rememberMe)}
                    className="text-sm text-muted-foreground cursor-pointer select-none"
                  >
                    {t.rememberMe}
                  </label>
                </div>

                {/* Primary Button - Login */}
                <button
                  type="submit"
                  className={cn(
                    "w-full py-3.5 px-6 rounded-xl font-semibold",
                    "bg-primary text-primary-foreground",
                    "hover:opacity-90 active:scale-[0.98]",
                    "transition-all duration-200",
                    "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-card"
                  )}
                >
                  {t.login}
                </button>

                {/* Secondary Buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    className={cn(
                      "py-3 px-4 rounded-xl text-sm font-medium",
                      "bg-secondary text-secondary-foreground",
                      "hover:bg-secondary/80 active:scale-[0.98]",
                      "transition-all duration-200",
                      "border border-border/50",
                      "flex items-center justify-center gap-2"
                    )}
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span className="truncate">{t.contactAdmin}</span>
                  </button>
                  <button
                    type="button"
                    className={cn(
                      "py-3 px-4 rounded-xl text-sm font-medium",
                      "bg-secondary text-secondary-foreground",
                      "hover:bg-secondary/80 active:scale-[0.98]",
                      "transition-all duration-200",
                      "border border-border/50",
                      "flex items-center justify-center gap-2"
                    )}
                  >
                    <KeyRound className="h-4 w-4" />
                    <span className="truncate">{t.changePassword}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
