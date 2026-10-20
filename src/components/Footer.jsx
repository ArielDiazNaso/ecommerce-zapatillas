import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="border-top py-4 mt-5 bg-body-tertiary">
      <div className="container">
        <div className="row g-3 align-items-center">
          <div className="col-md-6">
            <div className="d-flex align-items-center gap-2 mb-1">
              <span className="brand-badge">STRIDE PRO</span>
              <span className="fw-bold">Sistema de Gestión para Tienda de Deportes</span>
            </div>
            <p className="small text-secondary mb-0">
              E-Commerce de Zapatillas &bull; Punto de Venta POS &bull; Control de Inventario &bull; Ciclo de Vida de Proyectos &bull; Base de Datos Turso / MySQL.
            </p>
          </div>
          <div className="col-md-6 text-md-end small">
            <div className="d-flex flex-wrap gap-3 justify-content-md-end mb-1">
              <Link to="/" className="text-decoration-none text-secondary">
                Catálogo Online
              </Link>
              <Link to="/login" className="text-decoration-none text-secondary">
                Acceso por Roles
              </Link>
              <Link to="/feedback" className="text-decoration-none text-secondary">
                Encuesta de Retroalimentación
              </Link>
            </div>
            <div className="text-secondary">
              Proyecto Académico Integral &copy; {new Date().getFullYear()} &bull; Ariel Díaz Naso
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
