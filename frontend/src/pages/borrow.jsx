import { useEffect, useMemo, useState } from 'react';
import { borrowAPI, itemAPI, returnAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const INITIAL_FORM_STATE = {
  return_date_expected: '',
  request_notes: '',
};

function Borrows() {
  const { isAdminOrPetugas, user } = useAuth();
  const [borrows, setBorrows] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [reportBorrows, setReportBorrows] = useState([]);
  const [isPrintReady, setIsPrintReady] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [borrowForm, setBorrowForm] = useState(INITIAL_FORM_STATE);

  useEffect(() => {
    loadBorrows();
    loadAvailableItems();
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
      } else {
        res = await borrowAPI.getMy();
      }

      setBorrows(res.data || []);
    } catch (error) {
      console.error('Failed to load borrows:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableItems = async () => {
    try {
      const res = await itemAPI.getAvailable();
      setItems(res.data || []);
    } catch (error) {
      console.error('Failed to load items:', error);
    }
  };

  const generateIdempotencyKey = () => {
    if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
      return globalThis.crypto.randomUUID();
    }

    return `borrow-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  };

  const resetBorrowForm = () => {
    setSelectedItems([]);
    setBorrowForm(INITIAL_FORM_STATE);
    setShowConfirmModal(false);
  };

  const validateBorrowBatch = () => {
    if (selectedItems.length === 0) {
      return 'Pick at least one item';
    }

    if (!borrowForm.return_date_expected) {
      return 'Expected return date is required';
    }

    const hasInvalidQty = selectedItems.some((item) => {
      const qty = Number(item.item_count);
      return !Number.isFinite(qty) || qty < 1 || qty > Number(item.available);
    });

    if (hasInvalidQty) {
      return 'Item quantity is invalid';
    }

    return null;
  };

  const handleReviewBatch = (e) => {
    e.preventDefault();

    const validationMessage = validateBorrowBatch();
    if (validationMessage) {
      alert(validationMessage);
      return;
    }

    setShowConfirmModal(true);
  };

  const closeConfirmModal = () => {
    if (isSubmitting) {
      return;
    }

    setShowConfirmModal(false);
  };

  const handleConfirmSubmit = async () => {
    const validationMessage = validateBorrowBatch();
    if (validationMessage) {
      alert(validationMessage);
      return;
    }

    try {
      setIsSubmitting(true);

      const idempotencyKey = generateIdempotencyKey();
      const payload = {
        request_notes: borrowForm.request_notes || null,
        items: selectedItems.map((selectedItem) => ({
          id_items: selectedItem.id,
          item_count: Number(selectedItem.item_count) || 1,
          return_date_expected: borrowForm.return_date_expected,
          notes: null,
        })),
      };

      const response = await borrowAPI.createBatch(payload, idempotencyKey);
      await Promise.all([loadBorrows(), loadAvailableItems()]);
      resetBorrowForm();

      const requestId = response?.data?.request_id;
      alert(
        response?.message ||
          `Borrow request submitted successfully${requestId ? ` (Request #${requestId})` : ''}!`
      );
    } catch (error) {
      alert(error.message);
    } finally {
      setIsSubmitting(false);
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

  const handleRequestReturn = async (id) => {
    if (window.confirm('Request to return this item?')) {
      try {
        await borrowAPI.requestReturn(id);
        loadBorrows();
        alert('Return request submitted!');
      } catch (error) {
        alert(error.message);
      }
    }
  };

  const handleCancel = async (id) => {
    if (window.confirm('Cancel this borrow request?')) {
      try {
        await borrowAPI.cancel(id);
        loadBorrows();
        alert('Borrow request cancelled!');
      } catch (error) {
        alert(error.message);
      }
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

  const handlePrintReport = async () => {
    try {
      setIsPrintReady(false);
      setIsPrinting(true);
      const res = await borrowAPI.getAll();
      setReportBorrows(res.data || []);
      setIsPrintReady(true);
    } catch (error) {
      setIsPrinting(false);
      alert(error.message);
    }
  };

  const isItemSelected = (id) => selectedItems.some((selectedItem) => selectedItem.id === id);

  const toggleItemSelection = (item) => {
    setSelectedItems((prev) => {
      if (prev.some((selectedItem) => selectedItem.id === item.id)) {
        return prev.filter((selectedItem) => selectedItem.id !== item.id);
      }

      return [
        ...prev,
        {
          id: item.id,
          item_name: item.item_name,
          available: Number(item.available) || 0,
          item_count: 1,
        },
      ];
    });
  };

  const updateSelectedItem = (id, field, value) => {
    setSelectedItems((prev) =>
      prev.map((selectedItem) =>
        selectedItem.id === id ? { ...selectedItem, [field]: value } : selectedItem
      )
    );
  };

  const updateBorrowForm = (field, value) => {
    setBorrowForm((prev) => ({ ...prev, [field]: value }));
  };

  const totalRequestedQuantity = useMemo(
    () =>
      selectedItems.reduce((acc, item) => {
        const qty = Number(item.item_count) || 0;
        return acc + qty;
      }, 0),
    [selectedItems]
  );

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

  const today = new Date().toISOString().split('T')[0];

  return (
    <div>
      <div className="card no-print">
        <div className="flex justify-between items-center">
          <h1 className="card-header">
            {isAdminOrPetugas() ? 'Borrow Requests Management' : 'My Borrows'}
          </h1>
          {!isAdminOrPetugas() && <div className="borrow-batch-badge">Batch Borrow Form</div>}
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

      {!isAdminOrPetugas() && (
        <div className="card no-print">
          <h2 className="card-header">Create Borrow</h2>
          <form onSubmit={handleReviewBatch}>
            <section className="borrow-selector-panel">
              <div className="borrow-selector-header">
                <h3>Select Items</h3>
                <p>Click items to include or remove them from your borrow request.</p>
              </div>
              <div className="item-selector-grid">
                {items.length === 0 ? (
                  <p className="text-center">No items are available right now.</p>
                ) : (
                  items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`item-selector-card ${isItemSelected(item.id) ? 'selected' : ''}`}
                      onClick={() => toggleItemSelection(item)}
                    >
                      <span className="item-selector-name">{item.item_name}</span>
                      <span className="item-selector-stock">Available stock: {item.available}</span>
                    </button>
                  ))
                )}
              </div>
            </section>

            {selectedItems.length === 0 ? (
              <div className="empty-selection-hint">
                Select at least one item to fill the borrow form.
              </div>
            ) : (
              <div className="selected-items-form-list">
                {selectedItems.map((selectedItem) => (
                  <div className="selected-item-form-card" key={selectedItem.id}>
                    <div className="selected-item-form-header">
                      <h3>{selectedItem.item_name}</h3>
                      <button
                        type="button"
                        className="btn btn-sm btn-danger"
                        onClick={() => toggleItemSelection(selectedItem)}
                      >
                        Remove
                      </button>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Quantity *</label>
                      <input
                        type="number"
                        className="form-input"
                        value={selectedItem.item_count}
                        onChange={(e) => updateSelectedItem(selectedItem.id, 'item_count', e.target.value)}
                        required
                        min="1"
                        max={selectedItem.available}
                      />
                      <small className="field-help">Max available: {selectedItem.available}</small>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="borrow-shared-form-grid">
              <div className="form-group">
                <label className="form-label">Expected Return Date *</label>
                <input
                  type="date"
                  className="form-input"
                  value={borrowForm.return_date_expected}
                  onChange={(e) => updateBorrowForm('return_date_expected', e.target.value)}
                  min={today}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Batch Notes</label>
                <textarea
                  className="form-textarea"
                  value={borrowForm.request_notes}
                  onChange={(e) => updateBorrowForm('request_notes', e.target.value)}
                  placeholder="Optional note for this batch request..."
                />
              </div>
            </div>

            <div className="btn-group">
              <button type="submit" className="btn btn-primary" disabled={selectedItems.length === 0}>
                Review Batch
              </button>
              <button type="button" className="btn btn-secondary" onClick={resetBorrowForm}>
                Reset Form
              </button>
            </div>
          </form>
        </div>
      )}

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
                  {isAdminOrPetugas() && <th>Borrower</th>}
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
                    {isAdminOrPetugas() && <td>{borrow.full_name}</td>}
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
                        {isAdminOrPetugas() && borrow.status === 'pending' && (
                          <>
                            <button className="btn btn-sm btn-success" onClick={() => handleApprove(borrow.id)}>
                              Approve
                            </button>
                            <button className="btn btn-sm btn-danger" onClick={() => handleReject(borrow.id)}>
                              Reject
                            </button>
                          </>
                        )}
                        {isAdminOrPetugas() && borrow.status === 'queued' && (
                          <button className="btn btn-sm btn-danger" onClick={() => handleReject(borrow.id)}>
                            Reject
                          </button>
                        )}
                        {isAdminOrPetugas() && borrow.status === 'waiting for return' && (
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => handleConfirmReturn(borrow.id)}
                          >
                            Accept Return
                          </button>
                        )}
                        {!isAdminOrPetugas() && borrow.status === 'taken' && (
                          <button
                            className="btn btn-sm btn-warning"
                            onClick={() => handleRequestReturn(borrow.id)}
                          >
                            Request Return
                          </button>
                        )}
                        {!isAdminOrPetugas() &&
                          (borrow.status === 'pending' || borrow.status === 'queued') && (
                            <button className="btn btn-sm btn-danger" onClick={() => handleCancel(borrow.id)}>
                              Cancel
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

      {isAdminOrPetugas() && (
        <section className="print-only">
          <div className="report-header">
            <div>
              <h2>Laporan Riwayat Peminjaman</h2>
              <p className="report-meta">
                Dicetak oleh: {user?.full_name || user?.name || 'Petugas/Admin'}
              </p>
            </div>
            <div className="report-meta">Tanggal cetak: {new Date().toLocaleString('id-ID')}</div>
          </div>

          <p className="report-summary">Total transaksi peminjaman: {reportBorrows.length}</p>

          <table className="table report-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Peminjam</th>
                <th>Item</th>
                <th>Qty</th>
                <th>Tgl Pinjam</th>
                <th>Tgl Kembali</th>
                <th>Denda</th>
                <th>Status</th>
                <th>Petugas</th>
              </tr>
            </thead>
            <tbody>
              {reportBorrows.length === 0 ? (
                <tr>
                  <td colSpan="9">Tidak ada data peminjaman.</td>
                </tr>
              ) : (
                reportBorrows.map((borrow) => (
                  <tr key={`report-${borrow.id}`}>
                    <td>#{borrow.id}</td>
                    <td>{borrow.full_name || '-'}</td>
                    <td>{borrow.item_name || '-'}</td>
                    <td>{borrow.item_count || 0}</td>
                    <td>{formatDate(borrow.borrow_date)}</td>
                    <td>{formatDate(borrow.return_date_expected)}</td>
                    <td>{formatFine(borrow)}</td>
                    <td>{borrow.status || '-'}</td>
                    <td>{borrow.officer_name || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      )}

      {showConfirmModal && (
        <div className="modal-overlay" onClick={closeConfirmModal}>
          <div className="modal modal-confirm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Confirm Borrow Batch</h2>
              <button className="modal-close" onClick={closeConfirmModal} disabled={isSubmitting}>
                x
              </button>
            </div>

            <div className="confirm-batch-summary">
              <p>
                <strong>Items selected:</strong> {selectedItems.length}
              </p>
              <p>
                <strong>Total quantity:</strong> {totalRequestedQuantity}
              </p>
              <p>
                <strong>Expected return:</strong> {formatDate(borrowForm.return_date_expected)}
              </p>
              <p>
                <strong>Batch notes:</strong> {borrowForm.request_notes || '-'}
              </p>
            </div>

            <div className="table-container">
              <table className="table confirm-batch-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Requested Qty</th>
                    <th>Available</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedItems.map((selectedItem) => (
                    <tr key={`confirm-${selectedItem.id}`}>
                      <td>{selectedItem.item_name}</td>
                      <td>{selectedItem.item_count}</td>
                      <td>{selectedItem.available}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="btn-group mt-2">
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConfirmSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : 'Confirm & Submit'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={closeConfirmModal}
                disabled={isSubmitting}
              >
                Back
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Borrows;
