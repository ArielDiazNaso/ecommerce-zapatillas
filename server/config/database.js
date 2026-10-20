const { createClient } = require('@libsql/client');
const bcrypt = require('bcryptjs');
const ENV = require('./env');

/**
 * Cliente de conexión a Turso (libSQL / SQLite distribuido en la nube).
 */
const db = createClient({
  url: ENV.TURSO_DATABASE_URL,
  authToken: ENV.TURSO_AUTH_TOKEN
});

let isInitialized = false;
let initPromise = null;

/**
 * Ejecuta una consulta SQL y normaliza los resultados a objetos planos de JS.
 */
async function query(sql, args = []) {
  const result = await db.execute({ sql, args });
  return {
    rows: result.rows.map((row) => ({ ...row })),
    rowsAffected: result.rowsAffected,
    lastInsertRowid: result.lastInsertRowid !== undefined ? Number(result.lastInsertRowid) : null
  };
}

/**
 * Inicializa el esquema de base de datos en Turso y carga los datos iniciales de demostración
 * si la base de datos se encuentra vacía.
 */
async function initDatabase() {
  if (isInitialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      await db.batch(
        [
          `CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'cliente',
            phone TEXT DEFAULT '',
            dni TEXT DEFAULT '',
            address TEXT DEFAULT '',
            department TEXT DEFAULT '',
            hire_date TEXT DEFAULT NULL,
            active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now'))
          )`,
          `CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            description TEXT DEFAULT '',
            slug TEXT NOT NULL UNIQUE,
            created_at TEXT DEFAULT (datetime('now'))
          )`,
          `CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sku TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            brand TEXT NOT NULL,
            category_id INTEGER NOT NULL,
            description TEXT DEFAULT '',
            price REAL NOT NULL DEFAULT 0,
            cost REAL NOT NULL DEFAULT 0,
            stock INTEGER NOT NULL DEFAULT 0,
            min_stock INTEGER NOT NULL DEFAULT 5,
            sizes TEXT DEFAULT '38,39,40,41,42,43,44',
            color TEXT DEFAULT 'Negro/Blanco',
            image_url TEXT DEFAULT '',
            featured INTEGER NOT NULL DEFAULT 0,
            active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (category_id) REFERENCES categories(id)
          )`,
          `CREATE TABLE IF NOT EXISTS inventory_movements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER NOT NULL,
            user_id INTEGER DEFAULT NULL,
            type TEXT NOT NULL,
            quantity INTEGER NOT NULL,
            previous_stock INTEGER NOT NULL,
            new_stock INTEGER NOT NULL,
            reason TEXT NOT NULL,
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (product_id) REFERENCES products(id),
            FOREIGN KEY (user_id) REFERENCES users(id)
          )`,
          `CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_number TEXT NOT NULL UNIQUE,
            user_id INTEGER DEFAULT NULL,
            seller_id INTEGER DEFAULT NULL,
            customer_name TEXT NOT NULL,
            customer_email TEXT DEFAULT '',
            customer_phone TEXT DEFAULT '',
            customer_dni TEXT DEFAULT '',
            shipping_address TEXT DEFAULT '',
            channel TEXT NOT NULL DEFAULT 'online',
            payment_method TEXT NOT NULL DEFAULT 'reserva_sin_cobro',
            status TEXT NOT NULL DEFAULT 'pendiente',
            subtotal REAL NOT NULL DEFAULT 0,
            discount REAL NOT NULL DEFAULT 0,
            total REAL NOT NULL DEFAULT 0,
            notes TEXT DEFAULT '',
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (seller_id) REFERENCES users(id)
          )`,
          `CREATE TABLE IF NOT EXISTS order_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER NOT NULL,
            product_id INTEGER NOT NULL,
            product_name TEXT NOT NULL,
            size TEXT DEFAULT '41',
            quantity INTEGER NOT NULL,
            unit_price REAL NOT NULL,
            subtotal REAL NOT NULL,
            FOREIGN KEY (order_id) REFERENCES orders(id),
            FOREIGN KEY (product_id) REFERENCES products(id)
          )`,
          `CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT DEFAULT '',
            category TEXT DEFAULT 'Operaciones',
            manager_id INTEGER DEFAULT NULL,
            status TEXT NOT NULL DEFAULT 'en_progreso',
            priority TEXT NOT NULL DEFAULT 'media',
            start_date TEXT NOT NULL,
            end_date TEXT NOT NULL,
            budget REAL DEFAULT 0,
            progress INTEGER NOT NULL DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (manager_id) REFERENCES users(id)
          )`,
          `CREATE TABLE IF NOT EXISTS project_phases (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            description TEXT DEFAULT '',
            order_index INTEGER NOT NULL DEFAULT 1,
            status TEXT NOT NULL DEFAULT 'pendiente',
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (project_id) REFERENCES projects(id)
          )`,
          `CREATE TABLE IF NOT EXISTS project_tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            phase_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            description TEXT DEFAULT '',
            assigned_to INTEGER DEFAULT NULL,
            status TEXT NOT NULL DEFAULT 'pendiente',
            priority TEXT NOT NULL DEFAULT 'media',
            due_date TEXT DEFAULT NULL,
            completed_at TEXT DEFAULT NULL,
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (project_id) REFERENCES projects(id),
            FOREIGN KEY (phase_id) REFERENCES project_phases(id),
            FOREIGN KEY (assigned_to) REFERENCES users(id)
          )`,
          `CREATE TABLE IF NOT EXISTS feedback (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER DEFAULT NULL,
            user_name TEXT NOT NULL,
            role TEXT DEFAULT 'cliente',
            rating INTEGER NOT NULL,
            module_evaluated TEXT NOT NULL,
            usability_score INTEGER NOT NULL,
            speed_score INTEGER NOT NULL,
            design_score INTEGER NOT NULL,
            comments TEXT DEFAULT '',
            suggestions TEXT DEFAULT '',
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id)
          )`
        ],
        'write'
      );

      // Verificar si existen usuarios cargados
      const existingUsers = await query('SELECT COUNT(*) as total FROM users');
      if (Number(existingUsers.rows[0].total) === 0) {
        await seedDatabase();
      }

      isInitialized = true;
    } catch (error) {
      initPromise = null;
      throw error;
    }
  })();

  return initPromise;
}

/**
 * Carga inicial de datos de demostración para la tienda de deportes y zapatillas.
 */
async function seedDatabase() {
  const adminPass = await bcrypt.hash('Admin123!', 10);
  const empPass = await bcrypt.hash('Empleado123!', 10);
  const clientPass = await bcrypt.hash('Cliente123!', 10);

  await db.batch(
    [
      // 1. Usuarios
      {
        sql: `INSERT INTO users (id, name, email, password_hash, role, phone, dni, address, department, hire_date, active)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        args: [1, 'Ariel Díaz (Administrador)', 'admin@zapatillas.com', adminPass, 'admin', '+54 11 4555-0100', '35111222', 'Av. Santa Fe 3200, CABA', 'Dirección General', '2024-01-15']
      },
      {
        sql: `INSERT INTO users (id, name, email, password_hash, role, phone, dni, address, department, hire_date, active)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        args: [2, 'Lucas Tagliaferro (Ventas & POS)', 'empleado@zapatillas.com', empPass, 'empleado', '+54 11 4555-0102', '38444555', 'Av. Cabildo 1850, CABA', 'Ventas y Salón POS', '2024-03-10']
      },
      {
        sql: `INSERT INTO users (id, name, email, password_hash, role, phone, dni, address, department, hire_date, active)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        args: [3, 'Sofía Martínez (Logística & Stock)', 'sofia@zapatillas.com', empPass, 'empleado', '+54 11 4555-0103', '40222333', 'Av. Corrientes 4100, CABA', 'Inventario y E-Commerce', '2024-06-01']
      },
      {
        sql: `INSERT INTO users (id, name, email, password_hash, role, phone, dni, address, department, hire_date, active)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        args: [4, 'Martín Gómez', 'cliente@zapatillas.com', clientPass, 'cliente', '+54 11 6777-8899', '41999888', 'Calle Mendoza 2410, Belgrano, CABA', '', null]
      },
      {
        sql: `INSERT INTO users (id, name, email, password_hash, role, phone, dni, address, department, hire_date, active)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        args: [5, 'Valentina Rossi', 'valentina@gmail.com', clientPass, 'cliente', '+54 11 5444-3322', '42888777', 'Av. del Libertador 5100, Palermo, CABA', '', null]
      },

      // 2. Categorías
      {
        sql: `INSERT INTO categories (id, name, description, slug) VALUES (?, ?, ?, ?)`,
        args: [1, 'Running & Maratón', 'Zapatillas de alto rendimiento con amortiguación reactiva para asfalto, pista y maratón.', 'running-maraton']
      },
      {
        sql: `INSERT INTO categories (id, name, description, slug) VALUES (?, ?, ?, ?)`,
        args: [2, 'Basketball & Court', 'Calzado de soporte alto y tracción multidireccional para parquet y cancha exterior.', 'basketball-court']
      },
      {
        sql: `INSERT INTO categories (id, name, description, slug) VALUES (?, ?, ?, ?)`,
        args: [3, 'Training & CrossFit', 'Estabilidad de talón y agarre superior para levantamiento olímpico y entrenamientos HIIT.', 'training-crossfit']
      },
      {
        sql: `INSERT INTO categories (id, name, description, slug) VALUES (?, ?, ?, ?)`,
        args: [4, 'Fútbol & Botines', 'Botines para césped natural, sintético y futsal con control de precisión.', 'futbol-botines']
      },
      {
        sql: `INSERT INTO categories (id, name, description, slug) VALUES (?, ?, ?, ?)`,
        args: [5, 'Urban & Lifestyle Sneakers', 'Siluetas icónicas y ediciones urbanas de uso diario inspiradas en el deporte.', 'urban-lifestyle']
      },
      {
        sql: `INSERT INTO categories (id, name, description, slug) VALUES (?, ?, ?, ?)`,
        args: [6, 'Accesorios Deportivos', 'Medias técnicas de compresión, bolsos deportivos y cuidado especializado de calzado.', 'accesorios-deportivos']
      },

      // 3. Productos
      {
        sql: `INSERT INTO products (id, sku, name, brand, category_id, description, price, cost, stock, min_stock, sizes, color, image_url, featured, active)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        args: [
          1,
          'ZAP-RUN-001',
          'Nike Air Zoom Pegasus 41',
          'Nike',
          1,
          'Zapatillas de running con doble unidad Air Zoom y entresuela de espuma ReactX que ofrece un 13% más de retorno de energía en cada zancada.',
          165000,
          98000,
          18,
          5,
          '38,39,40,41,42,43,44',
          'Volt / Negro',
          'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80',
          1
        ]
      },
      {
        sql: `INSERT INTO products (id, sku, name, brand, category_id, description, price, cost, stock, min_stock, sizes, color, image_url, featured, active)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        args: [
          2,
          'ZAP-RUN-002',
          'Adidas Ultraboost Light Pro',
          'Adidas',
          1,
          'Amortiguación Boost ultraligera con exterior Primeknit+ transpirable y suela de caucho Continental para agarre total en seco y mojado.',
          182000,
          110000,
          12,
          5,
          '39,40,41,42,43',
          'Blanco / Coral',
          'https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&w=800&q=80',
          1
        ]
      },
      {
        sql: `INSERT INTO products (id, sku, name, brand, category_id, description, price, cost, stock, min_stock, sizes, color, image_url, featured, active)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        args: [
          3,
          'ZAP-BSK-003',
          'Jordan Tatum 2 Vortex Court',
          'Jordan',
          2,
          'Calzado de básquetbol de alto soporte con estructura envolvente de espuma Phylon y unidad Zoom Air completa.',
          195000,
          120000,
          4,
          6,
          '40,41,42,43,44,45',
          'Rojo Carmesí / Negro',
          'https://images.unsplash.com/photo-1579338559194-a162d19bf842?auto=format&fit=crop&w=800&q=80',
          1
        ]
      },
      {
        sql: `INSERT INTO products (id, sku, name, brand, category_id, description, price, cost, stock, min_stock, sizes, color, image_url, featured, active)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        args: [
          4,
          'ZAP-TRN-004',
          'Nike Metcon 9 AMP CrossFit',
          'Nike',
          3,
          'Placa Hyperlift ampliada en el talón para sentadillas pesadas y recubrimiento lateral de goma para ascenso en cuerda.',
          158000,
          92000,
          15,
          5,
          '38,39,40,41,42,43',
          'Gris Grafito / Lima',
          'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=800&q=80',
          0
        ]
      },
      {
        sql: `INSERT INTO products (id, sku, name, brand, category_id, description, price, cost, stock, min_stock, sizes, color, image_url, featured, active)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        args: [
          5,
          'ZAP-FUT-005',
          'Puma Future 7 Ultimate FG/AG',
          'Puma',
          4,
          'Botines profesionales con capellada adaptativa FUZIONFIT360 con PWRTAPE y suela Dynamic Motion System.',
          149000,
          89000,
          3,
          5,
          '39,40,41,42,43',
          'Azul Eléctrico / Blanco',
          'https://images.unsplash.com/photo-1511886929837-354d827aae26?auto=format&fit=crop&w=800&q=80',
          1
        ]
      },
      {
        sql: `INSERT INTO products (id, sku, name, brand, category_id, description, price, cost, stock, min_stock, sizes, color, image_url, featured, active)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        args: [
          6,
          'ZAP-URB-006',
          'New Balance 550 Retro Court',
          'New Balance',
          5,
          'El regreso de una leyenda del básquet de 1989 en cuero premium microperforado y detalles vintage para uso urbano.',
          142000,
          84000,
          22,
          6,
          '37,38,39,40,41,42,43',
          'Blanco / Verde Bosque',
          'https://images.unsplash.com/photo-1539185441755-769473a23570?auto=format&fit=crop&w=800&q=80',
          1
        ]
      },
      {
        sql: `INSERT INTO products (id, sku, name, brand, category_id, description, price, cost, stock, min_stock, sizes, color, image_url, featured, active)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        args: [
          7,
          'ZAP-RUN-007',
          'Asics Gel-Kayano 30 Stability',
          'Asics',
          1,
          'Estabilidad adaptativa 4D Guidance System y amortiguación FF BLAST PLUS ECO para corredores de larga distancia.',
          176000,
          105000,
          2,
          5,
          '40,41,42,43,44',
          'Azul Marino / Plata',
          'https://images.unsplash.com/photo-1551107696-a4b0c5a0d9a2?auto=format&fit=crop&w=800&q=80',
          0
        ]
      },
      {
        sql: `INSERT INTO products (id, sku, name, brand, category_id, description, price, cost, stock, min_stock, sizes, color, image_url, featured, active)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        args: [
          8,
          'ZAP-URB-008',
          'Vans Knu Skool Suede Black',
          'Vans',
          5,
          'Reinterpretación de los años 90 con lengüeta extra acolchada, gamuza de alta resistencia y Sidestripe moldeado en 3D.',
          115000,
          68000,
          14,
          5,
          '36,37,38,39,40,41,42',
          'Negro / Blanco',
          'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&w=800&q=80',
          0
        ]
      },
      {
        sql: `INSERT INTO products (id, sku, name, brand, category_id, description, price, cost, stock, min_stock, sizes, color, image_url, featured, active)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        args: [
          9,
          'ACC-DEP-009',
          'Pack x3 Medias Compresión Running Pro',
          'Nike',
          6,
          'Tejido Dri-FIT respirable con soporte anatómico en el arco plantar y amortiguación zonificada.',
          24500,
          11000,
          35,
          10,
          'S,M,L',
          'Negro / Blanco',
          'https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?auto=format&fit=crop&w=800&q=80',
          0
        ]
      },

      // 4. Movimientos iniciales de inventario
      {
        sql: `INSERT INTO inventory_movements (product_id, user_id, type, quantity, previous_stock, new_stock, reason)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [1, 1, 'entrada', 20, 0, 20, 'Carga inicial de temporada Running Primavera-Verano']
      },
      {
        sql: `INSERT INTO inventory_movements (product_id, user_id, type, quantity, previous_stock, new_stock, reason)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [1, 4, 'venta_online', 2, 20, 18, 'Pedido Online #ORD-1001']
      },
      {
        sql: `INSERT INTO inventory_movements (product_id, user_id, type, quantity, previous_stock, new_stock, reason)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [3, 2, 'venta_pos', 1, 5, 4, 'Venta POS Presencial #POS-2001']
      },
      {
        sql: `INSERT INTO inventory_movements (product_id, user_id, type, quantity, previous_stock, new_stock, reason)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [7, 3, 'salida', 3, 5, 2, 'Reserva exhibición vidriera sucursal central']
      },

      // 5. Pedidos y Ventas de ejemplo (E-Commerce Online y POS Presencial)
      {
        sql: `INSERT INTO orders (id, order_number, user_id, seller_id, customer_name, customer_email, customer_phone, customer_dni, shipping_address, channel, payment_method, status, subtotal, discount, total, notes)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          1,
          'ORD-1001',
          4,
          null,
          'Martín Gómez',
          'cliente@zapatillas.com',
          '+54 11 6777-8899',
          '41999888',
          'Calle Mendoza 2410, Belgrano, CABA',
          'online',
          'reserva_sin_cobro',
          'confirmado',
          330000,
          0,
          330000,
          'Entrega preferentemente por la tarde. Pedido registrado sin cobro electrónico.'
        ]
      },
      {
        sql: `INSERT INTO order_items (order_id, product_id, product_name, size, quantity, unit_price, subtotal)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [1, 1, 'Nike Air Zoom Pegasus 41', '42', 2, 165000, 330000]
      },
      {
        sql: `INSERT INTO orders (id, order_number, user_id, seller_id, customer_name, customer_email, customer_phone, customer_dni, shipping_address, channel, payment_method, status, subtotal, discount, total, notes)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          2,
          'POS-2001',
          5,
          2,
          'Valentina Rossi',
          'valentina@gmail.com',
          '+54 11 5444-3322',
          '42888777',
          'Retiro en mostrador - Local Central',
          'pos',
          'efectivo',
          'completado',
          219500,
          10000,
          209500,
          'Venta presencial en caja #1 con descuento promocional en efectivo.'
        ]
      },
      {
        sql: `INSERT INTO order_items (order_id, product_id, product_name, size, quantity, unit_price, subtotal)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [2, 3, 'Jordan Tatum 2 Vortex Court', '41', 1, 195000, 195000]
      },
      {
        sql: `INSERT INTO order_items (order_id, product_id, product_name, size, quantity, unit_price, subtotal)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [2, 9, 'Pack x3 Medias Compresión Running Pro', 'M', 1, 24500, 24500]
      },

      // 6. Proyectos internos de la tienda (con las 5 etapas del Ciclo de Vida)
      {
        sql: `INSERT INTO projects (id, name, description, category, manager_id, status, priority, start_date, end_date, budget, progress)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          1,
          'Lanzamiento E-Commerce & POS Omnicanal 2026',
          'Digitalización integral del catálogo de zapatillas, sincronización de stock en tiempo real con punto de venta físico y control de alertas de reposición.',
          'Tecnología & Ventas',
          1,
          'en_progreso',
          'alta',
          '2026-09-01',
          '2026-11-15',
          1850000,
          80
        ]
      },
      {
        sql: `INSERT INTO project_phases (id, project_id, name, description, order_index, status) VALUES (?, ?, ?, ?, ?, ?)`,
        args: [1, 1, '1. Inicio', 'Definición de alcance, identificación de roles y relevamiento de necesidades de la tienda.', 1, 'completada']
      },
      {
        sql: `INSERT INTO project_phases (id, project_id, name, description, order_index, status) VALUES (?, ?, ?, ?, ?, ?)`,
        args: [2, 1, '2. Planificación', 'Especificación de requerimientos funcionales/no funcionales y arquitectura de base de datos.', 2, 'completada']
      },
      {
        sql: `INSERT INTO project_phases (id, project_id, name, description, order_index, status) VALUES (?, ?, ?, ?, ?, ?)`,
        args: [3, 1, '3. Ejecución y Desarrollo', 'Implementación de módulos de inventario, POS, catálogo online y panel administrativo.', 3, 'completada']
      },
      {
        sql: `INSERT INTO project_phases (id, project_id, name, description, order_index, status) VALUES (?, ?, ?, ?, ?, ?)`,
        args: [4, 1, '4. Monitoreo y Control', 'Pruebas integrales de descuento de stock, auditoría de transacciones y encuestas de usuarios.', 4, 'en_progreso']
      },
      {
        sql: `INSERT INTO project_phases (id, project_id, name, description, order_index, status) VALUES (?, ?, ?, ?, ?, ?)`,
        args: [5, 1, '5. Cierre', 'Manual de usuario, documentación técnica y despliegue productivo en Vercel + Turso.', 5, 'pendiente']
      },

      // Tareas del Proyecto 1
      {
        sql: `INSERT INTO project_tasks (id, project_id, phase_id, title, description, assigned_to, status, priority, due_date, completed_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        args: [1, 1, 1, 'Definir matriz de permisos por rol (Admin, Empleado, Cliente)', 'Establecer accesos seguros mediante JWT para proteger rutas administrativas.', 1, 'completada', 'alta', '2026-09-10']
      },
      {
        sql: `INSERT INTO project_tasks (id, project_id, phase_id, title, description, assigned_to, status, priority, due_date, completed_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        args: [2, 1, 2, 'Modelar esquema relacional de inventario y kardex de movimientos', 'Diseñar tablas de productos, alertas de stock mínimo y trazabilidad de ventas.', 3, 'completada', 'alta', '2026-09-25']
      },
      {
        sql: `INSERT INTO project_tasks (id, project_id, phase_id, title, description, assigned_to, status, priority, due_date, completed_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        args: [3, 1, 3, 'Integrar terminal POS presencial con descuento atómico de stock', 'Conectar venta de mostrador con validación de stock no negativo.', 2, 'completada', 'alta', '2026-10-10']
      },
      {
        sql: `INSERT INTO project_tasks (id, project_id, phase_id, title, description, assigned_to, status, priority, due_date, completed_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        args: [4, 1, 4, 'Ejecutar pruebas funcionales y validación de alertas de stock bajo', 'Verificar que productos bajo el umbral mínimo generen alertas en el dashboard.', 3, 'completada', 'media', '2026-10-19']
      },
      {
        sql: `INSERT INTO project_tasks (id, project_id, phase_id, title, description, assigned_to, status, priority, due_date, completed_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
        args: [5, 1, 5, 'Recopilar retroalimentación final de usuarios reales en tienda', 'Registrar encuestas de satisfacción del módulo de retroalimentación.', 2, 'en_progreso', 'media', '2026-11-10']
      },

      // Segundo Proyecto: Renovación de Temporada Running
      {
        sql: `INSERT INTO projects (id, name, description, category, manager_id, status, priority, start_date, end_date, budget, progress)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          2,
          'Campaña Maratón Buenos Aires & Reposición Running',
          'Acuerdo con proveedores Nike, Adidas y Asics para abastecer talles críticos antes de la maratón anual y activar stand promocional.',
          'Comercial & Logística',
          3,
          'en_progreso',
          'media',
          '2026-10-01',
          '2026-12-01',
          950000,
          50
        ]
      },
      {
        sql: `INSERT INTO project_phases (id, project_id, name, description, order_index, status) VALUES (?, ?, ?, ?, ?, ?)`,
        args: [6, 2, '1. Inicio y Relevamiento de Stock', 'Detectar modelos de running con alerta de stock crítico.', 1, 'completada']
      },
      {
        sql: `INSERT INTO project_phases (id, project_id, name, description, order_index, status) VALUES (?, ?, ?, ?, ?, ?)`,
        args: [7, 2, '2. Ejecución de Compra y Recepción', 'Ingreso de mercadería en depósito y etiquetado SKU.', 2, 'en_progreso']
      },
      {
        sql: `INSERT INTO project_tasks (id, project_id, phase_id, title, description, assigned_to, status, priority, due_date, completed_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        args: [6, 2, 6, 'Auditar curva de talles de Asics Gel-Kayano 30 y Jordan Tatum 2', 'Confirmar talles agotados para orden de compra.', 3, 'completada', 'alta', '2026-10-12']
      },
      {
        sql: `INSERT INTO project_tasks (id, project_id, phase_id, title, description, assigned_to, status, priority, due_date, completed_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
        args: [7, 2, 7, 'Recepcionar 30 pares nuevos y registrar entrada en inventario', 'Cargar ingreso en el módulo de movimientos cuando arribe el transporte.', 2, 'pendiente', 'alta', '2026-10-28']
      }
    ],
    'write'
  );
}

module.exports = {
  db,
  query,
  initDatabase
};
