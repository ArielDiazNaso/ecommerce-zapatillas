# 👟 STRIDE PRO — Sistema de Gestión para Tienda de Deportes y E-Commerce de Zapatillas

Aplicación integral **Full-Stack** desarrollada para cumplir con las **5 etapas del Ciclo de Vida de un Proyecto** (Inicio, Planificación, Ejecución, Monitoreo y Control, y Cierre). Combina una **Tienda E-Commerce de Zapatillas**, una **Terminal POS para Ventas Presenciales**, **Gestión de Inventario con Alertas de Stock Bajo**, **Gestión de Proyectos Internos** y **Panel Administrativo con Reportes en Tiempo Real**.

---

## 🚀 Tecnologías Utilizadas
- **Frontend:** React 19 + Vite + Bootstrap 5.3 + Bootstrap Icons (Responsive + Modo Claro y Oscuro nativo).
- **Backend:** Node.js + Express REST API (adaptado para ejecución local y Serverless en **Vercel** mediante `api/index.js`).
- **Base de Datos Cloud (Activa):** **Turso (libSQL)** conectada directamente con transacciones atómicas.
- **Compatibilidad XAMPP / MySQL:** Incluye script completo en `database/mysql_schema_and_seed.sql`.
- **Seguridad:** Encriptación `bcryptjs`, tokens `JWT` y permisos por rol (`admin`, `empleado`, `cliente`).

---

## 🔑 Cuentas de Demostración (1 Clic en `/login`)

| Rol | Email | Contraseña | Permisos |
| :--- | :--- | :--- | :--- |
| **Administrador** | `admin@zapatillas.com` | `Admin123!` | Acceso total: Dashboard, POS, Inventario, Proyectos, Empleados y Clientes |
| **Empleado POS** | `empleado@zapatillas.com` | `Empleado123!` | Terminal POS, Inventario, Alertas de Stock, Proyectos y Alta/Edición de Clientes |
| **Cliente** | `cliente@zapatillas.com` | `Cliente123!` | Compra en Catálogo Online, Carrito, Perfil y Seguimiento de Mis Pedidos |

---

## 🛠️ Instalación y Ejecución Local

1. **Clonar el repositorio e instalar dependencias:**
   ```bash
   git clone https://github.com/ArielDiazNaso/ecommerce-zapatillas.git
   cd ecommerce-zapatillas
   npm install
   ```

2. **Iniciar el entorno de desarrollo (Frontend + Backend API integrados en un solo comando):**
   ```bash
   npm run dev
   ```
   Abrir en el navegador: `http://localhost:5173`

3. **Ejecutar las pruebas automatizadas reales:**
   ```bash
   npm test
   ```

4. **Compilar e iniciar en modo producción local:**
   ```bash
   npm run build
   npm start
   ```

---

## ☁️ Despliegue en Vercel (Zero-Config)
El proyecto incluye `vercel.json`, `api/index.js`, `.env` y configuración de respaldo en `server/config/env.js`.
- Al importar el repositorio `ArielDiazNaso/ecommerce-zapatillas` en **Vercel**, funciona de forma inmediata sin necesidad de configurar variables de entorno adicionales manualmente.

---

## 📂 Entregables Académicos Incluidos en el Repositorio
- 📑 [Requerimientos Funcionales y No Funcionales](docs/01_Requerimientos_Funcionales_y_No_Funcionales.md)
- 🎨 [Diseño de Arquitectura y Prototipos UI/UX](docs/02_Arquitectura_y_Prototipos_UI_UX.md)
- 💻 [Documentación Técnica y Manual de Usuario](docs/03_Documentacion_Tecnica_y_Manual_Usuario.md)
- 🧪 [Plan e Informe de Pruebas con Resultados Reales](docs/04_Plan_e_Informe_de_Pruebas_Reales.md)
- 📋 [Informe de Retroalimentación de Usuarios](docs/05_Informe_de_Retroalimentacion.md)
- 📊 [Presentación Final para Defensa en Clase](docs/06_Presentacion_Final_Defensa.md)
- 🗄️ [Script MySQL Compatible con XAMPP](database/mysql_schema_and_seed.sql)
