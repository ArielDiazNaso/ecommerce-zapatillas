import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiFetch } from '../services/api';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('stride_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('stride_theme') || 'light';
  });

  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem('stride_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [toast, setToast] = useState(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-bs-theme', theme);
    localStorage.setItem('stride_theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('stride_cart', JSON.stringify(cart));
  }, [cart]);

  // Verificar sesión al iniciar
  useEffect(() => {
    const token = localStorage.getItem('stride_token');
    if (token) {
      apiFetch('/api/auth/me')
        .then((res) => {
          setUser(res.user);
          localStorage.setItem('stride_user', JSON.stringify(res.user));
        })
        .catch(() => {
          localStorage.removeItem('stride_token');
          localStorage.removeItem('stride_user');
          setUser(null);
        });
    }
  }, []);

  function notify(message, type = 'success') {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => {
      setToast((prev) => (prev && prev.message === message ? null : prev));
    }, 4000);
  }

  function toggleTheme() {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  }

  async function login(email, password) {
    const data = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    localStorage.setItem('stride_token', data.token);
    localStorage.setItem('stride_user', JSON.stringify(data.user));
    setUser(data.user);
    notify(`¡Bienvenido/a, ${data.user.name}!`, 'success');
    return data.user;
  }

  async function register(formData) {
    const data = await apiFetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(formData)
    });
    localStorage.setItem('stride_token', data.token);
    localStorage.setItem('stride_user', JSON.stringify(data.user));
    setUser(data.user);
    notify(`Cuenta creada exitosamente. ¡Bienvenido/a ${data.user.name}!`, 'success');
    return data.user;
  }

  function logout() {
    localStorage.removeItem('stride_token');
    localStorage.removeItem('stride_user');
    setUser(null);
    notify('Sesión cerrada correctamente.', 'info');
  }

  function addToCart(product, size = '41', qty = 1) {
    if (Number(product.stock) <= 0) {
      notify('Producto sin stock disponible.', 'danger');
      return;
    }

    setCart((prev) => {
      const key = `${product.id}-${size}`;
      const existing = prev.find((item) => item.key === key);
      if (existing) {
        const nextQty = existing.quantity + qty;
        if (nextQty > Number(product.stock)) {
          notify(`Stock máximo disponible para ${product.name}: ${product.stock} u.`, 'warning');
          return prev;
        }
        notify(`Cantidad actualizada en el carrito (${product.name} - Talle ${size}).`, 'success');
        return prev.map((item) => (item.key === key ? { ...item, quantity: nextQty } : item));
      } else {
        notify(`"${product.name}" (Talle ${size}) agregado al carrito.`, 'success');
        return [
          ...prev,
          {
            key,
            product_id: product.id,
            name: product.name,
            brand: product.brand,
            sku: product.sku,
            price: Number(product.price),
            image_url: product.image_url,
            stock: Number(product.stock),
            size,
            quantity: qty
          }
        ];
      }
    });
  }

  function updateCartQty(key, newQty) {
    if (newQty <= 0) {
      removeFromCart(key);
      return;
    }
    setCart((prev) =>
      prev.map((item) => {
        if (item.key !== key) return item;
        if (newQty > item.stock) {
          notify(`Solo hay ${item.stock} unidades disponibles en stock.`, 'warning');
          return item;
        }
        return { ...item, quantity: newQty };
      })
    );
  }

  function removeFromCart(key) {
    setCart((prev) => prev.filter((item) => item.key !== key));
  }

  function clearCart() {
    setCart([]);
  }

  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const cartTotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  return (
    <AppContext.Provider
      value={{
        user,
        setUser,
        theme,
        toggleTheme,
        login,
        register,
        logout,
        cart,
        addToCart,
        updateCartQty,
        removeFromCart,
        clearCart,
        cartCount,
        cartTotal,
        toast,
        setToast,
        notify
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
