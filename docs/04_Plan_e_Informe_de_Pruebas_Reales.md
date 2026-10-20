# 🧪 Plan e Informe de Pruebas con Resultados Reales

## 1. Estrategia y Alcance del Plan de Pruebas
Las pruebas se ejecutaron de manera automatizada utilizando **Vitest 5** y **Supertest 7** (`tests/api.test.js`) directamente contra la aplicación **Express** conectada a la instancia real de **Turso (`libsql://tagliaferro-arieldiaznaso.aws-ap-south-1.turso.io`)**.

Comando para reproducir las pruebas en cualquier momento:
```bash
npm test
```

---

## 2. Matriz de Casos de Prueba Ejecutados y Resultados Reales

| ID Caso | Módulo Evaluado | Descripción de la Prueba | Resultado Esperado | Resultado Obtenido | Estado |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **CP-01** | Infraestructura & DB | Verificar disponibilidad de `/api/health` e inicialización del esquema en Turso. | HTTP `200 OK` y estado `"ok"`. | HTTP `200 OK` | **APROBADO ✓** |
| **CP-02** | Autenticación JWT | Login de Admin, Empleado y Cliente con `bcrypt`, y bloqueo de contraseña errónea. | Tokens válidos para los 3 roles y HTTP `401` ante clave inválida. | Tokens generados y HTTP `401` verificado (559 ms). | **APROBADO ✓** |
| **CP-03** | Autorización RBAC | Intentar acceder a `/api/dashboard/summary` con token de rol `cliente`. | Acceso denegado con HTTP `403 Forbidden`. | HTTP `403 Forbidden` | **APROBADO ✓** |
| **CP-04** | Inventario & Alertas | Consultar catálogo activo y verificar detección de productos con `stock <= min_stock`. | Listado de productos y al menos 1 alerta de stock crítico activa. | 9 productos y 3 alertas activas detectadas (786 ms). | **APROBADO ✓** |
| **CP-05** | Control de Stock Negativo | Intentar registrar una `salida` de 99.999 unidades en `/api/inventory/movements`. | Rechazo de la operación con HTTP `400` sin alterar el stock. | HTTP `400 Bad Request` ("Stock insuficiente") (395 ms). | **APROBADO ✓** |
| **CP-06** | Ventas y Transacciones | Crear pedido online de 1 par, verificar descuento exacto de stock y luego cancelar el pedido verificando el reintegro atómico. | `stock_final = stock_inicial - 1` tras la venta, y `stock_restaurado = stock_inicial` tras cancelar. | Descuento y reintegro transaccional exactos en Turso (5221 ms). | **APROBADO ✓** |
| **CP-07** | Proyectos & Dashboard | Consultar proyectos con fases del ciclo de vida y métricas reales del Dashboard. | HTTP `200 OK` con proyectos, fases, tareas y KPIs financieros. | Datos verificados correctamente (4631 ms). | **APROBADO ✓** |

---

## 3. Salida Real de Consola (`vitest run`)

```text
 RUN  v5.0.5 C:/Users/Usuario/Desktop/tagliaferro

 ✓ tests/api.test.js (7 tests) 16942ms
   ✓ Pruebas Integrales del Sistema de Gestión y E-Commerce (Express + Turso) (7)
     ✓ 1. Verifica estado del servidor y conexión activa con Turso
     ✓ 2. Valida autenticación JWT y bloquea credenciales incorrectas 559ms
     ✓ 3. Protege rutas administrativas contra acceso de clientes
     ✓ 4. Obtiene catálogo de productos, categorías y alertas de stock bajo 786ms
     ✓ 5. Impide movimientos de inventario que generen stock negativo 395ms
     ✓ 6. Descuenta stock en una venta y lo reintegra atómicamente al cancelar el pedido 5221ms
     ✓ 7. Consulta proyectos internos con sus fases y reportes del panel administrativo 4631ms

 Test Files  1 passed (1)
      Tests  7 passed (7)
```
