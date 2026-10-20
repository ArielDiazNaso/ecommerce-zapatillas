# 💻 Documentación Técnica y Manual de Usuario

## 1. Documentación Técnica del Sistema

### 1.1 Estructura Modular del Proyecto
```text
ecommerce-zapatillas/
├── api/
│   └── index.js                # Punto de entrada Serverless para Vercel (/api/*)
├── database/
│   └── mysql_schema_and_seed.sql # Script completo MySQL compatible con XAMPP
├── docs/                       # Documentación académica del Ciclo de Vida del Proyecto
├── server/
│   ├── app.js                  # Aplicación Express y registro de rutas
│   ├── index.js                # Servidor Node.js autónomo
│   ├── config/
│   │   ├── env.js              # Variables de entorno y configuración Turso/JWT
│   │   └── database.js         # Cliente Turso (@libsql/client), esquema y seed automático
│   ├── middleware/
│   │   └── auth.js             # Autenticación JWT y autorización por roles
│   └── routes/
│       ├── authRoutes.js       # Login, registro de clientes y edición de perfil
│       ├── userRoutes.js       # ABM de clientes, empleados y administradores
│       ├── inventoryRoutes.js  # Productos, categorías, movimientos y alertas de stock
│       ├── orderRoutes.js      # Ventas POS y Pedidos Online con transacciones atómicas
│       ├── projectRoutes.js    # Proyectos, fases del ciclo de vida y tareas
│       ├── dashboardRoutes.js  # KPIs y reportes analíticos en tiempo real
│       └── feedbackRoutes.js   # Encuestas reales de retroalimentación
├── src/
│   ├── App.jsx                 # Enrutador principal y protección de rutas por rol
│   ├── context/AppContext.jsx  # Estado global (Sesión, Carrito, Tema Claro/Oscuro)
│   ├── components/             # Navbar (con Carrito y Perfil) y Footer
│   └── pages/                  # Vistas de Catálogo, POS, Inventario, Proyectos, Usuarios, Admin
├── tests/
│   └── api.test.js             # Suite de pruebas automatizadas (Vitest + Supertest)
├── .env                        # Variables de entorno preconfiguradas para el repositorio
└── vercel.json                 # Configuración de despliegue automático en Vercel
```

### 1.2 Endpoints Principales de la API REST
- `GET /api/health` — Verifica conectividad del servidor y base de datos Turso.
- `POST /api/auth/login` / `POST /api/auth/register` / `GET /api/auth/me` / `PUT /api/auth/profile`
- `GET /api/users` / `POST /api/users` / `PUT /api/users/:id` / `PATCH /api/users/:id/toggle-active`
- `GET /api/inventory/products` / `POST /api/inventory/products` / `PUT /api/inventory/products/:id`
- `GET /api/inventory/categories` / `POST /api/inventory/categories` / `PUT /api/inventory/categories/:id`
- `GET /api/inventory/movements` / `POST /api/inventory/movements`
- `GET /api/inventory/alerts` — Devuelve todos los productos con `stock <= min_stock`.
- `GET /api/orders` / `POST /api/orders` / `PATCH /api/orders/:id/status`
- `GET /api/projects` / `POST /api/projects` / `POST /api/projects/:id/tasks` / `PUT /api/projects/tasks/:taskId`
- `GET /api/dashboard/summary` — Reportes consolidados desde la base de datos.
- `GET /api/feedback` / `POST /api/feedback`

---

## 2. Manual de Usuario por Rol

### 2.1 Uso como Cliente (Tienda Online)
1. **Explorar el Catálogo:** Ingrese a la portada (`/`), filtre por categoría (*Running*, *Basketball*, *Training*, *Fútbol*, *Urban*) o busque por marca/modelo.
2. **Seleccionar Talle y Agregar al Carrito:** Elija su talle en la tarjeta del calzado y presione **Agregar**.
3. **Confirmar Pedido Online:** Abra el botón **Carrito** en la barra superior, complete sus datos de contacto y entrega, y presione **Confirmar Pedido Online**. El pedido se registra sin cobro electrónico simulado y descuenta el stock inmediatamente.
4. **Consultar Estado del Pedido:** En la sección **Mis Pedidos** (`/mis-pedidos`) visualice el detalle y el estado actualizado de sus compras.

### 2.2 Uso como Empleado (Ventas POS, Inventario y Proyectos)
1. **Iniciar Sesión:** Ingrese en `/login` con `empleado@zapatillas.com` / `Empleado123!` (o presione el botón de acceso rápido de demostración).
2. **Registrar Venta en Terminal POS (`/pos`):** Busque el producto por código SKU o nombre, elija el talle, presione **Sumar al Ticket**, seleccione el cliente (o cree uno con **Alta Rápida de Cliente**), indique el medio de pago en caja y confirme la venta para emitir el comprobante imprimible.
3. **Gestionar Stock y Alertas (`/inventario`):** Revise el banner de alertas de stock bajo y presione **Reponer Stock Ahora** para registrar una `entrada` en el Kardex.
4. **Actualizar Tareas de Proyectos (`/proyectos`):** Cambie el estado de sus tareas asignadas a `En Progreso` o `Completada ✓` para actualizar automáticamente el porcentaje de avance del proyecto.

### 2.3 Uso como Administrador (Control Total y Reportes)
1. **Iniciar Sesión:** Ingrese con `admin@zapatillas.com` / `Admin123!`.
2. **Panel Administrativo (`/admin`):** Consulte la facturación total, comparativa Online vs POS, valorización de inventario a costo y precio de lista, y gestione los estados de todos los pedidos (si cancela un pedido, el sistema reintegra automáticamente las unidades al stock).
3. **Gestión de Personal y Clientes (`/usuarios`):** Dé de alta nuevos empleados, asigne sectores y active o desactive cuentas de usuario.
