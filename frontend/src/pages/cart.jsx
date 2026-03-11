import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { borrowAPI, itemAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

const MAX_ITEMS_PER_REQUEST = 20;
const INITIAL_FORM_STATE = {
  return_date_expected: '',
  request_notes: '',
};

function Cart() {
  const { isPeminjam } = useAuth();
  const { items, updateQuantity, removeItem, clearCart, totalItems, totalQuantity } = useCart();
  const [availableItems, setAvailableItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(INITIAL_FORM_STATE);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadAvailableItems();
  }, []);

  const loadAvailableItems = async () => {
    try {
      const res = await itemAPI.getAvailable();
      setAvailableItems(res.data || []);
    } catch (error) {
      console.error('Failed to load available items:', error);
    } finally {
      setLoading(false);
    }
  };

  const availableMap = useMemo(() => {
    const map = new Map();
    availableItems.forEach((item) => {
      map.set(item.id, Number(item.available) || 0);
    });
    return map;
  }, [availableItems]);

  const cartRows = useMemo(
    () =>
      items.map((entry) => ({
        ...entry,
        available: availableMap.has(entry.id) ? availableMap.get(entry.id) : 0,
      })),
    [items, availableMap]
  );

  const hasInvalidQty = cartRows.some((entry) => entry.quantity > entry.available);
  const exceedsMaxItems = cartRows.length > MAX_ITEMS_PER_REQUEST;

  const updateForm = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const clampQty = (value, available) => {
    let next = Math.max(1, Number(value) || 1);
    if (Number.isFinite(available) && available > 0) {
      next = Math.min(next, available);
    }
    return next;
  };

  const handleQuantityChange = (entry, value) => {
    const nextQty = clampQty(value, entry.available);
    updateQuantity(entry.id, nextQty);
  };

  const adjustQuantity = (entry, delta) => {
    const nextQty = clampQty(entry.quantity + delta, entry.available);
    updateQuantity(entry.id, nextQty);
  };

  const generateIdempotencyKey = () => {
    if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
      return globalThis.crypto.randomUUID();
    }
    return `borrow-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  };

  const handleSubmit = async () => {
    if (cartRows.length === 0) {
      alert('Cart is empty');
      return;
    }

    if (!form.return_date_expected) {
      alert('Expected return date is required');
      return;
    }

    if (exceedsMaxItems) {
      alert(`Maximum ${MAX_ITEMS_PER_REQUEST} items per request`);
      return;
    }

    if (hasInvalidQty) {
      alert('Some items exceed available stock. Please adjust the quantities.');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        request_notes: form.request_notes || null,
        items: cartRows.map((entry) => ({
          id_items: entry.id,
          item_count: Number(entry.quantity) || 1,
          return_date_expected: form.return_date_expected,
          notes: null,
        })),
      };

      const idempotencyKey = generateIdempotencyKey();
      const response = await borrowAPI.createBatch(payload, idempotencyKey);

      clearCart();
      setForm(INITIAL_FORM_STATE);

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

  if (!isPeminjam()) {
    return (
      <div className="card">
        <h1 className="card-header">Cart</h1>
        <p className="card-body">Cart is only available for borrowers.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  const today = new Date().toISOString().split('T')[0];

  return (
    <div>
      <div className="card cart-header">
        <div className="cart-header-content">
          <div>
            <h1 className="card-header">Borrow Cart</h1>
            <p className="card-body">
              {totalItems} item{totalItems !== 1 ? 's' : ''} in cart, total quantity {totalQuantity}.
            </p>
          </div>
          <Link to="/items" className="btn btn-secondary">
            Continue Browsing
          </Link>
        </div>
      </div>

      {cartRows.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">[]</div>
            <p>Your cart is empty.</p>
            <Link to="/items" className="btn btn-primary mt-2">
              Browse Items
            </Link>
          </div>
        </div>
      ) : (
        <div className="cart-layout">
          <div className="card cart-items">
            <h2 className="card-header">Items in Cart</h2>
            <div className="cart-list">
              {cartRows.map((entry) => {
                const outOfStock = entry.available <= 0;
                const exceedsStock = entry.quantity > entry.available;
                return (
                  <div className="cart-item" key={entry.id}>
                    <div className="cart-item-info">
                      <h3 className="text-clamp-1">{entry.item_name}</h3>
                      <p className="cart-item-meta">
                        Available: {entry.available}
                        {outOfStock && <span className="cart-item-warning"> Out of stock</span>}
                        {!outOfStock && exceedsStock && (
                          <span className="cart-item-warning"> Quantity exceeds stock</span>
                        )}
                      </p>
                    </div>
                    <div className="cart-item-actions">
                      <div className="qty-control">
                        <button
                          type="button"
                          className="qty-btn"
                          onClick={() => adjustQuantity(entry, -1)}
                          disabled={entry.quantity <= 1}
                        >
                          -
                        </button>
                        <input
                          type="number"
                          className="form-input cart-qty-input qty-input"
                          value={entry.quantity}
                          min="1"
                          max={entry.available > 0 ? entry.available : undefined}
                          onChange={(e) => handleQuantityChange(entry, e.target.value)}
                        />
                        <button
                          type="button"
                          className="qty-btn"
                          onClick={() => adjustQuantity(entry, 1)}
                          disabled={entry.available <= 0 || entry.quantity >= entry.available}
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        className="btn btn-sm btn-danger"
                        onClick={() => removeItem(entry.id)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card cart-summary">
            <h2 className="card-header">Borrow Summary</h2>
            <div className="cart-summary-row">
              <span>Total items</span>
              <strong>{totalItems}</strong>
            </div>
            <div className="cart-summary-row">
              <span>Total quantity</span>
              <strong>{totalQuantity}</strong>
            </div>
            <div className="form-group">
              <label className="form-label">Expected Return Date *</label>
              <input
                type="date"
                className="form-input"
                value={form.return_date_expected}
                onChange={(e) => updateForm('return_date_expected', e.target.value)}
                min={today}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea
                className="form-textarea"
                value={form.request_notes}
                onChange={(e) => updateForm('request_notes', e.target.value)}
                placeholder="Optional notes for this borrow request..."
              />
            </div>
            {exceedsMaxItems && (
              <div className="alert alert-warning">
                Maximum {MAX_ITEMS_PER_REQUEST} items per request.
              </div>
            )}
            {hasInvalidQty && (
              <div className="alert alert-warning">
                Some items exceed available stock. Please adjust before submitting.
              </div>
            )}
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={isSubmitting || hasInvalidQty || exceedsMaxItems}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Borrow Request'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={clearCart} disabled={isSubmitting}>
              Clear Cart
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Cart;
