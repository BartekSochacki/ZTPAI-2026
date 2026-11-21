import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';
import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import SchedulePage from './pages/SchedulePage.jsx';
import MyEnrollmentsPage from './pages/MyEnrollmentsPage.jsx';
import MyMembershipPage from './pages/MyMembershipPage.jsx';
import TrainerSessionsPage from './pages/TrainerSessionsPage.jsx';
import SimpleCrudPage from './pages/SimpleCrudPage.jsx';
import UsersPage from './pages/UsersPage.jsx';
import MembershipsPage from './pages/MembershipsPage.jsx';

const roomFields = [
  { name: 'name', label: 'Nazwa', type: 'text', required: true },
  { name: 'capacity', label: 'Pojemność', type: 'number', required: true, min: 1 }
];

const classTypeFields = [
  { name: 'name', label: 'Nazwa', type: 'text', required: true },
  { name: 'description', label: 'Opis', type: 'textarea' }
];

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="center">Ładowanie...</div>;
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/register" element={user ? <Navigate to="/" replace /> : <RegisterPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<SchedulePage />} />
          <Route element={<ProtectedRoute roles={['MEMBER']} />}>
            <Route path="/my-enrollments" element={<MyEnrollmentsPage />} />
            <Route path="/my-membership" element={<MyMembershipPage />} />
          </Route>
          <Route element={<ProtectedRoute roles={['TRAINER']} />}>
            <Route path="/my-sessions" element={<TrainerSessionsPage />} />
          </Route>
          <Route element={<ProtectedRoute roles={['ADMIN']} />}>
            <Route
              path="/admin/rooms"
              element={<SimpleCrudPage key="rooms" title="Sale" resource="/rooms" fields={roomFields} />}
            />
            <Route
              path="/admin/class-types"
              element={<SimpleCrudPage key="types" title="Typy zajęć" resource="/class-types" fields={classTypeFields} />}
            />
            <Route path="/admin/users" element={<UsersPage />} />
            <Route path="/admin/memberships" element={<MembershipsPage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
