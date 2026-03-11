import { Fragment, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { borrowAPI, returnAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

function Borrows() {
  const { isAdminOrPetugas, user } = useAuth();
  const [borrows, setBorrows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [isPrintReady, setIsPrintReady] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [activeTab, setActiveTab] = useState('table');
  const [batchRequests, setBatchRequests] = useState([]);
  const [adminBatches, setAdminBatches] = useState([]);
  const [expandedRequests, setExpandedRequests] = useState({});

  useEffect(() => {
    loadBorrows();
  }, [filter]);

  useEffect(() => {
    if (isPrinting && isPrintReady) {
      const timer = setTimeout(() => {
        window.print();
        setIsPrinting(false);
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [isPrinting, isPrintReady]);

  const loadBorrows = async () => {
    try {
      let res;
      if (isAdminOrPetugas()) {
        if (filter === 'pending') {
          res = await borrowAPI.getPending();
        } else if (filter === 'active') {
          res = await borrowAPI.getActive();
        } else {
          res = await borrowAPI.getAll();
        }

        const batchRes = await borrowAPI.getBatches();
        setBorrows(res.data || []);
        setAdminBatches(sortBatchesByDate(batchRes.data || []));
      } else {
        const [myRes, requestRes] = await Promise.all([borrowAPI.getMy(), borrowAPI.getRequests()]);
        setBorrows(myRes.data || []);
        setBatchRequests(sortBatchesByDate(requestRes.data || []));
      }
    } catch (error) {
      console.error('Failed to load borrows:', error);
    } finally {
      setLoading(false);
    }
  };


  const handleApprove = async (id) => {
    try {
      await borrowAPI.approve(id);
      loadBorrows();
      alert('Borrow request approved!');
    } catch (error) {
      alert(error.message);
    }
  };

  const handleReject = async (id) => {
    const notes = prompt('Reason for rejection:');
    if (notes) {
      try {
        await borrowAPI.reject(id, notes);
        loadBorrows();
        alert('Borrow request rejected!');
      } catch (error) {
        alert(error.message);
      }
    }
  };

  const handleApproveBatch = async (requestId) => {
    if (!window.confirm(`Approve batch request #${requestId}?`)) return;

    try {
      await borrowAPI.approveBatch(requestId);
      await loadBorrows();
      alert(`Batch request #${requestId} approved successfully!`);
    } catch (error) {
      alert(error.message);
    }
  };

  const handleRequestReturnBatch = async (requestId) => {
    if (window.confirm('Request to return this batch of borrows?')) {
      try {
        await borrowAPI.requestReturnBatch(requestId);
        await loadBorrows();
        alert('Batch return request submitted successfully!');
      } catch (error) {
        alert(error.message);
      }
    }
  };

  const handleConfirmReturnBatchAdmin = async (batch) => {
    const waitingItems = (batch.items || []).filter((item) => item.borrow_status === 'waiting for return');
    if (waitingItems.length === 0) {
      alert('No return requests in this batch.');
      return;
    }

    if (!window.confirm(`Confirm return for ${waitingItems.length} item(s) in batch #${batch.request_id}?`)) {
      return;
    }

    try {
      const results = await Promise.allSettled(
        waitingItems.map((item) => returnAPI.confirm(item.borrow_id))
      );
      const successCount = results.filter((result) => result.status === 'fulfilled').length;
      const failedCount = results.length - successCount;

      await loadBorrows();

      if (failedCount > 0) {
        alert(`Confirmed ${successCount} items. ${failedCount} failed.`);
      } else {
        alert(`Batch #${batch.request_id} return confirmed successfully!`);
      }
    } catch (error) {
      alert(error.message);
    }
  };

  const handleConfirmReturn = async (id) => {
    if (window.confirm('Confirm return for this borrow?')) {
      try {
        await returnAPI.confirm(id);
        loadBorrows();
        alert('Return confirmed!');
      } catch (error) {
        alert(error.message);
      }
    }
  };

  const toggleRequestDetails = (requestId) => {
    setExpandedRequests((prev) => ({
      ...prev,
      [requestId]: !prev[requestId],
    }));
  };

  const handlePrintReport = async () => {
    try {
      setIsPrintReady(false);
      setIsPrinting(true);
      const batchRes = await borrowAPI.getBatches();
      setAdminBatches(sortBatchesByDate(batchRes.data || []));
      setIsPrintReady(true);
    } catch (error) {
      setIsPrinting(false);
      alert(error.message);
    }
  };

  const sortBatchesByDate = (batches) => {
    return [...batches].sort((a, b) => {
      const timeA = new Date(a.submitted_at || 0).getTime();
      const timeB = new Date(b.submitted_at || 0).getTime();
      return timeB - timeA;
    });
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  const formatDate = (dateValue) => {
    if (!dateValue) return '-';
    return new Date(dateValue).toLocaleDateString('id-ID');
  };

  const getOverdueDays = (expectedDate, actualReturnDate) => {
    if (!expectedDate || !actualReturnDate) {
      return 0;
    }

    const expected = new Date(expectedDate);
    const returned = new Date(actualReturnDate);

    if (Number.isNaN(expected.getTime()) || Number.isNaN(returned.getTime())) {
      return 0;
    }

    const diffDays = Math.floor((returned - expected) / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const formatFine = (borrow) => {
    const baseFine = Number(borrow.fine ?? borrow.denda) || 0;
    let late = Number(borrow.late ?? borrow.terlambat_hari) || 0;

    if (late <= 0) {
      late = getOverdueDays(borrow.return_date_expected, borrow.return_date);
    }

    const fine = baseFine > 0 ? baseFine : late > 0 ? late * 5000 : 0;

    if (fine <= 0 && late <= 0) {
      return '-';
    }

    return `Rp ${fine.toLocaleString('id-ID')} (${late} hari)`;
  };

  return (
    <div>
      <div className="card no-print">
        <div className="flex justify-between items-center">
          <h1 className="card-header">
            {isAdminOrPetugas() ? 'Borrow Requests Management' : 'My Borrows'}
          </h1>
          {!isAdminOrPetugas() && <div className="borrow-batch-badge">Cart Borrowing</div>}
        </div>

        {isAdminOrPetugas() && (
          <div className="flex justify-between items-center mt-2">
            <div className="btn-group">
              <button
                className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFilter('all')}
              >
                All
              </button>
              <button
                className={`btn btn-sm ${filter === 'pending' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFilter('pending')}
              >
                Pending
              </button>
              <button
                className={`btn btn-sm ${filter === 'active' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFilter('active')}
              >
                Active
              </button>
            </div>
            <button className="btn btn-sm btn-secondary" onClick={handlePrintReport} disabled={isPrinting}>
              {isPrinting ? 'Preparing...' : 'Print Borrow Report'}
            </button>
          </div>
        )}
      </div>

      {isAdminOrPetugas() && (
        <div className="card no-print">
          <div className="btn-group" style={{ margin: '1rem 0' }}>
            <button
              className={`btn btn-sm ${activeTab === 'table' ? 'btn-primary' : 'btn-secondary'}`}
              type="button"
              onClick={() => setActiveTab('table')}
            >
              Detail Item
            </button>
            <button
              className={`btn btn-sm ${activeTab === 'batch' ? 'btn-primary' : 'btn-secondary'}`}
              type="button"
              onClick={() => setActiveTab('batch')}
            >
              Riwayat Batch
            </button>
          </div>
        </div>
      )}

      {!isAdminOrPetugas() && (
        <div className="card no-print">
          <div className="flex justify-between items-center mb-2">
            <div>
              <h2 className="card-header">Riwayat Batch Peminjaman</h2>
              <p className="card-body">
                Ajukan peminjaman baru melalui halaman Items dan Cart.
              </p>
            </div>
            <div className="btn-group">
              <Link to="/items" className="btn btn-secondary">
                Browse Items
              </Link>
              <Link to="/cart" className="btn btn-primary">
                Go to Cart
              </Link>
            </div>
          </div>

          {batchRequests.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">[]</div>
              <p>No batch requests found</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Request ID</th>
                    <th>Status</th>
                    <th>Submitted At</th>
                    <th>Total Items</th>
                    <th>Taken Items</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {batchRequests.map((request) => {
                    const items = request.items || [];
                    const totalItems = items.length;
                    const takenItems = items.filter((i) => i.borrow_status === 'taken').length;
                    const isReturnAllowed = takenItems > 0;
                    const isExpanded = Boolean(expandedRequests[request.request_id]);

                    return (
                      <Fragment key={`batch-${request.request_id}`}>
                        <tr>
                          <td>#{request.request_id}</td>
                          <td>{request.request_status}</td>
                          <td>{new Date(request.submitted_at).toLocaleString('id-ID')}</td>
                          <td>{totalItems}</td>
                          <td>{takenItems}</td>
                          <td>
                            <div className="btn-group">
                              <button
                                className="btn btn-sm btn-warning"
                                onClick={() => handleRequestReturnBatch(request.request_id)}
                                disabled={!isReturnAllowed}
                              >
                                Request Return
                              </button>
                              <button
                                className="btn btn-sm btn-secondary"
                                onClick={() => toggleRequestDetails(request.request_id)}
                              >
                                {isExpanded ? 'Hide Detail' : 'View Detail'}
                              </button>
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="table-row-details">
                            <td colSpan="6">
                              <div className="table-container">
                                <table className="table table-compact">
                                  <thead>
                                    <tr>
                                      <th>Item</th>
                                      <th>Qty</th>
                                      <th>Return Date</th>
                                      <th>Status</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {items.map((item) => (
                                      <tr key={`batch-detail-${request.request_id}-${item.borrow_id}`}>
                                        <td>{item.item_name}</td>
                                        <td>{item.item_count}</td>
                                        <td>{formatDate(item.return_date_expected)}</td>
                                        <td>{item.borrow_status}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {isAdminOrPetugas() && activeTab === 'table' && (
        <div className="card no-print">
          {borrows.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">[]</div>
              <p>No borrow requests found</p>
            </div>
          ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Borrower</th>
                  <th>Item</th>
                  <th>Quantity</th>
                  <th>Borrow Date</th>
                  <th>Expected Return</th>
                  <th>Fine</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {borrows.map((borrow) => (
                  <tr key={borrow.id}>
                    <td>#{borrow.id}</td>
                    <td>{borrow.full_name}</td>
                    <td>{borrow.item_name}</td>
                    <td>{borrow.item_count}</td>
                    <td>{new Date(borrow.borrow_date).toLocaleDateString()}</td>
                    <td>{new Date(borrow.return_date_expected).toLocaleDateString()}</td>
                    <td>{formatFine(borrow)}</td>
                    <td>
                      <span className={`badge badge-${borrow.status}`}>{borrow.status}</span>
                    </td>
                    <td>
                      <div className="btn-group">
                        {borrow.status === 'pending' && (
                          <>
                            <button className="btn btn-sm btn-success" onClick={() => handleApprove(borrow.id)}>
                              Approve
                            </button>
                            <button className="btn btn-sm btn-danger" onClick={() => handleReject(borrow.id)}>
                              Reject
                            </button>
                          </>
                        )}
                        {borrow.status === 'queued' && (
                          <button className="btn btn-sm btn-danger" onClick={() => handleReject(borrow.id)}>
                            Reject
                          </button>
                        )}
                        {borrow.status === 'waiting for return' && (
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => handleConfirmReturn(borrow.id)}
                          >
                            Accept Return
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      )}

      {isAdminOrPetugas() && activeTab === 'batch' && (
        <div className="card no-print">
          {adminBatches.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">[]</div>
              <p>No batch requests found</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Request ID</th>
                    <th>Borrower</th>
                    <th>Status</th>
                    <th>Submitted At</th>
                    <th>Total Items</th>
                    <th>Taken Items</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {adminBatches.map((batch) => {
                    const totalItems = batch.items.length;
                    const takenItems = batch.items.filter((item) => item.borrow_status === 'taken').length;
                    const pendingItems = batch.items.filter((item) => item.borrow_status === 'pending').length;
                    const waitingReturnItems = batch.items.filter(
                      (item) => item.borrow_status === 'waiting for return'
                    ).length;

                    return (
                      <Fragment key={`batch-${batch.request_id}`}>
                        <tr>
                          <td>#{batch.request_id}</td>
                          <td>{batch.borrower}</td>
                          <td>{batch.request_status}</td>
                          <td>{new Date(batch.submitted_at).toLocaleString('id-ID')}</td>
                          <td>{totalItems}</td>
                          <td>{takenItems}</td>
                          <td>
                            <div className="btn-group">
                              <button
                                className="btn btn-sm btn-success"
                                onClick={() => handleApproveBatch(batch.request_id)}
                                disabled={pendingItems === 0}
                              >
                                Approve Batch
                              </button>
                              <button
                                className="btn btn-sm btn-primary"
                                onClick={() => handleConfirmReturnBatchAdmin(batch)}
                                disabled={waitingReturnItems === 0}
                              >
                                Confirm Return
                              </button>
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td colSpan="7">
                            <strong>Details:</strong>
                            <div className="table-container">
                              <table className="table table-compact">
                                <thead>
                                  <tr>
                                    <th>Item</th>
                                    <th>Qty</th>
                                    <th>Return</th>
                                    <th>Status</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {batch.items.map((item) => (
                                    <tr key={`batch-item-${item.borrow_id}`}>
                                      <td>{item.item_name}</td>
                                      <td>{item.item_count}</td>
                                      <td>{new Date(item.return_date_expected).toLocaleDateString()}</td>
                                      <td>{item.borrow_status}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {isAdminOrPetugas() && (
        <section className="print-only">
          <div className="report-header">
            <div>
              <h2>Laporan Riwayat Batch Peminjaman</h2>
              <p className="report-meta">
                Dicetak oleh: {user?.full_name || user?.name || 'Petugas/Admin'}
              </p>
            </div>
            <div className="report-meta">Tanggal cetak: {new Date().toLocaleString('id-ID')}</div>
          </div>

          <p className="report-summary">Total batch: {adminBatches.length}</p>

          {adminBatches.map((batch) => (
            <div key={`print-batch-${batch.request_id}`} style={{ marginBottom: '1.5rem' }}>
              <h3>Batch #{batch.request_id} ({batch.request_status})</h3>
              <p>
                Peminjam: {batch.borrower} | Submit: {new Date(batch.submitted_at).toLocaleString('id-ID')}
              </p>
              <table className="table report-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Return</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {batch.items.map((item) => (
                    <tr key={`print-batch-item-${item.borrow_id}`}>
                      <td>{item.item_name || '-'}</td>
                      <td>{item.item_count || 0}</td>
                      <td>{formatDate(item.return_date_expected)}</td>
                      <td>{item.borrow_status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </section>
      )}

    </div>
  );
}

export default Borrows;
