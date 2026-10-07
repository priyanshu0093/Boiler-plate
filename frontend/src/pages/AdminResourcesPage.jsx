import React, { useState, useEffect, useCallback } from 'react';
import { getResources, createResource, updateResource } from '../api/client';
import { useSocket } from '../context/SocketContext';
import StatusBadge from '../components/StatusBadge';
import {
  Plus,
  Edit2,
  Wrench,
  CheckCircle,
  X,
  Search
} from 'lucide-react';

export default function AdminResourcesPage() {
  const { socket, addToast } = useSocket();

  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  // Modal states
  const [modalMode, setModalMode] = useState(null); // 'CREATE' | 'EDIT' | null
  const [editingResource, setEditingResource] = useState(null);

  // Form fields
  const [formData, setFormData] = useState({
    name: '',
    category: 'SPACES',
    description: '',
    location: '',
    image: '',
    status: 'AVAILABLE',
    specsKey: '',
    specsVal: ''
  });
  const [specList, setSpecList] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const fetchAllResources = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getResources({ search, includeInactive: 'true' });
      if (res.success && res.data) {
        setResources(res.data);
      }
    } catch (err) {
      console.error('[AdminResources] Error:', err);
      setError(err.message || 'Failed to load resources');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchAllResources();
  }, [fetchAllResources]);

  // Real-time status sync
  useEffect(() => {
    if (!socket) return;
    const handleStatusChanged = (payload) => {
      setResources((prev) =>
        prev.map((r) => (r._id === payload.resourceId ? { ...r, status: payload.status } : r))
      );
    };
    socket.on('resource:status_changed', handleStatusChanged);
    return () => socket.off('resource:status_changed', handleStatusChanged);
  }, [socket]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingResource(null);
    setFormData({
      name: '',
      category: 'SPACES',
      description: '',
      location: '',
      image: '',
      status: 'AVAILABLE',
      specsKey: '',
      specsVal: ''
    });
    setSpecList({});
    setModalMode('CREATE');
  };

  // Open Edit Modal
  const handleOpenEdit = (res) => {
    setEditingResource(res);
    setFormData({
      name: res.name || '',
      category: res.category || 'SPACES',
      description: res.description || '',
      location: res.location || '',
      image: res.image || '',
      status: res.status || 'AVAILABLE',
      specsKey: '',
      specsVal: ''
    });
    setSpecList(res.specifications && typeof res.specifications === 'object' ? { ...res.specifications } : {});
    setModalMode('EDIT');
  };

  // Quick Toggle Maintenance
  const handleToggleMaintenance = async (res) => {
    const newStatus = res.status === 'MAINTENANCE' ? 'AVAILABLE' : 'MAINTENANCE';
    try {
      const updated = await updateResource(res._id, { status: newStatus });
      if (updated.success) {
        setResources((prev) =>
          prev.map((r) => (r._id === res._id ? { ...r, status: newStatus } : r))
        );
        addToast(`${res.name} set to ${newStatus}`, 'info');
      }
    } catch (err) {
      addToast(err.message || 'Failed to update resource status', 'error');
    }
  };

  // Quick Toggle Active/Inactive
  const handleToggleActive = async (res) => {
    const newActive = !res.isActive;
    try {
      const updated = await updateResource(res._id, { isActive: newActive });
      if (updated.success) {
        setResources((prev) =>
          prev.map((r) => (r._id === res._id ? { ...r, isActive: newActive } : r))
        );
        addToast(`${res.name} ${newActive ? 'activated' : 'deactivated'}`, 'info');
      }
    } catch (err) {
      addToast(err.message || 'Failed to update status', 'error');
    }
  };

  const handleAddSpec = () => {
    if (formData.specsKey.trim() && formData.specsVal.trim()) {
      setSpecList((prev) => ({
        ...prev,
        [formData.specsKey.trim()]: formData.specsVal.trim()
      }));
      setFormData((prev) => ({ ...prev, specsKey: '', specsVal: '' }));
    }
  };

  const handleRemoveSpec = (key) => {
    setSpecList((prev) => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  };

  const handleSubmitModal = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.location || !formData.description) {
      alert('Please fill out all required fields.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        name: formData.name.trim(),
        category: formData.category,
        description: formData.description.trim(),
        location: formData.location.trim(),
        image: formData.image.trim(),
        status: formData.status,
        specifications: specList
      };

      if (modalMode === 'CREATE') {
        const res = await createResource(payload);
        if (res.success) {
          addToast(`Created resource "${res.data.name}"`, 'success');
          setModalMode(null);
          fetchAllResources();
        }
      } else if (modalMode === 'EDIT' && editingResource) {
        const res = await updateResource(editingResource._id, payload);
        if (res.success) {
          addToast(`Updated resource "${res.data.name}"`, 'success');
          setModalMode(null);
          fetchAllResources();
        }
      }
    } catch (err) {
      alert(err.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="main-content">
      <header className="dashboard-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 className="greeting-title">Resource Inventory Management</h1>
            <p className="greeting-sub">
              Administer shared office spaces, audio hardware, testing rigs, and displays.
            </p>
          </div>

          <button
            type="button"
            className="btn-primary"
            onClick={handleOpenCreate}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Plus size={15} /> Add New Resource
          </button>
        </div>

        {/* Search */}
        <div style={{ marginTop: 20, maxWidth: 400 }}>
          <div className="search-input-wrapper">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Search resources..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </header>

      {/* Table of Resources */}
      <section style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-light)', backgroundColor: 'var(--bg-subtle)' }}>
              <th style={{ padding: '12px 18px', fontWeight: 600, color: 'var(--text-secondary)' }}>Resource</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>Category</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>Location</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>Status</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>State</th>
              <th style={{ padding: '12px 18px', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" style={{ padding: 32, textAlign: 'center', color: 'var(--text-tertiary)' }}>
                  Loading inventory...
                </td>
              </tr>
            ) : resources.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ padding: 32, textAlign: 'center', color: 'var(--text-tertiary)' }}>
                  No resources found.
                </td>
              </tr>
            ) : (
              resources.map((res) => (
                <tr
                  key={res._id}
                  style={{
                    borderBottom: '1px solid var(--border-light)',
                    opacity: res.isActive ? 1 : 0.6
                  }}
                >
                  <td style={{ padding: '14px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {res.image ? (
                        <img src={res.image} alt={res.name} style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm)', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'var(--text-tertiary)' }}>
                          Asset
                        </div>
                      )}
                      <div>
                        <strong style={{ color: 'var(--text-primary)', display: 'block' }}>{res.name}</strong>
                        <span style={{ fontSize: 11.5, color: 'var(--text-tertiary)' }}>{res.description?.substring(0, 48)}...</span>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                    {res.category?.replace('_', ' ')}
                  </td>
                  <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                    {res.location}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <StatusBadge status={res.status} />
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: res.isActive ? '#2E7D32' : '#B91C1C' }}>
                      {res.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ padding: '5px 9px', fontSize: 12 }}
                        onClick={() => handleOpenEdit(res)}
                        title="Edit Details"
                      >
                        <Edit2 size={13} /> Edit
                      </button>

                      <button
                        type="button"
                        className="btn-secondary"
                        style={{
                          padding: '5px 9px',
                          fontSize: 12,
                          color: res.status === 'MAINTENANCE' ? '#2E7D32' : '#B45309'
                        }}
                        onClick={() => handleToggleMaintenance(res)}
                        title={res.status === 'MAINTENANCE' ? 'Set Available' : 'Set Under Maintenance'}
                      >
                        {res.status === 'MAINTENANCE' ? <CheckCircle size={13} /> : <Wrench size={13} />}
                        {res.status === 'MAINTENANCE' ? 'Clear Maint' : 'Maintenance'}
                      </button>

                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ padding: '5px 9px', fontSize: 12, color: res.isActive ? '#B91C1C' : '#2E7D32' }}
                        onClick={() => handleToggleActive(res)}
                      >
                        {res.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {/* Create / Edit Modal */}
      {modalMode && (
        <div className="modal-overlay" onClick={() => setModalMode(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <button type="button" className="modal-close-btn" onClick={() => setModalMode(null)}>
              <X size={18} />
            </button>

            <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--border-light)' }}>
              <h2 style={{ fontSize: 20, fontWeight: 700 }}>
                {modalMode === 'CREATE' ? 'Add Office Resource' : `Edit: ${editingResource?.name}`}
              </h2>
            </div>

            <form onSubmit={handleSubmitModal} style={{ padding: '24px 28px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Resource Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Boardroom Gamma, Shure MV7 #02"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Category *</label>
                    <select
                      className="form-input"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    >
                      <option value="SPACES">Spaces</option>
                      <option value="AUDIO">Audio</option>
                      <option value="TESTING_HARDWARE">Testing Hardware</option>
                      <option value="DISPLAYS">Displays</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Location *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Floor 3, East Wing"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Description *</label>
                  <textarea
                    className="form-input"
                    rows="3"
                    placeholder="Provide details on equipment features, seating, setup..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Image URL (Optional)</label>
                  <input
                    type="url"
                    className="form-input"
                    placeholder="https://images.unsplash.com/..."
                    value={formData.image}
                    onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  />
                </div>

                {/* Technical Specifications Map */}
                <div className="form-group">
                  <label className="form-label">Specifications (Key / Value)</label>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Property (e.g. capacity)"
                      value={formData.specsKey}
                      onChange={(e) => setFormData({ ...formData, specsKey: e.target.value })}
                    />
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Value (e.g. 12 people)"
                      value={formData.specsVal}
                      onChange={(e) => setFormData({ ...formData, specsVal: e.target.value })}
                    />
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={handleAddSpec}
                      style={{ padding: '8px 14px' }}
                    >
                      Add
                    </button>
                  </div>

                  {Object.keys(specList).length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                      {Object.entries(specList).map(([k, v]) => (
                        <span key={k} className="spec-pill" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <strong>{k}:</strong> {v}
                          <X size={12} style={{ cursor: 'pointer' }} onClick={() => handleRemoveSpec(k)} />
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border-light)' }}>
                <button type="button" className="btn-secondary" onClick={() => setModalMode(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : modalMode === 'CREATE' ? 'Create Resource' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
