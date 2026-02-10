import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { itemAPI, borrowAPI, userAPI } from '../services/api';

function Dashboard() {
  const { user, isAdmin, isPetugas, isAdminOrPetugas } = useAuth();
  const [stats, setStats] = useState({
    totalItems: 0,
    availableItems: 0,
    pendingBorrows: 0,
    activeBorrows: 0,
    myBorrows: 0,
    totalUsers: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentBorrows, setRecentBorrows] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [itemsRes, availableRes] = await Promise.all([
        itemAPI.getAll(),
        itemAPI.getAvailable(),
      ]);

      let borrowData = { data: [] };
      let myBorrowsData = { data: [] };
      let usersData = { data: [] };

      if (isAdminOrPetugas()) {
        const [pendingRes, activeRes, allBorrowsRes] = await Promise.all([
          borrowAPI.getPending(),
          borrowAPI.getActive(),
          borrowAPI.getAll(),
        ]);
        
        borrowData = allBorrowsRes;
        setStats(prev => ({
          ...prev,
          pendingBorrows: pendingRes.data?.length || 0,
          activeBorrows: activeRes.data?.length || 0,
        }));
        
        setRecentBorrows(borrowData.data?.slice(0, 5) || []);
      } else {
        myBorrowsData = await borrowAPI.getMy();
        setRecentBorrows(myBorrowsData.data?.slice(0, 5) || []);
      }

      if (isAdmin()) {
        usersData = await userAPI.getAll();
      }

      setStats(prev => ({
        ...prev,
        totalItems: itemsRes.data?.length || 0,
        availableItems: availableRes.data?.length || 0,
        myBorrows: myBorrowsData.data?.length || 0,
        totalUsers: usersData.data?.length || 0,
      }));
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="card">
        <h1>Welcome, {user?.full_name || user?.name}!</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          {user?.role_name || 'User'} Dashboard
        </p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>{stats.totalItems}</h3>
          <p>Total Items</p>
        </div>
        
        <div className="stat-card success">
          <h3>{stats.availableItems}</h3>
          <p>Available Items</p>
        </div>

        {isAdminOrPetugas() && (
          <>
            <div className="stat-card warning">
              <h3>{stats.pendingBorrows}</h3>
              <p>Pending Requests</p>
            </div>
            
            <div className="stat-card">
              <h3>{stats.activeBorrows}</h3>
              <p>Active Borrows</p>
            </div>
          </>
        )}

        {!isAdminOrPetugas() && (
          <div className="stat-card">
            <h3>{stats.myBorrows}</h3>
            <p>My Borrows</p>
          </div>
        )}

        {isAdmin() && (
          <div className="stat-card danger">
            <h3>{stats.totalUsers}</h3>
            <p>Total Users</p>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          {isAdminOrPetugas() ? 'Recent Borrow Requests' : 'My Recent Borrows'}
        </div>
        
        {recentBorrows.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📦</div>
            <p>No borrow records yet</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  {isAdminOrPetugas() && <th>Borrower</th>}
                  <th>Item</th>
                  <th>Quantity</th>
                  <th>Expected Return</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentBorrows.map((borrow) => (
                  <tr key={borrow.id}>
                    <td>#{borrow.id}</td>
                    {isAdminOrPetugas() && <td>{borrow.nama_peminjam}</td>}
                    <td>{borrow.item_name}</td>
                    <td>{borrow.item_count}</td>
                    <td>{new Date(borrow.return_date_expected).toLocaleDateString()}</td>
                    <td>
                      <span className={`badge badge-${borrow.status}`}>
                        {borrow.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;