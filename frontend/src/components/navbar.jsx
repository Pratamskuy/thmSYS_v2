import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <nav className="navbar no-print">
      <div className="navbar-content">
        <Link to="/dashboard" className="navbar-brand">
          THMs
        </Link>
        
        <ul className="navbar-menu">
          <li>
            <Link to="/dashboard" className="navbar-link">
              Dashboard
            </Link>
          </li>
          <li>
            <Link to="/items" className="navbar-link">
              Items
            </Link>
          </li>
          <li>
            <Link to="/borrows" className="navbar-link">
              Borrows
            </Link>
          </li>
          {isAdmin() && (
            <>
              <li>
                <Link to="/categories" className="navbar-link">
                  Categories
                </Link>
              </li>
              <li>
                <Link to="/users" className="navbar-link">
                  Users
                </Link>
              </li>
            </>
          )}
          <li>
            <span className="navbar-link" style={{ color: 'var(--text-secondary)' }}>
              {user.name}
            </span>
          </li>
          <li>
            <button onClick={handleLogout} className="btn btn-sm btn-danger">
              Logout
            </button>
          </li>
        </ul>
      </div>
    </nav>
  );
}

export default Navbar;