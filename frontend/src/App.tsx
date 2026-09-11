import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { CallProvider } from "./context/CallContext";
import { CallOverlay } from "./components/CallOverlay";
import { BottomNav } from "./components/BottomNav";
import { Splash } from "./pages/Splash";
import { Login } from "./pages/Login";
import { Signup } from "./pages/Signup";
import { Home } from "./pages/Home";
import { Contacts } from "./pages/Contacts";
import { CallHistory } from "./pages/CallHistory";
import { Settings } from "./pages/Settings";

function RequireAuth({ children }: { children: JSX.Element }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

function AppShell({ children }: { children: JSX.Element }) {
  return (
    <div className="relative h-full">
      <div className="h-full overflow-hidden">{children}</div>
      <BottomNav />
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Splash />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route
        path="/home"
        element={
          <RequireAuth>
            <AppShell>
              <Home />
            </AppShell>
          </RequireAuth>
        }
      />
      <Route
        path="/calls"
        element={
          <RequireAuth>
            <AppShell>
              <CallHistory />
            </AppShell>
          </RequireAuth>
        }
      />
      <Route
        path="/contacts"
        element={
          <RequireAuth>
            <AppShell>
              <Contacts />
            </AppShell>
          </RequireAuth>
        }
      />
      <Route
        path="/settings"
        element={
          <RequireAuth>
            <AppShell>
              <Settings />
            </AppShell>
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CallProvider>
        <div className="mx-auto h-[100dvh] max-w-md bg-base">
          <AppRoutes />
          <CallOverlay />
        </div>
      </CallProvider>
    </AuthProvider>
  );
}
