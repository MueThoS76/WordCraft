import { useEffect, useState } from "react";
import { api } from "./api/client";
import { LoginPage } from "./pages/LoginPage";
import { PageEditorPage } from "./pages/PageEditorPage";
import { PagesListPage } from "./pages/PagesListPage";

type View = { name: "list" } | { name: "editor"; id: string };

export function App() {
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [view, setView] = useState<View>({ name: "list" });

  useEffect(() => {
    api
      .listPages()
      .then(() => setIsAuthenticated(true))
      .catch(() => setIsAuthenticated(false))
      .finally(() => setAuthChecked(true));
  }, []);

  if (!authChecked) {
    return <p>Lädt …</p>;
  }

  if (!isAuthenticated) {
    return <LoginPage onLoggedIn={() => setIsAuthenticated(true)} />;
  }

  async function handleLogout() {
    await api.logout();
    setIsAuthenticated(false);
    setView({ name: "list" });
  }

  if (view.name === "editor") {
    return (
      <PageEditorPage
        id={view.id}
        onBack={() => setView({ name: "list" })}
        onLogout={handleLogout}
      />
    );
  }

  return <PagesListPage onOpen={(id) => setView({ name: "editor", id })} onLogout={handleLogout} />;
}
