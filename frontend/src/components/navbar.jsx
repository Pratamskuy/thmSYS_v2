import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

function Navbar() {
  const { user, logout, isAdmin, isPeminjam } = useAuth();
  const { totalQuantity } = useCart();
  const navigate = useNavigate();
  const displayName = user?.full_name || user?.name || 'User';
  const email = user?.email || '-';

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
          {isPeminjam() && (
            <li>
              <Link to="/cart" className="navbar-link">
                Cart
                <span className="cart-badge">{totalQuantity}</span>
              </Link>
            </li>
          )}
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
            <div className="navbar-user-container" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem',  }}>
              <div className="account-chip">
                <span className="account-name">{displayName}</span>
                <div className="account-tooltip">
                  <strong>{displayName}</strong>
                  <span>{email}</span>
                </div>
              </div>
              <button onClick={handleLogout} className="btn btn-sm btn-danger">
                Logout
              </button>
            </div>
          </li>
        </ul>
      </div>
    </nav>
  );
}

export default Navbar;
