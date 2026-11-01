import { useEffect, useState } from "react";
import { api } from "./api/client";
import { AccountPage } from "./pages/AccountPage";
import { GroupDetailPage } from "./pages/GroupDetailPage";
import { GroupsListPage } from "./pages/GroupsListPage";
import { LoginPage } from "./pages/LoginPage";
import { PageEditorPage } from "./pages/PageEditorPage";
import { PagesListPage } from "./pages/PagesListPage";
import { UsersListPage } from "./pages/UsersListPage";

type View =
  | { name: "list" }
  | { name: "editor"; id: string }
  | { name: "users" }
  | { name: "groups" }
  | { name: "group-detail"; id: string }
  | { name: "account" };

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

  function renderView() {
    switch (view.name) {
      case "editor":
        return <PageEditorPage id={view.id} onBack={() => setView({ name: "list" })} />;
      case "users":
        return <UsersListPage />;
      case "groups":
        return <GroupsListPage onOpen={(id) => setView({ name: "group-detail", id })} />;
      case "group-detail":
        return <GroupDetailPage id={view.id} onBack={() => setView({ name: "groups" })} />;
      case "account":
        return <AccountPage />;
      default:
        return <PagesListPage onOpen={(id) => setView({ name: "editor", id })} />;
    }
  }

  return (
    <>
      <nav className="top-nav">
        <button type="button" onClick={() => setView({ name: "list" })}>
          Seiten
        </button>
        <button type="button" onClick={() => setView({ name: "users" })}>
          Benutzer
        </button>
        <button type="button" onClick={() => setView({ name: "groups" })}>
          Gruppen
        </button>
        <button type="button" onClick={() => setView({ name: "account" })}>
          Mein Account
        </button>
        <button type="button" onClick={handleLogout} className="logout-button">
          Abmelden
        </button>
      </nav>
      {renderView()}
    </>
  );
}
