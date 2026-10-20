import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

import CatalogPage from './pages/CatalogPage';
import LoginPage from './pages/LoginPage';
import MyOrdersPage from './pages/MyOrdersPage';
import PosPage from './pages/PosPage';
import InventoryPage from './pages/InventoryPage';
import ProjectsPage from './pages/ProjectsPage';
import UsersPage from './pages/UsersPage';
import DashboardPage from './pages/DashboardPage';
import FeedbackPage from './pages/FeedbackPage';

function ProtectedRoute({ children, allowedRoles }) {
  const { user } = useApp();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function ToastContainer() {
  const { toast, setToast } = useApp();
  if (!toast) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        zIndex: 2000,
        maxWidth: 420
      }}
    >
      <div
        className={`alert alert-${toast.type} shadow-lg d-flex align-items-center justify-content-between gap-3 mb-0 py-2 px-3`}
      >
        <span>{toast.message}</span>
        <button
          type="button"
          className="btn-close btn-sm"
          onClick={() => setToast(null)}
        ></button>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <div className="d-flex flex-column min-vh-100">
          <Navbar />
          <main className="flex-grow-1">
            <Routes>
              <Route path="/" element={<CatalogPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/feedback" element={<FeedbackPage />} />
              <Route
                path="/mis-pedidos"
                element={
                  <ProtectedRoute allowedRoles={['cliente', 'empleado', 'admin']}>
                    <MyOrdersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/pos"
                element={
                  <ProtectedRoute allowedRoles={['empleado', 'admin']}>
                    <PosPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/inventario"
                element={
                  <ProtectedRoute allowedRoles={['empleado', 'admin']}>
                    <InventoryPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/proyectos"
                element={
                  <ProtectedRoute allowedRoles={['empleado', 'admin']}>
                    <ProjectsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/usuarios"
                element={
                  <ProtectedRoute allowedRoles={['empleado', 'admin']}>
                    <UsersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={['empleado', 'admin']}>
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <Footer />
          <ToastContainer />
        </div>
      </BrowserRouter>
    </AppProvider>
  );
}
