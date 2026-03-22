"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import clsx from "clsx";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  LayoutDashboard,
  Menu,
  MessageCircle,
  Moon,
  Sparkles,
  Sun,
  X,
} from "lucide-react";

const THEME_KEY = "skale-cursor-desk-theme";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  external?: boolean;
};

const PRIMARY_NAV: NavItem[] = [
  { href: "/skale", label: "Tableau", icon: LayoutDashboard },
  { href: "/skale/chat", label: "Agent & fichiers", icon: MessageCircle },
  { href: "/skale/guide", label: "Guide Cursor", icon: BookOpen },
];

const SECONDARY_NAV: NavItem[] = [
  { href: "/", label: "Démos du projet", icon: Sparkles },
  {
    href: "https://cursor.com/docs",
    label: "Docs Cursor",
    icon: ExternalLink,
    external: true,
  },
];

export default function SkaleShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    try {
      const s = localStorage.getItem(THEME_KEY);
      if (s === "light" || s === "dark") setTheme(s);
    } catch {
      /* ignore */
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((t) => {
      const next = t === "dark" ? "light" : "dark";
      try {
        localStorage.setItem(THEME_KEY, next);
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const pageTitle = (() => {
    if (pathname === "/skale") return "Tableau";
    if (pathname === "/skale/chat") return "Agent & fichiers";
    if (pathname === "/skale/guide") return "Guide Cursor";
    return "Desk";
  })();

  return (
    <div className="skale-app h-[100dvh]" data-theme={theme}>
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          aria-label="Fermer le menu"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div className="skale-shell">
        <aside
          className={clsx(
            "skale-sidebar",
            collapsed && "skale-sidebar-collapsed",
            mobileOpen && "skale-sidebar-open",
          )}
        >
          <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-3 py-3">
            <div className="min-w-0 flex-1 px-1">
              <div className="flex items-center gap-2">
                <span className="text-xl" aria-hidden>
                  🦎
                </span>
                <div className="skale-brand-sub min-w-0">
                  <p className="truncate text-sm font-bold text-[var(--text-primary)]">
                    Desk Cursor
                  </p>
                  <p className="truncate text-[10px] text-[var(--text-muted)]">
                    UI type agent local
                  </p>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setCollapsed((c) => !c)}
              className="hidden rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-hover)] md:block"
              aria-label={collapsed ? "Étendre le menu" : "Réduire le menu"}
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-hover)] md:hidden"
              aria-label="Fermer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
            <p className="skale-section-label px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Espace Cursor
            </p>
            {PRIMARY_NAV.map((item) => {
              const active =
                item.href === "/skale"
                  ? pathname === "/skale"
                  : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    "skale-nav-item flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-[var(--accent-muted)] text-[var(--accent)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]",
                  )}
                >
                  <Icon className="h-[18px] w-[18px] shrink-0 opacity-90" />
                  <span className="skale-nav-label truncate">{item.label}</span>
                </Link>
              );
            })}

            <p className="skale-section-label px-2 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Liens
            </p>
            {SECONDARY_NAV.map((item) => {
              const Icon = item.icon;
              const inner = (
                <>
                  <Icon className="h-[18px] w-[18px] shrink-0 opacity-90" />
                  <span className="skale-nav-label truncate">{item.label}</span>
                </>
              );
              if (item.external) {
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="skale-nav-item flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                  >
                    {inner}
                  </a>
                );
              }
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="skale-nav-item flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                >
                  {inner}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-[var(--border)] p-2">
            <button
              type="button"
              onClick={toggleTheme}
              className="skale-nav-item flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
            >
              {theme === "dark" ? (
                <Sun className="h-[18px] w-[18px] shrink-0" />
              ) : (
                <Moon className="h-[18px] w-[18px] shrink-0" />
              )}
              <span className="skale-nav-label">
                {theme === "dark" ? "Mode clair" : "Mode sombre"}
              </span>
            </button>
          </div>
        </aside>

        <div className="skale-main">
          <header className="skale-topbar">
            <button
              type="button"
              className="rounded-lg p-2 text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] md:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Ouvrir le menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-sm font-semibold text-[var(--text-primary)]">
              {pageTitle}
            </h1>
            <span className="ml-auto text-[10px] text-[var(--text-muted)]">
              Raccourcis : ⌘L chat · ⌘I composer
            </span>
          </header>

          <div className="skale-main-scroll">{children}</div>
        </div>
      </div>
    </div>
  );
}
