import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch, formatCurrency } from '../services/api';
import { useApp } from '../context/AppContext';

export default function CatalogPage() {
  const { addToCart } = useApp();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedCategory, setSelectedCategory] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('featured');
  const [onlyAvailable, setOnlyAvailable] = useState(false);

  const [selectedSizes, setSelectedSizes] = useState({});
  const [detailProduct, setDetailProduct] = useState(null);

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    try {
      const [prodData, catData] = await Promise.all([
        apiFetch('/api/inventory/products'),
        apiFetch('/api/inventory/categories')
      ]);
      setProducts(prodData.products || []);
      setCategories(catData.categories || []);

      const initialSizes = {};
      for (const p of prodData.products || []) {
        const sList = (p.sizes || '40').split(',').map((s) => s.trim());
        initialSizes[p.id] = sList[Math.floor(sList.length / 2)] || sList[0];
      }
      setSelectedSizes((prev) => ({ ...initialSizes, ...prev }));
    } catch (err) {
      console.error('Error cargando catálogo:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCatalog();
    const handler = () => loadCatalog();
    window.addEventListener('products-updated', handler);
    return () => window.removeEventListener('products-updated', handler);
  }, [loadCatalog]);

  const filteredProducts = products
    .filter((p) => {
      if (selectedCategory && Number(p.category_id) !== Number(selectedCategory)) return false;
      if (onlyAvailable && Number(p.stock) <= 0) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const match =
          p.name.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          (p.description || '').toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'price_asc') return a.price - b.price;
      if (sortBy === 'price_desc') return b.price - a.price;
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return Number(b.featured) - Number(a.featured);
    });

  return (
    <div className="container py-4">
      {/* Banner Principal */}
      <div className="hero-banner p-4 p-md-5 mb-4 shadow-sm">
        <div className="row align-items-center g-4">
          <div className="col-lg-8">
            <span className="badge bg-warning text-dark fw-bold mb-2 px-3 py-2">
              TEMPORADA OFICIAL 2026 • ENVÍOS A TODO EL PAÍS
            </span>
            <h1 className="display-6 fw-bold mb-2">
              Superá tus límites con el mejor calzado deportivo
            </h1>
            <p className="lead text-light opacity-75 mb-3">
              Catálogo sincronizado en tiempo real con nuestro depósito central y sucursal POS.
              Running, Basketball, CrossFit, Fútbol y Urban Sneakers.
            </p>
            <div className="d-flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-stride px-4 py-2"
                onClick={() => {
                  setSelectedCategory('');
                  setSearch('');
                  document.getElementById('catalogo-grid')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                <i className="bi bi-lightning-charge-fill me-1"></i>Ver Colección Completa
              </button>
              <button
                type="button"
                className="btn btn-outline-light px-3 py-2"
                onClick={() => {
                  const runningCat = categories.find((c) =>
                    c.name.toLowerCase().includes('running')
                  );
                  if (runningCat) setSelectedCategory(runningCat.id);
                }}
              >
                Especial Running & Maratón
              </button>
            </div>
          </div>
          <div className="col-lg-4 d-none d-lg-block text-center">
            <div className="p-3 rounded-4 bg-white bg-opacity-10 border border-light border-opacity-25">
              <div className="row g-2 text-center">
                <div className="col-6">
                  <div className="fs-3 fw-bold text-warning">{products.length}</div>
                  <div className="small text-light opacity-75">Modelos Activos</div>
                </div>
                <div className="col-6">
                  <div className="fs-3 fw-bold text-info">100%</div>
                  <div className="small text-light opacity-75">Stock en Tiempo Real</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros y Buscador */}
      <div className="card card-stride p-3 mb-4" id="catalogo-grid">
        <div className="row g-2 align-items-center">
          <div className="col-md-4">
            <div className="input-group">
              <span className="input-group-text">
                <i className="bi bi-search"></i>
              </span>
              <input
                type="text"
                className="form-control"
                placeholder="Buscar por modelo, marca (Nike, Adidas...) o SKU"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setSearch('')}
                >
                  <i className="bi bi-x-lg"></i>
                </button>
              )}
            </div>
          </div>

          <div className="col-sm-6 col-md-3">
            <select
              className="form-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">Todas las Categorías</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name} ({cat.product_count})
                </option>
              ))}
            </select>
          </div>

          <div className="col-sm-6 col-md-3">
            <select
              className="form-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="featured">Ordenar: Destacados primero</option>
              <option value="price_asc">Precio: Menor a Mayor</option>
              <option value="price_desc">Precio: Mayor a Menor</option>
              <option value="name">Nombre (A-Z)</option>
            </select>
          </div>

          <div className="col-md-2 d-flex align-items-center justify-content-md-end">
            <div className="form-check form-switch mb-0">
              <input
                className="form-check-input"
                type="checkbox"
                id="switchStock"
                checked={onlyAvailable}
                onChange={(e) => setOnlyAvailable(e.target.checked)}
              />
              <label className="form-check-label small fw-semibold" htmlFor="switchStock">
                Con stock
              </label>
            </div>
          </div>
        </div>

        {/* Píldoras rápidas de categorías */}
        <div className="d-flex flex-wrap gap-2 mt-3 pt-2 border-top">
          <button
            type="button"
            className={`btn btn-sm rounded-pill ${
              selectedCategory === '' ? 'btn-dark' : 'btn-outline-secondary'
            }`}
            onClick={() => setSelectedCategory('')}
          >
            Todos ({products.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={`btn btn-sm rounded-pill ${
                Number(selectedCategory) === Number(cat.id) ? 'btn-stride' : 'btn-outline-secondary'
              }`}
              onClick={() =>
                setSelectedCategory(Number(selectedCategory) === Number(cat.id) ? '' : cat.id)
              }
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Grilla de Productos */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-danger" role="status"></div>
          <p className="mt-2 text-secondary">Cargando catálogo deportivo desde Turso...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="card card-stride p-5 text-center">
          <i className="bi bi-search display-5 text-secondary"></i>
          <h5 className="mt-3">No se encontraron productos con esos filtros</h5>
          <p className="text-secondary mb-3">
            Probá limpiando la búsqueda o seleccionando otra categoría deportiva.
          </p>
          <div>
            <button
              type="button"
              className="btn btn-stride"
              onClick={() => {
                setSelectedCategory('');
                setSearch('');
                setOnlyAvailable(false);
              }}
            >
              Restablecer Filtros
            </button>
          </div>
        </div>
      ) : (
        <div className="row g-4">
          {filteredProducts.map((product) => {
            const sizeList = (product.sizes || '40')
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean);
            const currentSize = selectedSizes[product.id] || sizeList[0] || '41';
            const outOfStock = product.stock <= 0;

            return (
              <div className="col-sm-6 col-lg-4" key={product.id}>
                <div className="card card-stride h-100 d-flex flex-column">
                  <div
                    className="product-img-wrapper"
                    style={{ cursor: 'pointer' }}
                    onClick={() => setDetailProduct(product)}
                  >
                    <img src={product.image_url} alt={product.name} loading="lazy" />
                    <div className="position-absolute top-0 start-0 p-2 d-flex flex-wrap gap-1">
                      <span className="badge bg-dark bg-opacity-75">{product.brand}</span>
                      {Number(product.featured) === 1 && (
                        <span className="badge bg-warning text-dark">
                          <i className="bi bi-star-fill me-1"></i>Destacado
                        </span>
                      )}
                    </div>
                    <div className="position-absolute top-0 end-0 p-2">
                      {outOfStock ? (
                        <span className="badge bg-danger">Agotado</span>
                      ) : product.is_low_stock ? (
                        <span className="badge bg-warning text-dark">
                          ¡Últimas {product.stock} u.!
                        </span>
                      ) : (
                        <span className="badge bg-success">{product.stock} en stock</span>
                      )}
                    </div>
                  </div>

                  <div className="card-body d-flex flex-column flex-grow-1">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <span className="small text-secondary fw-semibold">
                        {product.category_name}
                      </span>
                      <span className="badge bg-body-secondary text-body-secondary">
                        {product.sku}
                      </span>
                    </div>

                    <h5
                      className="card-title fw-bold mb-1"
                      style={{ cursor: 'pointer' }}
                      onClick={() => setDetailProduct(product)}
                    >
                      {product.name}
                    </h5>
                    <p className="small text-secondary mb-3 flex-grow-1">
                      {product.description?.slice(0, 95)}
                      {product.description?.length > 95 ? '...' : ''}
                    </p>

                    <div className="mb-3">
                      <div className="small fw-semibold mb-1">Seleccionar Talle:</div>
                      <div className="d-flex flex-wrap gap-1">
                        {sizeList.map((sz) => (
                          <span
                            key={sz}
                            className={`size-pill ${currentSize === sz ? 'active' : ''}`}
                            onClick={() =>
                              setSelectedSizes({ ...selectedSizes, [product.id]: sz })
                            }
                          >
                            {sz}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="d-flex justify-content-between align-items-center pt-2 border-top mt-auto">
                      <div>
                        <div className="small text-secondary">Precio Contado / Lista</div>
                        <div className="fs-5 fw-bold text-danger">
                          {formatCurrency(product.price)}
                        </div>
                      </div>
                      <div className="d-flex gap-1">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary"
                          title="Ver ficha técnica"
                          onClick={() => setDetailProduct(product)}
                        >
                          <i className="bi bi-eye"></i>
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-stride px-3"
                          disabled={outOfStock}
                          onClick={() => addToCart(product, currentSize, 1)}
                        >
                          <i className="bi bi-cart-plus me-1"></i>
                          {outOfStock ? 'Sin Stock' : 'Agregar'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Ficha Técnica del Producto */}
      {detailProduct && (
        <div className="modal-backdrop-custom" onClick={() => setDetailProduct(null)}>
          <div className="modal-panel-custom p-4" onClick={(e) => e.stopPropagation()}>
            <div className="d-flex justify-content-between align-items-start border-bottom pb-3 mb-3">
              <div>
                <span className="badge bg-danger me-2">{detailProduct.brand}</span>
                <span className="text-secondary small">{detailProduct.sku}</span>
                <h4 className="fw-bold mb-0 mt-1">{detailProduct.name}</h4>
              </div>
              <button
                type="button"
                className="btn-close"
                onClick={() => setDetailProduct(null)}
              ></button>
            </div>

            <div className="row g-4 align-items-center">
              <div className="col-md-5">
                <img
                  src={detailProduct.image_url}
                  alt={detailProduct.name}
                  className="img-fluid rounded-4 shadow-sm"
                />
              </div>
              <div className="col-md-7">
                <p className="mb-3">{detailProduct.description}</p>
                <div className="row g-2 mb-3 small">
                  <div className="col-6">
                    <div className="p-2 rounded bg-body-tertiary">
                      <strong>Categoría:</strong> {detailProduct.category_name}
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="p-2 rounded bg-body-tertiary">
                      <strong>Color:</strong> {detailProduct.color}
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="p-2 rounded bg-body-tertiary">
                      <strong>Stock Disponible:</strong> {detailProduct.stock} unidades
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="p-2 rounded bg-body-tertiary">
                      <strong>Talles:</strong> {detailProduct.sizes}
                    </div>
                  </div>
                </div>

                <div className="d-flex justify-content-between align-items-center pt-3 border-top">
                  <div className="fs-3 fw-bold text-danger">
                    {formatCurrency(detailProduct.price)}
                  </div>
                  <button
                    type="button"
                    className="btn btn-stride px-4"
                    disabled={detailProduct.stock <= 0}
                    onClick={() => {
                      const sz =
                        selectedSizes[detailProduct.id] ||
                        (detailProduct.sizes || '41').split(',')[0].trim();
                      addToCart(detailProduct, sz, 1);
                      setDetailProduct(null);
                    }}
                  >
                    <i className="bi bi-cart-plus me-2"></i>Agregar al Carrito
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
