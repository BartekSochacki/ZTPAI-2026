import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import { ROLE_LABELS } from '../format.js';

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">Fitness Club</div>
        <nav>
          <NavLink to="/" end>
            Grafik
          </NavLink>
          {user.role === 'MEMBER' && <NavLink to="/my-enrollments">Moje zajęcia</NavLink>}
          {user.role === 'TRAINER' && <NavLink to="/my-sessions">Moje prowadzone zajęcia</NavLink>}
          {user.role === 'ADMIN' && (
            <>
              <NavLink to="/admin/rooms">Sale</NavLink>
              <NavLink to="/admin/class-types">Typy zajęć</NavLink>
              <NavLink to="/admin/users">Użytkownicy</NavLink>
              <NavLink to="/admin/memberships">Karnety</NavLink>
            </>
          )}
        </nav>
        <div className="user-box">
          <span>
            {user.firstName} {user.lastName} <small>({ROLE_LABELS[user.role]})</small>
          </span>
          <button className="secondary" onClick={logout}>
            Wyloguj
          </button>
        </div>
      </header>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
