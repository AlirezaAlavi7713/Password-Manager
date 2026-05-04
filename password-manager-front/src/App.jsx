import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/auth-context.js";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Vault from "./pages/Vault.jsx";
import Profile from "./pages/Profile.jsx";
import NotFound from "./pages/NotFound.jsx";
import LockScreen from "./components/LockScreen.jsx";

function ProtectedRoute({ children }) {
  const { user, encKeyRaw, locked } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!encKeyRaw && !locked) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const { locked } = useAuth();

  return (
    <>
      <Routes>
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Vault />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>

      {/* LockScreen s'affiche par-dessus tout quand le coffre est verrouillé */}
      {locked && <LockScreen />}
    </>
  );
}
