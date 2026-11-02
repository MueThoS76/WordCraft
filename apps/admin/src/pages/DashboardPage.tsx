import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { DashboardData } from "../api/types";

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatUptime(seconds: number): string {
  if (seconds < 3600) {
    return `${Math.max(1, Math.round(seconds / 60))} Min.`;
  }
  if (seconds < 86400) {
    return `${(seconds / 3600).toFixed(1)} Std.`;
  }
  return `${(seconds / 86400).toFixed(1)} Tage`;
}

function StatCard({
  to,
  label,
  value,
  hint,
}: {
  to: string;
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <Link
      to={to}
      className="block rounded-lg border border-slate-200 bg-white p-4 no-underline hover:border-indigo-400"
    >
      <div className="text-sm text-slate-500">{label}</div>
      <div className="text-3xl font-semibold text-slate-900">{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
    </Link>
  );
}

const TYPE_ROUTES: Record<string, string> = { page: "/pages", post: "/posts" };

export function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .dashboard()
      .then(setData)
      .catch((reason) =>
        setError(
          reason instanceof Error ? reason.message : "Dashboard konnte nicht geladen werden.",
        ),
      );
  }, []);

  if (error) {
    return <p className="p-6 text-red-700">{error}</p>;
  }
  if (!data) {
    return <p className="p-6">Lädt …</p>;
  }

  const pages = data.content?.byType.page ?? { published: 0, draft: 0 };
  const posts = data.content?.byType.post ?? { published: 0, draft: 0 };

  return (
    <div className="p-6">
      <h1>Dashboard</h1>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {data.content && (
          <>
            <StatCard
              to="/pages"
              label="Seiten"
              value={pages.published + pages.draft}
              hint={`${pages.published} veröffentlicht · ${pages.draft} Entwurf`}
            />
            <StatCard
              to="/posts"
              label="Beiträge"
              value={posts.published + posts.draft}
              hint={`${posts.published} veröffentlicht · ${posts.draft} Entwurf`}
            />
            <StatCard to="/categories" label="Kategorien" value={data.content.categories} />
          </>
        )}
        {data.media && (
          <StatCard
            to="/media"
            label="Medien"
            value={data.media.count}
            hint={formatBytes(data.media.totalBytes)}
          />
        )}
        {data.users && (
          <StatCard
            to="/users"
            label="Benutzer"
            value={data.users.users}
            hint={`${data.users.groups} Gruppen`}
          />
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {data.content && (
          <section className="rounded-lg border border-slate-200 bg-white p-4 lg:col-span-2">
            <h2 className="mt-0 text-base font-semibold">Zuletzt bearbeitet</h2>
            {data.content.recent.length === 0 ? (
              <p className="m-0 text-sm text-slate-600">Noch keine Inhalte.</p>
            ) : (
              <ul className="m-0 list-none divide-y divide-slate-100 p-0">
                {data.content.recent.map((item) => {
                  const base = TYPE_ROUTES[item.contentTypeId];
                  return (
                    <li key={item.id} className="flex items-center justify-between gap-3 py-2">
                      <div className="min-w-0">
                        {base ? (
                          <Link to={`${base}/${item.id}`} className="truncate font-medium">
                            {item.title}
                          </Link>
                        ) : (
                          <span className="truncate font-medium">{item.title}</span>
                        )}
                        <div className="text-xs text-slate-500">
                          {item.contentTypeId === "post" ? "Beitrag" : "Seite"} ·{" "}
                          {new Date(item.updatedAt).toLocaleString("de-DE", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </div>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${
                          item.status === "published"
                            ? "bg-green-100 text-green-800"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {item.status === "published" ? "Veröffentlicht" : "Entwurf"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}

        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mt-0 text-base font-semibold">System</h2>
          <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-slate-500">Version</dt>
            <dd className="m-0">{data.system.version}</dd>
            <dt className="text-slate-500">Datenbank</dt>
            <dd className="m-0">
              {data.system.database.ok ? "erreichbar" : "nicht erreichbar"} (
              {data.system.database.latencyMs} ms)
            </dd>
            <dt className="text-slate-500">Laufzeit</dt>
            <dd className="m-0">{formatUptime(data.system.uptimeSeconds)}</dd>
            <dt className="text-slate-500">Node.js</dt>
            <dd className="m-0">{data.system.nodeVersion}</dd>
            <dt className="text-slate-500">Updates</dt>
            <dd className="m-0 text-slate-500">Prüfung noch nicht eingerichtet</dd>
          </dl>
        </section>
      </div>
    </div>
  );
}
