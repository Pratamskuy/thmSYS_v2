import { useState, useEffect } from 'react';
import { borrowAPI, itemAPI, returnAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

function Borrows() {
  const { isAdminOrPetugas, user } = useAuth();
  const [borrows, setBorrows] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState('all');
  const [reportBorrows, setReportBorrows] = useState([]);
  const [isPrintReady, setIsPrintReady] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (selectedItems.length === 0) {
      alert('pick at least one item');
      return;
    }

    const hasEmptyReturnDate = selectedItems.some((item) => !item.return_date_expected);
    if (hasEmptyReturnDate) {
      alert('fill expected return date for all items');
      return;
    }

    const hasInvalidQty = selectedItems.some((item) => Number(item.item_count) < 1 || Number(item.item_count) > Number(item.available));
    if (hasInvalidQty) {
      alert('item quantity is invalid');
      return;
    }
    try {
      await Promise.all(
        selectedItems.map((selectedItem) =>
          borrowAPI.create({
            id_items: selectedItem.id,
            item_count: Number(selectedItem.item_count) || 1,
            return_date_expected: selectedItem.return_date_expected,
            notes: selectedItem.notes,
          })
        )
      );
      loadBorrows();
      loadAvailableItems();
      closeModal();
      alert(`${selectedItems.length} borrow request sent sucessfully!`);
    } catch (error) {
      alert(error.message);
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

  const openCreateModal = () => {
    setSelectedItems([]);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedItems([]);
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
          available: item.available,
          item_count: 1,
          return_date_expected: '',
          notes: '',
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
  
      const fine = baseFine > 0 ? baseFine : (late > 0 ? late * 5000 : 0);
  
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
          {!isAdminOrPetugas() && (
            <button className="btn btn-primary" onClick={openCreateModal}>
              + New Borrow Request
            </button>
          )}
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
            <button className="btn btn-sm btn-secondary"
              onClick={handlePrintReport}
              disabled={isPrinting}
            > {isPrinting ? 'Preparing...' : 'Print Borrow Report'} </button>
          </div>
          
        )}
      </div>

      <div className="card no-print">
        {borrows.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
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
                      <span className={`badge badge-${borrow.status}`}>
                        {borrow.status}
                      </span>
                    </td>
                    <td>
                      <div className="btn-group">
                        {isAdminOrPetugas() && borrow.status === 'pending' && (
                          <>
                            <button
                              className="btn btn-sm btn-success"
                              onClick={() => handleApprove(borrow.id)}
                            >
                              Approve
                            </button>
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => handleReject(borrow.id)}
                            >
                              Reject
                            </button>
                          </>
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
            <div className="report-meta">
              Tanggal cetak: {new Date().toLocaleString('id-ID')}
            </div>
          </div>

          <p className="report-summary">
            Total transaksi peminjaman: {reportBorrows.length}
          </p>

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
  
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">New Borrow Request</h2>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>
            
            <section className="borrow-selector-panel">
              <div className="borrow-selector-header">
                <h3>Pilih Item Dulu</h3>
                <p>Klik item untuk menambah/menghapus dari daftar pengajuan.</p>
              </div>

              <div className="item-selector-grid">
                {items.length === 0 ? (
                  <p className="text-center">Tidak ada item yang tersedia saat ini.</p>
                ) : (
                  items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`item-selector-card ${isItemSelected(item.id) ? 'selected' : ''}`}
                      onClick={() => toggleItemSelection(item)}
                    >
                      <span className="item-selector-name">{item.item_name}</span>
                      <span className="item-selector-stock">Stok tersedia: {item.available}</span>
                    </button>
                  ))
                )}
              </div>
            </section>  
              <form onSubmit={handleSubmit}>
              {selectedItems.length === 0 ? (
                <div className="empty-selection-hint">Pilih minimal 1 item untuk menampilkan form peminjaman.</div>
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
                          Hapus
                        </button>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Quantity *</label>
                        <input
                          type="number"
                          className="form-input"
                          value={selectedItem.item_count}
                          onChange={(e) =>
                            updateSelectedItem(selectedItem.id, 'item_count', e.target.value)
                          }
                          required
                          min="1"
                          max={selectedItem.available}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Expected Return Date *</label>
                        <input
                          type="date"
                          className="form-input"
                          value={selectedItem.return_date_expected}
                          onChange={(e) =>
                            updateSelectedItem(selectedItem.id, 'return_date_expected', e.target.value)
                          }
                          required
                          min={new Date().toISOString().split('T')[0]}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Notes</label>
                        <textarea
                          className="form-textarea"
                          value={selectedItem.notes}
                          onChange={(e) => updateSelectedItem(selectedItem.id, 'notes', e.target.value)}
                          placeholder="Purpose of borrowing..."
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="btn-group">
                <button type="submit" className="btn btn-primary"  disabled={selectedItems.length === 0}>
                  Submit Request
                </button>
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  Cancel
                </button>
              </div>  
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Borrows;