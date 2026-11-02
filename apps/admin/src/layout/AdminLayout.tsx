import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { navigation } from "./navigation";

const COLLAPSED_KEY = "presscraft.sidebar.collapsed";

function readCollapsed(): boolean {
  try {
    return window.localStorage.getItem(COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

export function AdminLayout({ onLogout }: { onLogout: () => void }) {
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try {
      window.localStorage.setItem(COLLAPSED_KEY, collapsed ? "1" : "0");
    } catch {
      // Speicher nicht verfügbar — Zustand bleibt nur für diese Sitzung.
    }
  }, [collapsed]);

  const sidebarWidth = collapsed ? "md:w-16" : "md:w-60";

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      {/* Mobile: Kopfzeile mit Menü-Button */}
      <header className="fixed inset-x-0 top-0 z-20 flex h-12 items-center gap-3 border-b border-slate-200 bg-white px-3 md:hidden">
        <button
          type="button"
          aria-label="Menü öffnen"
          className="rounded border border-slate-300 px-2 py-1 text-sm"
          onClick={() => setMobileOpen(true)}
        >
          ☰
        </button>
        <span className="font-semibold">PressCraft</span>
      </header>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/40 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        aria-label="Hauptnavigation"
        className={`fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-slate-800 bg-slate-900 text-slate-200 transition-transform md:sticky md:top-0 md:h-screen md:translate-x-0 md:transition-[width] ${sidebarWidth} ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-12 shrink-0 items-center justify-between px-4">
          {!collapsed && <span className="text-base font-semibold text-white">PressCraft</span>}
          <button
            type="button"
            aria-label={collapsed ? "Menü ausklappen" : "Menü einklappen"}
            className="hidden rounded border border-slate-600 bg-transparent px-2 py-0.5 text-xs text-slate-300 hover:bg-slate-800 md:block"
            onClick={() => setCollapsed((value) => !value)}
          >
            {collapsed ? "»" : "«"}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 pb-4">
          {navigation.map((section) => (
            <div key={section.key} className="mt-4 first:mt-2">
              {!collapsed && (
                <h2 className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {section.label}
                </h2>
              )}
              <ul className="space-y-0.5">
                {section.items.map((item) => (
                  <li key={item.key}>
                    <NavLink
                      to={item.to}
                      title={collapsed ? item.label : undefined}
                      onClick={() => setMobileOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded px-2 py-2 text-sm no-underline ${
                          isActive
                            ? "bg-indigo-600 text-white"
                            : "text-slate-300 hover:bg-slate-800 hover:text-white"
                        } ${collapsed ? "justify-center" : ""}`
                      }
                    >
                      <span aria-hidden="true">{item.icon}</span>
                      {!collapsed && <span>{item.label}</span>}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="shrink-0 border-t border-slate-800 p-2">
          <button
            type="button"
            onClick={onLogout}
            title={collapsed ? "Abmelden" : undefined}
            className={`flex w-full items-center gap-3 rounded border-0 bg-transparent px-2 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white ${
              collapsed ? "justify-center" : ""
            }`}
          >
            <span aria-hidden="true">🚪</span>
            {!collapsed && <span>Abmelden</span>}
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1 pt-12 md:pt-0">
        <Outlet />
      </div>
    </div>
  );
}
