import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch, formatCurrency } from '../services/api';
import { useApp } from '../context/AppContext';

const EMPTY_PRODUCT = {
  sku: '',
  name: '',
  brand: '',
  category_id: 1,
  description: '',
  price: '',
  cost: '',
  stock: 10,
  min_stock: 5,
  sizes: '38,39,40,41,42,43,44',
  color: 'Negro/Blanco',
  image_url: '',
  featured: 0,
  active: 1
};

export default function InventoryPage() {
  const { notify } = useApp();
  const [activeTab, setActiveTab] = useState('products');
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [movements, setMovements] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');

  // Modal de Producto
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState(EMPTY_PRODUCT);

  // Modal de Movimiento de Stock
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [movementForm, setMovementForm] = useState({
    product_id: '',
    type: 'entrada',
    quantity: 5,
    reason: ''
  });

  // Modal de Categoría
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });

  const loadInventoryData = useCallback(async () => {
    setLoading(true);
    try {
      const [prodRes, catRes, movRes, alertRes] = await Promise.all([
        apiFetch('/api/inventory/products?include_inactive=true'),
        apiFetch('/api/inventory/categories'),
        apiFetch('/api/inventory/movements'),
        apiFetch('/api/inventory/alerts')
      ]);
      setProducts(prodRes.products || []);
      setCategories(catRes.categories || []);
      setMovements(movRes.movements || []);
      setAlerts(alertRes.alerts || []);
    } catch (err) {
      notify(err.message, 'danger');
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    loadInventoryData();
  }, [loadInventoryData]);

  function openNewProductModal() {
    setEditingProduct(null);
    setProductForm({
      ...EMPTY_PRODUCT,
      sku: `ZAP-${Math.floor(100 + Math.random() * 900)}`,
      category_id: categories[0]?.id || 1
    });
    setShowProductModal(true);
  }

  function openEditProductModal(prod) {
    setEditingProduct(prod);
    setProductForm({
      sku: prod.sku,
      name: prod.name,
      brand: prod.brand,
      category_id: prod.category_id,
      description: prod.description || '',
      price: prod.price,
      cost: prod.cost,
      stock: prod.stock,
      min_stock: prod.min_stock,
      sizes: prod.sizes || '39,40,41,42,43',
      color: prod.color || '',
      image_url: prod.image_url || '',
      featured: prod.featured ? 1 : 0,
      active: prod.active ? 1 : 0
    });
    setShowProductModal(true);
  }

  async function handleSaveProduct(e) {
    e.preventDefault();
    try {
      if (editingProduct) {
        await apiFetch(`/api/inventory/products/${editingProduct.id}`, {
          method: 'PUT',
          body: JSON.stringify(productForm)
        });
        notify('Producto actualizado correctamente.', 'success');
      } else {
        await apiFetch('/api/inventory/products', {
          method: 'POST',
          body: JSON.stringify(productForm)
        });
        notify('Nuevo producto registrado en inventario.', 'success');
      }
      setShowProductModal(false);
      await loadInventoryData();
    } catch (err) {
      notify(err.message, 'danger');
    }
  }

  function openMovementModalForProduct(prodId = '', defaultType = 'entrada', defaultReason = '') {
    setMovementForm({
      product_id: prodId || products[0]?.id || '',
      type: defaultType,
      quantity: 10,
      reason: defaultReason || 'Reposición de mercadería de proveedor oficial'
    });
    setShowMovementModal(true);
  }

  async function handleSaveMovement(e) {
    e.preventDefault();
    try {
      const res = await apiFetch('/api/inventory/movements', {
        method: 'POST',
        body: JSON.stringify(movementForm)
      });
      notify(
        `${res.message} (Stock anterior: ${res.previous_stock} → Nuevo stock: ${res.new_stock})`,
        'success'
      );
      setShowMovementModal(false);
      await loadInventoryData();
    } catch (err) {
      notify(err.message, 'danger');
    }
  }

  function openNewCategoryModal() {
    setEditingCategory(null);
    setCategoryForm({ name: '', description: '' });
    setShowCategoryModal(true);
  }

  function openEditCategoryModal(cat) {
    setEditingCategory(cat);
    setCategoryForm({ name: cat.name, description: cat.description || '' });
    setShowCategoryModal(true);
  }

  async function handleSaveCategory(e) {
    e.preventDefault();
    try {
      if (editingCategory) {
        await apiFetch(`/api/inventory/categories/${editingCategory.id}`, {
          method: 'PUT',
          body: JSON.stringify(categoryForm)
        });
        notify('Categoría actualizada.', 'success');
      } else {
        await apiFetch('/api/inventory/categories', {
          method: 'POST',
          body: JSON.stringify(categoryForm)
        });
        notify('Categoría creada exitosamente.', 'success');
      }
      setShowCategoryModal(false);
      await loadInventoryData();
    } catch (err) {
      notify(err.message, 'danger');
    }
  }

  const filteredProducts = products.filter((p) => {
    if (filterCat && Number(p.category_id) !== Number(filterCat)) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="container-fluid px-3 px-lg-4 py-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
        <div>
          <h3 className="fw-bold mb-0">
            <i className="bi bi-boxes text-warning me-2"></i>
            Gestión de Inventario, Movimientos y Alertas
          </h3>
          <p className="text-secondary small mb-0">
            Control de catálogo de zapatillas, categorías, auditoría de entradas/salidas y prevención de quiebre de stock
          </p>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-sm btn-outline-success"
            onClick={() => openMovementModalForProduct('', 'entrada', '')}
          >
            <i className="bi bi-arrow-left-right me-1"></i>Registrar Movimiento de Stock
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-primary"
            onClick={openNewCategoryModal}
          >
            <i className="bi bi-folder-plus me-1"></i>Nueva Categoría
          </button>
          <button
            type="button"
            className="btn btn-sm btn-stride"
            onClick={openNewProductModal}
          >
            <i className="bi bi-plus-circle me-1"></i>Nuevo Producto
          </button>
        </div>
      </div>

      {/* Banner de Alertas de Stock Bajo */}
      {alerts.length > 0 && (
        <div className="alert alert-warning d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4 shadow-sm">
          <div>
            <i className="bi bi-exclamation-triangle-fill me-2 fs-5"></i>
            <strong>Alerta Activa de Stock Bajo:</strong> Se detectaron{' '}
            <strong>{alerts.length} productos</strong> en o por debajo del stock mínimo configurado (
            {alerts.map((a) => `${a.name} [${a.stock} u.]`).join(', ')}).
          </div>
          <button
            type="button"
            className="btn btn-sm btn-dark"
            onClick={() => setActiveTab('alerts')}
          >
            Ver Alertas y Reponer ({alerts.length})
          </button>
        </div>
      )}

      {/* Pestañas de Navegación del Módulo */}
      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link fw-semibold ${activeTab === 'products' ? 'active' : ''}`}
            onClick={() => setActiveTab('products')}
          >
            <i className="bi bi-grid-3x3-gap me-1"></i>Productos ({products.length})
          </button>
        </li>
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link fw-semibold ${activeTab === 'alerts' ? 'active' : ''}`}
            onClick={() => setActiveTab('alerts')}
          >
            <i className="bi bi-bell-fill text-danger me-1"></i>
            Alertas de Stock Bajo
            {alerts.length > 0 && (
              <span className="badge bg-danger ms-2">{alerts.length}</span>
            )}
          </button>
        </li>
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link fw-semibold ${activeTab === 'movements' ? 'active' : ''}`}
            onClick={() => setActiveTab('movements')}
          >
            <i className="bi bi-clock-history me-1"></i>Kardex de Movimientos ({movements.length})
          </button>
        </li>
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link fw-semibold ${activeTab === 'categories' ? 'active' : ''}`}
            onClick={() => setActiveTab('categories')}
          >
            <i className="bi bi-tags me-1"></i>Categorías ({categories.length})
          </button>
        </li>
      </ul>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-warning"></div>
        </div>
      ) : activeTab === 'products' ? (
        <div className="card card-stride p-3">
          <div className="row g-2 mb-3">
            <div className="col-md-6">
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Buscar por SKU, nombre o marca..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="col-md-4">
              <select
                className="form-select form-select-sm"
                value={filterCat}
                onChange={(e) => setFilterCat(e.target.value)}
              >
                <option value="">Todas las Categorías</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0 small">
              <thead className="table-light">
                <tr>
                  <th>SKU</th>
                  <th>Producto</th>
                  <th>Categoría</th>
                  <th>Talles</th>
                  <th>Costo</th>
                  <th>Precio Venta</th>
                  <th>Stock / Mín.</th>
                  <th>Estado</th>
                  <th className="text-end">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((p) => (
                  <tr key={p.id}>
                    <td className="fw-semibold">{p.sku}</td>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <img
                          src={p.image_url}
                          alt={p.name}
                          style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6 }}
                        />
                        <div>
                          <div className="fw-bold">{p.name}</div>
                          <div className="text-secondary">{p.brand}</div>
                        </div>
                      </div>
                    </td>
                    <td>{p.category_name}</td>
                    <td>
                      <span className="text-secondary">{p.sizes}</span>
                    </td>
                    <td>{formatCurrency(p.cost)}</td>
                    <td className="fw-bold text-danger">{formatCurrency(p.price)}</td>
                    <td>
                      <span
                        className={`badge ${
                          p.stock <= 0
                            ? 'bg-danger'
                            : p.stock <= p.min_stock
                            ? 'bg-warning text-dark'
                            : 'bg-success'
                        }`}
                      >
                        {p.stock} u.
                      </span>{' '}
                      <span className="text-secondary">(mín: {p.min_stock})</span>
                    </td>
                    <td>
                      {Number(p.active) === 1 ? (
                        <span className="badge bg-success-subtle text-success">Activo</span>
                      ) : (
                        <span className="badge bg-secondary">Inactivo</span>
                      )}
                    </td>
                    <td className="text-end">
                      <div className="btn-group btn-group-sm">
                        <button
                          type="button"
                          className="btn btn-outline-success"
                          title="Registrar entrada/salida de stock"
                          onClick={() =>
                            openMovementModalForProduct(
                              p.id,
                              'entrada',
                              `Reposición de stock para ${p.name}`
                            )
                          }
                        >
                          <i className="bi bi-box-arrow-in-down"></i>
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline-primary"
                          title="Editar producto"
                          onClick={() => openEditProductModal(p)}
                        >
                          <i className="bi bi-pencil"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'alerts' ? (
        <div className="card card-stride p-3">
          <h5 className="fw-bold mb-3 text-danger">
            <i className="bi bi-exclamation-octagon-fill me-2"></i>
            Productos con Stock Crítico o Bajo (Stock Actual &le; Stock Mínimo)
          </h5>
          {alerts.length === 0 ? (
            <div className="alert alert-success mb-0">
              ¡Excelente! Todos los productos superan actualmente el umbral mínimo de stock.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table align-middle mb-0">
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Producto</th>
                    <th>Marca</th>
                    <th>Categoría</th>
                    <th>Stock Actual</th>
                    <th>Stock Mínimo</th>
                    <th className="text-end">Acción Inmediata</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.map((a) => (
                    <tr key={a.id}>
                      <td className="fw-bold">{a.sku}</td>
                      <td className="fw-semibold">{a.name}</td>
                      <td>{a.brand}</td>
                      <td>{a.category_name}</td>
                      <td>
                        <span className="badge bg-danger fs-6">{a.stock} unidades</span>
                      </td>
                      <td>{a.min_stock} unidades</td>
                      <td className="text-end">
                        <button
                          type="button"
                          className="btn btn-sm btn-success"
                          onClick={() =>
                            openMovementModalForProduct(
                              a.id,
                              'entrada',
                              `Reposición urgente por alerta de stock bajo (${a.sku})`
                            )
                          }
                        >
                          <i className="bi bi-plus-circle me-1"></i>Reponer Stock Ahora
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : activeTab === 'movements' ? (
        <div className="card card-stride p-3">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="fw-bold mb-0">Historial Auditado de Movimientos (Kardex)</h5>
            <button
              type="button"
              className="btn btn-sm btn-stride"
              onClick={() => openMovementModalForProduct('', 'entrada', '')}
            >
              Registrar Nuevo Movimiento
            </button>
          </div>
          <div className="table-responsive">
            <table className="table table-sm table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Fecha</th>
                  <th>SKU / Producto</th>
                  <th>Tipo</th>
                  <th>Cant.</th>
                  <th>Stock Ant. &rarr; Nuevo</th>
                  <th>Motivo / Operación</th>
                  <th>Responsable</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => (
                  <tr key={m.id}>
                    <td>#{m.id}</td>
                    <td className="small text-secondary">
                      {new Date(m.created_at).toLocaleString('es-AR')}
                    </td>
                    <td>
                      <strong>{m.product_sku}</strong> - {m.product_name}
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          m.type === 'entrada'
                            ? 'bg-success'
                            : m.type === 'ajuste'
                            ? 'bg-info text-dark'
                            : 'bg-warning text-dark'
                        }`}
                      >
                        {m.type.toUpperCase()}
                      </span>
                    </td>
                    <td className="fw-bold">{m.quantity}</td>
                    <td>
                      {m.previous_stock} &rarr; <strong>{m.new_stock}</strong>
                    </td>
                    <td>{m.reason}</td>
                    <td className="small">{m.user_name || 'Cliente Online'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card card-stride p-3">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="fw-bold mb-0">Categorías Deportivas</h5>
            <button
              type="button"
              className="btn btn-sm btn-stride"
              onClick={openNewCategoryModal}
            >
              Crear Categoría
            </button>
          </div>
          <div className="row g-3">
            {categories.map((c) => (
              <div className="col-md-6 col-lg-4" key={c.id}>
                <div className="p-3 border rounded-3 h-100 d-flex flex-column justify-content-between">
                  <div>
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <h6 className="fw-bold mb-0">{c.name}</h6>
                      <span className="badge bg-primary">{c.product_count} productos</span>
                    </div>
                    <p className="small text-secondary mb-2">{c.description}</p>
                  </div>
                  <div className="d-flex justify-content-end">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => openEditCategoryModal(c)}
                    >
                      <i className="bi bi-pencil me-1"></i>Editar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Alta/Edición de Producto */}
      {showProductModal && (
        <div className="modal-backdrop-custom" onClick={() => setShowProductModal(false)}>
          <div className="modal-panel-custom p-4" onClick={(e) => e.stopPropagation()}>
            <div className="d-flex justify-content-between align-items-center border-bottom pb-2 mb-3">
              <h5 className="fw-bold mb-0">
                {editingProduct ? `Editar Producto: ${editingProduct.sku}` : 'Nuevo Producto Deportivo'}
              </h5>
              <button
                type="button"
                className="btn-close"
                onClick={() => setShowProductModal(false)}
              ></button>
            </div>
            <form onSubmit={handleSaveProduct}>
              <div className="row g-2">
                <div className="col-md-4">
                  <label className="form-label small fw-semibold">Código SKU *</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    required
                    value={productForm.sku}
                    onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                  />
                </div>
                <div className="col-md-8">
                  <label className="form-label small fw-semibold">Nombre del Modelo *</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    required
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">Marca *</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    required
                    placeholder="Nike, Adidas, Puma, Jordan..."
                    value={productForm.brand}
                    onChange={(e) => setProductForm({ ...productForm, brand: e.target.value })}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">Categoría *</label>
                  <select
                    className="form-select form-select-sm"
                    value={productForm.category_id}
                    onChange={(e) =>
                      setProductForm({ ...productForm, category_id: Number(e.target.value) })
                    }
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-3">
                  <label className="form-label small fw-semibold">Costo ($ ARS)</label>
                  <input
                    type="number"
                    min="0"
                    className="form-control form-control-sm"
                    value={productForm.cost}
                    onChange={(e) => setProductForm({ ...productForm, cost: e.target.value })}
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label small fw-semibold">Precio Venta ($ ARS) *</label>
                  <input
                    type="number"
                    min="0"
                    className="form-control form-control-sm"
                    required
                    value={productForm.price}
                    onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label small fw-semibold">Stock Actual *</label>
                  <input
                    type="number"
                    min="0"
                    className="form-control form-control-sm"
                    required
                    value={productForm.stock}
                    onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label small fw-semibold">Alerta Stock Mín. *</label>
                  <input
                    type="number"
                    min="0"
                    className="form-control form-control-sm"
                    required
                    value={productForm.min_stock}
                    onChange={(e) => setProductForm({ ...productForm, min_stock: e.target.value })}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">Talles (separados por coma)</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={productForm.sizes}
                    onChange={(e) => setProductForm({ ...productForm, sizes: e.target.value })}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">Color</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={productForm.color}
                    onChange={(e) => setProductForm({ ...productForm, color: e.target.value })}
                  />
                </div>
                <div className="col-12">
                  <label className="form-label small fw-semibold">URL de Imagen</label>
                  <input
                    type="url"
                    className="form-control form-control-sm"
                    placeholder="https://images.unsplash.com/..."
                    value={productForm.image_url}
                    onChange={(e) => setProductForm({ ...productForm, image_url: e.target.value })}
                  />
                </div>
                <div className="col-12">
                  <label className="form-label small fw-semibold">Descripción técnica</label>
                  <textarea
                    className="form-control form-control-sm"
                    rows="2"
                    value={productForm.description}
                    onChange={(e) =>
                      setProductForm({ ...productForm, description: e.target.value })
                    }
                  ></textarea>
                </div>
                <div className="col-md-6">
                  <div className="form-check mt-2">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="chkFeatured"
                      checked={Boolean(productForm.featured)}
                      onChange={(e) =>
                        setProductForm({ ...productForm, featured: e.target.checked ? 1 : 0 })
                      }
                    />
                    <label className="form-check-label small fw-semibold" htmlFor="chkFeatured">
                      Destacar en portada de tienda
                    </label>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="form-check mt-2">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="chkActive"
                      checked={Boolean(productForm.active)}
                      onChange={(e) =>
                        setProductForm({ ...productForm, active: e.target.checked ? 1 : 0 })
                      }
                    />
                    <label className="form-check-label small fw-semibold" htmlFor="chkActive">
                      Producto activo en catálogo
                    </label>
                  </div>
                </div>
              </div>
              <div className="d-flex justify-content-end gap-2 mt-3 pt-2 border-top">
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => setShowProductModal(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-sm btn-stride px-4">
                  Guardar Producto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Movimiento de Inventario */}
      {showMovementModal && (
        <div className="modal-backdrop-custom" onClick={() => setShowMovementModal(false)}>
          <div
            className="modal-panel-custom p-4"
            style={{ maxWidth: 480 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="d-flex justify-content-between align-items-center border-bottom pb-2 mb-3">
              <h5 className="fw-bold mb-0">Registrar Movimiento de Stock</h5>
              <button
                type="button"
                className="btn-close"
                onClick={() => setShowMovementModal(false)}
              ></button>
            </div>
            <form onSubmit={handleSaveMovement}>
              <div className="mb-2">
                <label className="form-label small fw-semibold">Producto *</label>
                <select
                  className="form-select form-select-sm"
                  required
                  value={movementForm.product_id}
                  onChange={(e) =>
                    setMovementForm({ ...movementForm, product_id: e.target.value })
                  }
                >
                  <option value="">-- Seleccionar Producto --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.sku} - {p.name} (Stock actual: {p.stock})
                    </option>
                  ))}
                </select>
              </div>
              <div className="row g-2 mb-2">
                <div className="col-6">
                  <label className="form-label small fw-semibold">Tipo de Operación *</label>
                  <select
                    className="form-select form-select-sm"
                    value={movementForm.type}
                    onChange={(e) => setMovementForm({ ...movementForm, type: e.target.value })}
                  >
                    <option value="entrada">Entrada (Suma stock)</option>
                    <option value="salida">Salida / Baja (Resta stock)</option>
                    <option value="ajuste">Ajuste Físico (Fija nuevo stock)</option>
                  </select>
                </div>
                <div className="col-6">
                  <label className="form-label small fw-semibold">Cantidad *</label>
                  <input
                    type="number"
                    min="1"
                    className="form-control form-control-sm"
                    required
                    value={movementForm.quantity}
                    onChange={(e) => setMovementForm({ ...movementForm, quantity: e.target.value })}
                  />
                </div>
              </div>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Motivo / Comprobante *</label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  required
                  placeholder="Ej: Remito Proveedor #4052 o Baja por falla"
                  value={movementForm.reason}
                  onChange={(e) => setMovementForm({ ...movementForm, reason: e.target.value })}
                />
              </div>
              <div className="d-flex justify-content-end gap-2">
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => setShowMovementModal(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-sm btn-success">
                  Confirmar Movimiento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Categoría */}
      {showCategoryModal && (
        <div className="modal-backdrop-custom" onClick={() => setShowCategoryModal(false)}>
          <div
            className="modal-panel-custom p-4"
            style={{ maxWidth: 440 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="d-flex justify-content-between align-items-center border-bottom pb-2 mb-3">
              <h5 className="fw-bold mb-0">
                {editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
              </h5>
              <button
                type="button"
                className="btn-close"
                onClick={() => setShowCategoryModal(false)}
              ></button>
            </div>
            <form onSubmit={handleSaveCategory}>
              <div className="mb-2">
                <label className="form-label small fw-semibold">Nombre de Categoría *</label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  required
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                />
              </div>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Descripción</label>
                <textarea
                  className="form-control form-control-sm"
                  rows="2"
                  value={categoryForm.description}
                  onChange={(e) =>
                    setCategoryForm({ ...categoryForm, description: e.target.value })
                  }
                ></textarea>
              </div>
              <div className="d-flex justify-content-end gap-2">
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => setShowCategoryModal(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-sm btn-stride">
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
