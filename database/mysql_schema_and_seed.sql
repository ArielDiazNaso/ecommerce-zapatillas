-- =============================================================================
-- SISTEMA DE GESTIÓN PARA UNA TIENDA DE DEPORTES Y E-COMMERCE DE ZAPATILLAS
-- Script de Base de Datos MySQL (Compatible con XAMPP / MariaDB / MySQL 8+)
-- Incluye creación de tablas, claves foráneas, índices, transacciones y datos demo
-- =============================================================================

CREATE DATABASE IF NOT EXISTS tienda_deportes_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE tienda_deportes_db;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS feedback;
DROP TABLE IF EXISTS project_tasks;
DROP TABLE IF EXISTS project_phases;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS inventory_movements;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;

-- -----------------------------------------------------------------------------
-- 1. TABLA DE USUARIOS (Administradores, Empleados y Clientes)
-- -----------------------------------------------------------------------------
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'empleado', 'cliente') NOT NULL DEFAULT 'cliente',
  phone VARCHAR(40) DEFAULT '',
  dni VARCHAR(30) DEFAULT '',
  address VARCHAR(255) DEFAULT '',
  department VARCHAR(100) DEFAULT '',
  hire_date DATE NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 2. TABLA DE CATEGORÍAS DE PRODUCTOS
-- -----------------------------------------------------------------------------
CREATE TABLE categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description VARCHAR(255) DEFAULT '',
  slug VARCHAR(120) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 3. TABLA DE PRODUCTOS (Zapatillas e Indumentaria Deportiva)
-- -----------------------------------------------------------------------------
CREATE TABLE products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sku VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(160) NOT NULL,
  brand VARCHAR(80) NOT NULL,
  category_id INT NOT NULL,
  description TEXT,
  price DECIMAL(12, 2) NOT NULL CHECK (price >= 0),
  cost DECIMAL(12, 2) NOT NULL DEFAULT 0 CHECK (cost >= 0),
  stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
  min_stock INT NOT NULL DEFAULT 5 CHECK (min_stock >= 0),
  sizes VARCHAR(120) DEFAULT '38,39,40,41,42,43,44',
  color VARCHAR(60) DEFAULT 'Negro/Blanco',
  image_url VARCHAR(500) DEFAULT '',
  featured TINYINT(1) NOT NULL DEFAULT 0,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 4. TABLA DE MOVIMIENTOS DE INVENTARIO (Kardex / Auditoría de Stock)
-- -----------------------------------------------------------------------------
CREATE TABLE inventory_movements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  user_id INT NULL,
  type ENUM('entrada', 'salida', 'ajuste', 'venta_pos', 'venta_online') NOT NULL,
  quantity INT NOT NULL,
  previous_stock INT NOT NULL,
  new_stock INT NOT NULL,
  reason VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_movements_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT fk_movements_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 5. TABLA DE VENTAS Y PEDIDOS (POS Presencial + E-Commerce Online)
-- -----------------------------------------------------------------------------
CREATE TABLE orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_number VARCHAR(40) NOT NULL UNIQUE,
  user_id INT NULL,
  seller_id INT NULL,
  customer_name VARCHAR(120) NOT NULL,
  customer_email VARCHAR(150) DEFAULT '',
  customer_phone VARCHAR(40) DEFAULT '',
  customer_dni VARCHAR(30) DEFAULT '',
  shipping_address VARCHAR(255) DEFAULT '',
  channel ENUM('online', 'pos') NOT NULL DEFAULT 'online',
  payment_method VARCHAR(50) NOT NULL DEFAULT 'reserva_sin_cobro',
  status ENUM('pendiente', 'confirmado', 'en_preparacion', 'enviado', 'entregado', 'completado', 'cancelado') NOT NULL DEFAULT 'pendiente',
  subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
  discount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  total DECIMAL(12, 2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_orders_seller FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 6. DETALLE DE VENTAS Y PEDIDOS
-- -----------------------------------------------------------------------------
CREATE TABLE order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  product_name VARCHAR(160) NOT NULL,
  size VARCHAR(20) DEFAULT '41',
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(12, 2) NOT NULL,
  subtotal DECIMAL(12, 2) NOT NULL,
  CONSTRAINT fk_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_items_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 7. GESTIÓN DE PROYECTOS INTERNOS DE LA TIENDA
-- -----------------------------------------------------------------------------
CREATE TABLE projects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  description TEXT,
  category VARCHAR(80) DEFAULT 'Operaciones',
  manager_id INT NULL,
  status ENUM('planificacion', 'en_progreso', 'en_revision', 'completado', 'pausado') NOT NULL DEFAULT 'planificacion',
  priority ENUM('alta', 'media', 'baja') NOT NULL DEFAULT 'media',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  budget DECIMAL(12, 2) DEFAULT 0,
  progress INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_projects_manager FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 8. FASES DE PROYECTOS (Ciclo de Vida: Inicio, Planificación, Ejecución, etc.)
-- -----------------------------------------------------------------------------
CREATE TABLE project_phases (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  name VARCHAR(120) NOT NULL,
  description VARCHAR(255) DEFAULT '',
  order_index INT NOT NULL DEFAULT 1,
  status ENUM('pendiente', 'en_progreso', 'completada') NOT NULL DEFAULT 'pendiente',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_phases_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 9. TAREAS DE PROYECTOS Y ASIGNACIÓN DE RESPONSABLES
-- -----------------------------------------------------------------------------
CREATE TABLE project_tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  phase_id INT NOT NULL,
  title VARCHAR(160) NOT NULL,
  description TEXT,
  assigned_to INT NULL,
  status ENUM('pendiente', 'en_progreso', 'en_revision', 'completada') NOT NULL DEFAULT 'pendiente',
  priority ENUM('alta', 'media', 'baja') NOT NULL DEFAULT 'media',
  due_date DATE NULL,
  completed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_tasks_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_tasks_phase FOREIGN KEY (phase_id) REFERENCES project_phases(id) ON DELETE CASCADE,
  CONSTRAINT fk_tasks_assigned FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 10. RETROALIMENTACIÓN DE USUARIOS (Formulario de Evaluación Real)
-- -----------------------------------------------------------------------------
CREATE TABLE feedback (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  user_name VARCHAR(120) NOT NULL,
  role VARCHAR(40) DEFAULT 'cliente',
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  module_evaluated VARCHAR(80) NOT NULL,
  usability_score INT NOT NULL CHECK (usability_score BETWEEN 1 AND 5),
  speed_score INT NOT NULL CHECK (speed_score BETWEEN 1 AND 5),
  design_score INT NOT NULL CHECK (design_score BETWEEN 1 AND 5),
  comments TEXT,
  suggestions TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_feedback_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- =============================================================================
-- DATOS DE DEMOSTRACIÓN (SEED DATA)
-- Contraseñas de prueba (hash bcrypt para 'Admin123!', 'Empleado123!', 'Cliente123!')
-- =============================================================================
START TRANSACTION;

INSERT INTO users (id, name, email, password_hash, role, phone, dni, address, department, hire_date, active) VALUES
(1, 'Ariel Díaz (Administrador)', 'admin@zapatillas.com', '$2a$10$wK1xN8kU9J0Q2P1zV5vGe.7vR8xY1L9m3N4p5Q6r7S8t9U0v1W2x3', 'admin', '+54 11 4555-0100', '35111222', 'Av. Santa Fe 3200, CABA', 'Dirección General', '2024-01-15', 1),
(2, 'Lucas Tagliaferro (Ventas & POS)', 'empleado@zapatillas.com', '$2a$10$wK1xN8kU9J0Q2P1zV5vGe.7vR8xY1L9m3N4p5Q6r7S8t9U0v1W2x3', 'empleado', '+54 11 4555-0102', '38444555', 'Av. Cabildo 1850, CABA', 'Ventas y Depósito', '2024-03-10', 1),
(3, 'Sofía Martínez (Logística)', 'sofia@zapatillas.com', '$2a$10$wK1xN8kU9J0Q2P1zV5vGe.7vR8xY1L9m3N4p5Q6r7S8t9U0v1W2x3', 'empleado', '+54 11 4555-0103', '40222333', 'Av. Corrientes 4100, CABA', 'Inventario y E-Commerce', '2024-06-01', 1),
(4, 'Martín Gómez (Cliente)', 'cliente@zapatillas.com', '$2a$10$wK1xN8kU9J0Q2P1zV5vGe.7vR8xY1L9m3N4p5Q6r7S8t9U0v1W2x3', 'cliente', '+54 11 6777-8899', '41999888', 'Calle Mendoza 2410, Belgrano', '', NULL, 1),
(5, 'Valentina Rossi (Cliente)', 'valentina@gmail.com', '$2a$10$wK1xN8kU9J0Q2P1zV5vGe.7vR8xY1L9m3N4p5Q6r7S8t9U0v1W2x3', 'cliente', '+54 11 5444-3322', '42888777', 'Av. Libertador 5100, Palermo', '', NULL, 1);

INSERT INTO categories (id, name, description, slug) VALUES
(1, 'Running & Maratón', 'Zapatillas de alto rendimiento con amortiguación reactiva para asfalto y pista.', 'running-maraton'),
(2, 'Basketball & Court', 'Calzado de soporte alto y tracción multidireccional para cancha cubierta y outdoor.', 'basketball-court'),
(3, 'Training & CrossFit', 'Estabilidad de talón y agarre superior para levantamiento y entrenamientos HIIT.', 'training-crossfit'),
(4, 'Fútbol & Botines', 'Botines para césped natural, sintético y futsal con control de precisión.', 'futbol-botines'),
(5, 'Urban & Lifestyle', 'Sneakers clásicos y ediciones urbanas de uso diario inspiradas en el deporte.', 'urban-lifestyle'),
(6, 'Accesorios Deportivos', 'Medias técnicas, mochilas deportivas, plantillas ortopédicas y cuidado de calzado.', 'accesorios-deportivos');

INSERT INTO products (id, sku, name, brand, category_id, description, price, cost, stock, min_stock, sizes, color, image_url, featured, active) VALUES
(1, 'ZAP-RUN-001', 'Nike Air Zoom Pegasus 41', 'Nike', 1, 'Zapatillas de running con doble unidad Air Zoom y espuma ReactX para máxima absorción de impacto.', 165000.00, 98000.00, 18, 5, '38,39,40,41,42,43,44', 'Volt / Negro', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80', 1, 1),
(2, 'ZAP-RUN-002', 'Adidas Ultraboost Light Pro', 'Adidas', 1, 'Retorno de energía épico con cápsulas Boost ultraligeras y suela Continental de alta adherencia.', 182000.00, 110000.00, 12, 5, '39,40,41,42,43', 'Blanco / Coral', 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&w=800&q=80', 1, 1),
(3, 'ZAP-BSK-003', 'Jordan Tatum 2 Vortex', 'Jordan', 2, 'Diseño ligero de básquetbol con estructura de espuma envolvente y tracción en espiga.', 195000.00, 120000.00, 4, 6, '40,41,42,43,44,45', 'Rojo Carmesí / Negro', 'https://images.unsplash.com/photo-1579338559194-a162d19bf842?auto=format&fit=crop&w=800&q=80', 1, 1),
(4, 'ZAP-TRN-004', 'Nike Metcon 9 AMP', 'Nike', 3, 'Placa Hyperlift ampliada en el talón y revestimiento de goma para cuerda de entrenamiento.', 158000.00, 92000.00, 15, 5, '38,39,40,41,42,43', 'Gris Grafito / Lima', 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=800&q=80', 0, 1),
(5, 'ZAP-FUT-005', 'Puma Future 7 Ultimate FG', 'Puma', 4, 'Botines con tecnología FUZIONFIT360 y suela Dynamic Motion System para cambios de ritmo explosivos.', 149000.00, 89000.00, 3, 5, '39,40,41,42,43', 'Azul Eléctrico', 'https://images.unsplash.com/photo-1511886929837-354d827aae26?auto=format&fit=crop&w=800&q=80', 1, 1),
(6, 'ZAP-URB-006', 'New Balance 550 Retro Court', 'New Balance', 5, 'Silueta clásica del básquet de los 80 en cuero premium microperforado para estilo urbano.', 142000.00, 84000.00, 22, 6, '37,38,39,40,41,42,43', 'Blanco / Verde Bosque', 'https://images.unsplash.com/photo-1539185441755-769473a23570?auto=format&fit=crop&w=800&q=80', 1, 1),
(7, 'ZAP-RUN-007', 'Asics Gel-Kayano 30 Stability', 'Asics', 1, 'Soporte adaptativo 4D Guidance System y tecnología PureGEL en el talón para fondos largos.', 176000.00, 105000.00, 2, 5, '40,41,42,43,44', 'Azul Marino / Plata', 'https://images.unsplash.com/photo-1551107696-a4b0c5a0d9a2?auto=format&fit=crop&w=800&q=80', 0, 1),
(8, 'ZAP-URB-008', 'Vans Knu Skool Suede Black', 'Vans', 5, 'Zapatilla urbana de gamuza resistente con lengüeta acolchada y banda lateral 3D.', 115000.00, 68000.00, 14, 5, '36,37,38,39,40,41,42', 'Negro / Blanco', 'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&w=800&q=80', 0, 1),
(9, 'ACC-DEP-009', 'Pack x3 Medias Compresión Running Pro', 'Nike', 6, 'Tejido Dri-FIT transpirable con soporte de arco plantar y refuerzo anatómico.', 24500.00, 11000.00, 35, 10, 'S,M,L', 'Negro / Blanco', 'https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?auto=format&fit=crop&w=800&q=80', 0, 1);

COMMIT;
