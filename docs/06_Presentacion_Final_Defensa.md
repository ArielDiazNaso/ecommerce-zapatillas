# 📊 Presentación Final para Defensa del Proyecto en Clase
**Título:** Sistema de Gestión Integral y E-Commerce para Tienda de Deportes (**STRIDE PRO**)  
**Autor:** Ariel Díaz Naso  

---

## Diapositiva 1: Introducción y Problemática
- **Problema:** Las tiendas de calzado y artículos deportivos suelen operar con herramientas desconectadas entre el mostrador físico (POS), la tienda online y el depósito, generando quiebres de stock y falta de seguimiento de proyectos internos.
- **Solución Propuesta:** **STRIDE PRO**, una plataforma web unificada que sincroniza en tiempo real el inventario, las ventas presenciales y online, y el ciclo de vida de los proyectos de la tienda.

---

## Diapositiva 2: Las 5 Etapas del Ciclo de Vida del Proyecto
1. **Inicio:** Definición de alcance omnicanal e identificación de los 3 roles (`Administrador`, `Empleado`, `Cliente`).
2. **Planificación:** Especificación de 13 Requerimientos Funcionales, 4 No Funcionales y diseño del esquema relacional de 10 tablas.
3. **Ejecución y Desarrollo:** Construcción del Frontend en **React + Vite + Bootstrap 5** (Modo Claro/Oscuro) y Backend en **Node.js + Express** conectado a **Turso (libSQL)** y compatible con **MySQL / XAMPP**.
4. **Monitoreo y Control:** Ejecución de pruebas automatizadas (`Vitest` + `Supertest`), validación de stock no negativo, alertas de reposición y módulo de retroalimentación real.
5. **Cierre:** Documentación técnica, manual de usuario y despliegue productivo en **GitHub (`ecommerce-zapatillas`) + Vercel**.

---

## Diapositiva 3: Arquitectura Tecnológica y Seguridad
- **Frontend:** React 19 + Vite + Bootstrap 5.3 + Bootstrap Icons.
- **Backend:** Node.js + Express REST API + Serverless Functions para Vercel (`api/index.js`).
- **Base de Datos:** Turso Cloud (`@libsql/client`) con transacciones atómicas `db.batch(..., 'write')` + script SQL para MySQL/XAMPP (`database/mysql_schema_and_seed.sql`).
- **Seguridad:** Contraseñas encriptadas con `bcryptjs`, autenticación `JWT` y control de permisos por rol (`RBAC`).

---

## Diapositiva 4: Recorrido de Demostración en Vivo (Guion de 5 Minutos)
1. **Vista Cliente (`/`):** Mostrar modo claro/oscuro, filtrar zapatillas por categoría *Running*, elegir talle `42`, agregar al carrito y registrar un pedido online sin pasarela ficticia.
2. **Vista Empleado — Terminal POS (`/pos`):** Iniciar sesión con 1 clic como Empleado (`empleado@zapatillas.com`), buscar por SKU, realizar una venta de mostrador con descuento en efectivo e imprimir el comprobante.
3. **Inventario y Alertas (`/inventario`):** Mostrar cómo disminuyó el stock automáticamente, revisar el Kardex de movimientos y usar el botón **Reponer Stock Ahora** en un producto con alerta de stock crítico.
4. **Gestión de Proyectos (`/proyectos`):** Mostrar las 5 etapas del ciclo de vida y marcar una tarea como `Completada ✓` para ver cómo sube la barra de progreso en vivo.
5. **Panel Administrativo (`/admin`):** Mostrar los KPIs reales, la comparativa Online vs POS y cómo al cancelar un pedido se reintegra el stock automáticamente.

---

## Diapositiva 5: Conclusiones y Cumplimiento de Criterios
- **Requerimientos (20%):** 100% de módulos obligatorios implementados y trazados.
- **Diseño (20%):** Interfaz responsive adaptable a móvil y escritorio con Modo Claro y Oscuro.
- **Implementación (30%):** Código modular, limpio, sin botones sin funcionalidad ni datos simulados.
- **Pruebas (15%):** 7 suites de pruebas de integración reales aprobadas (`npm test`).
- **Presentación (15%):** Documentación completa y repositorio listo para producción en Vercel.
