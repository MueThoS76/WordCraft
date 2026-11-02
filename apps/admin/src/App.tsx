import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { api } from "./api/client";
import { AdminLayout } from "./layout/AdminLayout";
import { AccountPage } from "./pages/AccountPage";
import { MenuPage } from "./pages/MenuPage";
import { SettingsPage } from "./pages/SettingsPage";
import { DashboardPage } from "./pages/DashboardPage";
import { CategoriesPage } from "./pages/CategoriesPage";
import { ContentEditorPage } from "./pages/ContentEditorPage";
import { ContentListPage } from "./pages/ContentListPage";
import { GroupDetailPage } from "./pages/GroupDetailPage";
import { GroupsListPage } from "./pages/GroupsListPage";
import { LoginPage } from "./pages/LoginPage";
import { MediaPage } from "./pages/MediaPage";
import { UsersListPage } from "./pages/UsersListPage";

function ContentListRoute({
  typeId,
  basePath,
  title,
  singular,
  showCategories,
}: {
  typeId: string;
  basePath: string;
  title: string;
  singular: string;
  showCategories?: boolean;
}) {
  const navigate = useNavigate();
  return (
    <ContentListPage
      typeId={typeId}
      title={title}
      singular={singular}
      showCategories={showCategories}
      onOpen={(id) => navigate(`${basePath}/${id}`)}
    />
  );
}

function ContentEditorRoute({ typeId, basePath }: { typeId: string; basePath: string }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  if (!id) {
    return <Navigate to={basePath} replace />;
  }
  return <ContentEditorPage typeId={typeId} id={id} onBack={() => navigate(basePath)} />;
}

function GroupsListRoute() {
  const navigate = useNavigate();
  return <GroupsListPage onOpen={(id) => navigate(`/groups/${id}`)} />;
}

function GroupDetailRoute() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  if (!id) {
    return <Navigate to="/groups" replace />;
  }
  return <GroupDetailPage id={id} onBack={() => navigate("/groups")} />;
}

export function App() {
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    api
      .listContent("page")
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
  }

  return (
    <Routes>
      <Route element={<AdminLayout onLogout={handleLogout} />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route
          path="pages"
          element={
            <ContentListRoute typeId="page" basePath="/pages" title="Seiten" singular="Seite" />
          }
        />
        <Route path="pages/:id" element={<ContentEditorRoute typeId="page" basePath="/pages" />} />
        <Route
          path="posts"
          element={
            <ContentListRoute
              typeId="post"
              basePath="/posts"
              title="Beiträge"
              singular="Beitrag"
              showCategories
            />
          }
        />
        <Route path="posts/:id" element={<ContentEditorRoute typeId="post" basePath="/posts" />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="menu" element={<MenuPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="media" element={<MediaPage />} />
        <Route path="users" element={<UsersListPage />} />
        <Route path="groups" element={<GroupsListRoute />} />
        <Route path="groups/:id" element={<GroupDetailRoute />} />
        <Route path="account" element={<AccountPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}
