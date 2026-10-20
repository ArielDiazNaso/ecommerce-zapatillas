# 📑 Documento de Requerimientos Funcionales y No Funcionales
**Proyecto:** Sistema de Gestión Integral y E-Commerce para Tienda de Deportes y Zapatillas (**STRIDE PRO**)  
**Repositorio:** `ecommerce-zapatillas`  

---

## 1. Etapa de Inicio: Alcance, Objetivos y Roles

### 1.1 Alcance del Proyecto
El sistema **STRIDE PRO** abarca la digitalización omnicanal de una tienda de calzado e indumentaria deportiva, integrando en una única plataforma web:
1. **Tienda Online (E-Commerce B2C):** Catálogo público interactivo con filtrado por disciplina deportiva, selección de talles, carrito de compras y registro de pedidos con descuento atómico de stock.
2. **Terminal Punto de Venta (POS Presencial):** Interfaz ágil de mostrador para cajeros y vendedores con lectura de SKU, selección o alta rápida de clientes, descuentos en caja e impresión de comprobante.
3. **Gestión de Inventario y Kardex:** Control de productos, categorías, precios, costos, movimientos auditados (`entrada`, `salida`, `ajuste`, `venta_pos`, `venta_online`) y alertas automáticas de stock bajo (`stock <= min_stock`).
4. **Ciclo de Vida de Proyectos Internos:** Gestión de proyectos de la tienda organizados en las 5 fases metodológicas (**Inicio, Planificación, Ejecución, Monitoreo y Control, Cierre**), con asignación de tareas a empleados y cálculo automático del porcentaje de progreso.
5. **Panel Administrativo y Reportes:** Indicadores clave (KPIs) calculados en tiempo real sobre la base de datos.

### 1.2 Identificación de Roles de Usuario y Permisos
| Rol | Descripción | Permisos Principales |
| :--- | :--- | :--- |
| **Administrador (`admin`)** | Dirección y gerencia de la tienda | Acceso total: Dashboard financiero, gestión de empleados/administradores/clientes, inventario, POS, proyectos, cancelación de órdenes con reintegro de stock. |
| **Empleado (`empleado`)** | Personal de ventas POS y logística | Acceso operativo: Terminal POS, gestión de productos y movimientos de stock, alertas de reposición, alta/edición de clientes, actualización de tareas y proyectos. |
| **Cliente (`cliente`)** | Comprador registrado de la tienda | Acceso comercial: Exploración de catálogo, carrito, registro de pedidos online, edición de perfil propio y seguimiento del estado de sus pedidos (`Mis Pedidos`). |

### 1.3 Relevamiento de Necesidades (Encuesta Inicial)
Previo al diseño se relevaron las problemáticas operativas de una tienda deportiva tradicional:
- **Problema 1:** Desfase entre el stock vendido en el salón físico y el publicado online.
- **Problema 2:** Falta de alertas tempranas cuando los talles más demandados de zapatillas caen por debajo del umbral crítico.
- **Problema 3:** Seguimiento disperso de proyectos internos (campañas de maratón, aperturas o auditorías de depósito).

---

## 2. Etapa de Planificación: Requerimientos Funcionales (RF)

| Código | Módulo | Descripción del Requerimiento Funcional | Prioridad |
| :--- | :--- | :--- | :--- |
| **RF-01** | Usuarios y Seguridad | Permitir el registro de nuevos clientes, inicio de sesión con validación `bcrypt` y emisión de tokens `JWT`. | Alta |
| **RF-02** | Usuarios y Seguridad | Restringir el acceso a rutas privadas y endpoints según el rol (`admin`, `empleado`, `cliente`). | Alta |
| **RF-03** | Inventario | Administrar categorías deportivas y productos con código SKU único, marca, talles, costo, precio, stock actual y stock mínimo. | Alta |
| **RF-04** | Inventario | Registrar movimientos de inventario (`entrada`, `salida`, `ajuste`) almacenando stock previo, cantidad, nuevo stock, motivo y usuario. | Alta |
| **RF-05** | Inventario | Generar alertas automáticas de stock bajo para todo producto activo cuyo `stock <= min_stock`. | Alta |
| **RF-06** | Ventas E-Commerce | Ofrecer catálogo con búsqueda en vivo, filtros por categoría y disponibilidad, selector de talle y carrito persistente. | Alta |
| **RF-07** | Ventas E-Commerce | Registrar pedidos online sin simular cobros electrónicos falsos, descontando el stock mediante transacciones atómicas. | Alta |
| **RF-08** | Ventas POS | Proveer una terminal POS para ventas presenciales con selección de cliente, descuento comercial y emisión de ticket. | Alta |
| **RF-09** | Ventas y Stock | Impedir cualquier operación de venta o salida que deje el stock en valores negativos, y reintegrar el stock si un pedido se cancela. | Crítica |
| **RF-10** | Clientes y Empleados | Permitir al administrador gestionar todos los usuarios y al empleado gestionar el padrón de clientes. | Media |
| **RF-11** | Proyectos Internos | Gestionar proyectos, sus fases del ciclo de vida y tareas con responsable asignado, recalculando automáticamente el progreso (`0% - 100%`). | Alta |
| **RF-12** | Panel Administrativo | Mostrar KPIs reales de facturación total, comparativa Online vs POS, valorización de inventario y ranking de productos más vendidos. | Alta |
| **RF-13** | Retroalimentación | Disponibilizar un formulario de evaluación para recoger opiniones reales de usuarios sin prellenar resultados ficticios. | Media |

---

## 3. Requerimientos No Funcionales (RNF)

- **RNF-01 (Usabilidad y Diseño Responsive):** Interfaz adaptable a computadoras de escritorio, tablets y teléfonos móviles utilizando **React + Bootstrap 5**, con soporte nativo de **Modo Claro y Modo Oscuro**.
- **RNF-02 (Integridad Transaccional):** Todas las ventas y movimientos de stock se ejecutan en lotes transaccionales atómicos (`db.batch(..., 'write')` en Turso/libSQL y `START TRANSACTION / COMMIT` en MySQL), evitando condiciones de carrera o saldos negativos.
- **RNF-03 (Seguridad de Datos):** Contraseñas encriptadas con `bcryptjs` (factor de costo 10), tokens firmados con `jsonwebtoken` y sanitización de parámetros SQL mediante consultas parametrizadas (`?`).
- **RNF-04 (Despliegue Cloud y Portabilidad):** Arquitectura lista para despliegue Serverless en **Vercel** conectada a **Turso (libSQL)** en la nube, e incluyendo además el script SQL completo compatible con **MySQL / XAMPP** (`database/mysql_schema_and_seed.sql`).
