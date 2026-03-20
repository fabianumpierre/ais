import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aldeia Insight Scheduler",
  description: "Ferramenta interna para gerar pautas semanais com insights e metricas.",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const themeScript = `
    (() => {
      const applyTheme = (theme) => {
        document.documentElement.setAttribute("data-theme", theme);
        document.documentElement.classList.remove("light", "dark");
        document.documentElement.classList.add(theme);
        document.documentElement.style.colorScheme = theme;
      };

      try {
        const storedTheme = window.localStorage.getItem("aldeia-theme");
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        const theme = storedTheme === "dark" || storedTheme === "light"
          ? storedTheme
          : prefersDark
            ? "dark"
            : "light";
        applyTheme(theme);
      } catch (error) {
        applyTheme("light");
      }
    })();
  `;

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="bg-background text-foreground antialiased">{children}</body>
    </html>
  );
}
