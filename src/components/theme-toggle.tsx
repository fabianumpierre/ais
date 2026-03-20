"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

type ThemeMode = "light" | "dark";

function applyTheme(theme: ThemeMode) {
  document.documentElement.setAttribute("data-theme", theme);
  document.documentElement.classList.remove("light", "dark");
  document.documentElement.classList.add(theme);
  document.documentElement.style.colorScheme = theme;
}

function getPreferredTheme(): ThemeMode {
  if (typeof window === "undefined") {
    return "light";
  }

  const storedTheme = window.localStorage.getItem("aldeia-theme");

  if (storedTheme === "light" || storedTheme === "dark") {
    return storedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeMode>(getPreferredTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  function handleToggleTheme() {
    const nextTheme: ThemeMode = theme === "dark" ? "light" : "dark";
    applyTheme(nextTheme);
    window.localStorage.setItem("aldeia-theme", nextTheme);
    setTheme(nextTheme);
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      onClick={handleToggleTheme}
      className="min-w-[150px] justify-center"
      aria-label={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
      title={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
      suppressHydrationWarning
    >
      <span aria-hidden="true" suppressHydrationWarning>
        {theme === "dark" ? "☀" : "☾"}
      </span>
      <span suppressHydrationWarning>{theme === "dark" ? "Modo claro" : "Modo escuro"}</span>
    </Button>
  );
}
