import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { api } from "./api/client";
import { AdminLayout } from "./layout/AdminLayout";
import { AccountPage } from "./pages/AccountPage";
import { GroupDetailPage } from "./pages/GroupDetailPage";
import { GroupsListPage } from "./pages/GroupsListPage";
import { LoginPage } from "./pages/LoginPage";
import { PageEditorPage } from "./pages/PageEditorPage";
import { PagesListPage } from "./pages/PagesListPage";
import { UsersListPage } from "./pages/UsersListPage";

function PagesListRoute() {
  const navigate = useNavigate();
  return <PagesListPage onOpen={(id) => navigate(`/pages/${id}`)} />;
}

function PageEditorRoute() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  if (!id) {
    return <Navigate to="/pages" replace />;
  }
  return <PageEditorPage id={id} onBack={() => navigate("/pages")} />;
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
  }

  return (
    <Routes>
      <Route element={<AdminLayout onLogout={handleLogout} />}>
        <Route index element={<Navigate to="/pages" replace />} />
        <Route path="pages" element={<PagesListRoute />} />
        <Route path="pages/:id" element={<PageEditorRoute />} />
        <Route path="users" element={<UsersListPage />} />
        <Route path="groups" element={<GroupsListRoute />} />
        <Route path="groups/:id" element={<GroupDetailRoute />} />
        <Route path="account" element={<AccountPage />} />
        <Route path="*" element={<Navigate to="/pages" replace />} />
      </Route>
    </Routes>
  );
}
