import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { itemAPI, categoryAPI } from '../services/api';

function Items() {
  const { isAdmin } = useAuth();
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    item_name: '',
    description: '',
    total: '',
    available: '',  // ADDED: Field available
    categories_id: '',
    item_condition: 'normal',
  });

  useEffect(() => {
    loadItems();
    loadCategories();
  }, []);

  const loadItems = async () => {
    try {
      const res = await itemAPI.getAll();
      console.log('Items response:', res);
      const data = res.data || res;
      setItems(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load items:', error);
      alert('Gagal memuat data item: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const res = await categoryAPI.getAll();
      const data = res.data || res;
      setCategories(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.item_name || formData.item_name.trim() === '') {
      alert('Nama item wajib diisi!');
      return;
    }
    
    if (!formData.total || formData.total < 0) {
      alert('Jumlah total harus diisi dan tidak boleh minus!');
      return;
    }

    // ADDED: Validation untuk available
    if (formData.available === '' || formData.available < 0) {
      alert('Jumlah tersedia harus diisi dan tidak boleh minus!');
      return;
    }

    // ADDED: Validation available tidak boleh lebih dari total
    if (parseInt(formData.available) > parseInt(formData.total)) {
      alert('Jumlah tersedia tidak boleh lebih dari jumlah total!');
      return;
    }

    try {
      console.log('Submitting item data:', formData);
      
      if (editingItem) {
        await itemAPI.update(editingItem.id, formData);
        alert('Item berhasil diupdate!');
      } else {
        await itemAPI.create(formData);
        alert('Item berhasil dibuat!');
      }
      loadItems();
      closeModal();
    } catch (error) {
      console.error('Submit error:', error);
      alert('Gagal menyimpan item: ' + error.message);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus item ini?')) {
      try {
        await itemAPI.delete(id);
        alert('Item berhasil dihapus!');
        loadItems();
      } catch (error) {
        console.error('Delete error:', error);
        alert('Gagal menghapus item: ' + error.message);
      }
    }
  };

  const openCreateModal = () => {
    setEditingItem(null);
    setFormData({
      item_name: '',
      description: '',
      total: '',
      available: '',  // ADDED
      categories_id: '',
      item_condition: 'normal',
    });
    setShowModal(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setFormData({
      item_name: item.item_name,
      description: item.description || '',
      total: item.total,
      available: item.available,  // ADDED
      categories_id: item.categories_id || '',
      item_condition: item.item_condition,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingItem(null);
  };

  // ADDED: Helper untuk auto-set available saat create
  const handleTotalChange = (value) => {
    setFormData(prev => ({
      ...prev,
      total: value,
      // Jika sedang create (bukan edit), auto set available = total
      available: editingItem ? prev.available : value
    }));
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
        <div className="flex justify-between items-center">
          <h1 className="card-header">Manajemen Item</h1>
          {isAdmin() && (
            <button className="btn btn-primary" onClick={openCreateModal}>
              + Tambah Item
            </button>
          )}
        </div>
      </div>

      <div className="card">
        {items.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📦</div>
            <p>Belum ada item</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nama Item</th>
                  <th>Deskripsi</th>
                  <th>Total</th>
                  <th>Tersedia</th>
                  <th>Dipinjam</th>
                  <th>Kondisi</th>
                  {isAdmin() && <th>Aksi</th>}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>#{item.id}</td>
                    <td>{item.item_name}</td>
                    <td>{item.description || '-'}</td>
                    <td>{item.total}</td>
                    <td>
                      <span className={`badge ${item.available > 0 ? 'badge-approved' : 'badge-rejected'}`}>
                        {item.available}
                      </span>
                    </td>
                    <td>{item.total - item.available}</td>
                    <td>
                      <span className={`badge badge-${item.item_condition === 'normal' ? 'approved' : 'warning'}`}>
                        {item.item_condition}
                      </span>
                    </td>
                    {isAdmin() && (
                      <td>
                        <div className="btn-group">
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => openEditModal(item)}
                          >
                            Edit
                          </button>
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => handleDelete(item.id)}
                          >
                            Hapus
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {editingItem ? 'Edit Item' : 'Tambah Item Baru'}
              </h2>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Nama Item *</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.item_name}
                  onChange={(e) => setFormData({...formData, item_name: e.target.value})}
                  required
                  placeholder="Contoh: Canon EOS 700D"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Deskripsi</label>
                <textarea
                  className="form-textarea"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Deskripsi detail item..."
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Kategori</label>
                <select
                  className="form-select"
                  value={formData.categories_id}
                  onChange={(e) => setFormData({...formData, categories_id: e.target.value})}
                >
                  <option value="">Pilih Kategori</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.categories}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Jumlah Total *</label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.total}
                  onChange={(e) => handleTotalChange(e.target.value)}
                  required
                  min="0"
                  placeholder="Jumlah total item"
                />
                {!editingItem && (
                  <small style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    💡 Jumlah tersedia akan otomatis sama dengan total saat create item baru
                  </small>
                )}
              </div>

              {/* ADDED: Field Available */}
              <div className="form-group">
                <label className="form-label">Jumlah Tersedia *</label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.available}
                  onChange={(e) => setFormData({...formData, available: e.target.value})}
                  required
                  min="0"
                  max={formData.total}
                  placeholder="Jumlah yang tersedia untuk dipinjam"
                />
                <small style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  ⚠️ Tidak boleh lebih dari jumlah total ({formData.total || 0})
                </small>
              </div>

              <div className="form-group">
                <label className="form-label">Kondisi *</label>
                <select
                  className="form-select"
                  value={formData.item_condition}
                  onChange={(e) => setFormData({...formData, item_condition: e.target.value})}
                  required
                >
                  <option value="normal">Normal</option>
                  <option value="ok">OK</option>
                  <option value="not good">Not Good</option>
                  <option value="broken">Broken</option>
                </select>
              </div>

              <div className="btn-group">
                <button type="submit" className="btn btn-primary">
                  {editingItem ? 'Update' : 'Simpan'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Items;