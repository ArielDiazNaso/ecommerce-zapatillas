import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../server/app';

describe('Pruebas Integrales del Sistema de Gestión y E-Commerce (Express + Turso)', () => {
  let adminToken = '';
  let employeeToken = '';
  let clientToken = '';

  beforeAll(async () => {
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@zapatillas.com', password: 'Admin123!' });
    adminToken = adminRes.body.token;

    const empRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'empleado@zapatillas.com', password: 'Empleado123!' });
    employeeToken = empRes.body.token;

    const cliRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'cliente@zapatillas.com', password: 'Cliente123!' });
    clientToken = cliRes.body.token;
  });

  it('1. Verifica estado del servidor y conexión activa con Turso', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('2. Valida autenticación JWT y bloquea credenciales incorrectas', async () => {
    expect(adminToken).toBeTruthy();
    expect(employeeToken).toBeTruthy();
    expect(clientToken).toBeTruthy();

    const failRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@zapatillas.com', password: 'WrongPassword' });
    expect(failRes.status).toBe(401);
  });

  it('3. Protege rutas administrativas contra acceso de clientes', async () => {
    const res = await request(app)
      .get('/api/dashboard/summary')
      .set('Authorization', `Bearer ${clientToken}`);
    expect(res.status).toBe(403);
  });

  it('4. Obtiene catálogo de productos, categorías y alertas de stock bajo', async () => {
    const prodRes = await request(app).get('/api/inventory/products');
    expect(prodRes.status).toBe(200);
    expect(prodRes.body.products.length).toBeGreaterThanOrEqual(8);

    const alertRes = await request(app)
      .get('/api/inventory/alerts')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(alertRes.status).toBe(200);
    expect(alertRes.body.alerts.length).toBeGreaterThanOrEqual(1);
  });

  it('5. Impide movimientos de inventario que generen stock negativo', async () => {
    const res = await request(app)
      .post('/api/inventory/movements')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({
        product_id: 1,
        type: 'salida',
        quantity: 99999,
        reason: 'Intento de salida mayor al stock disponible'
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/insuficiente/i);
  });

  it('6. Descuenta stock en una venta y lo reintegra atómicamente al cancelar el pedido', async () => {
    const beforeProd = await request(app).get('/api/inventory/products/1');
    const initialStock = Number(beforeProd.body.product.stock);

    // Crear pedido online de 1 unidad
    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        customer_name: 'Martín Gómez',
        customer_email: 'cliente@zapatillas.com',
        channel: 'online',
        payment_method: 'reserva_sin_cobro',
        items: [{ product_id: 1, size: '42', quantity: 1 }]
      });

    expect(orderRes.status).toBe(201);
    const createdOrderId = orderRes.body.order.id;

    // Verificar descuento de stock
    const afterOrderProd = await request(app).get('/api/inventory/products/1');
    expect(Number(afterOrderProd.body.product.stock)).toBe(initialStock - 1);

    // Cancelar pedido para restaurar el stock original
    const cancelRes = await request(app)
      .patch(`/api/orders/${createdOrderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'cancelado' });
    expect(cancelRes.status).toBe(200);

    // Verificar reintegro exacto del stock
    const restoredProd = await request(app).get('/api/inventory/products/1');
    expect(Number(restoredProd.body.product.stock)).toBe(initialStock);
  });

  it('7. Consulta proyectos internos con sus fases y reportes del panel administrativo', async () => {
    const projRes = await request(app)
      .get('/api/projects')
      .set('Authorization', `Bearer ${employeeToken}`);
    expect(projRes.status).toBe(200);
    expect(projRes.body.projects.length).toBeGreaterThanOrEqual(2);

    const dashRes = await request(app)
      .get('/api/dashboard/summary')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(dashRes.status).toBe(200);
    expect(dashRes.body.sales).toBeDefined();
    expect(dashRes.body.inventory).toBeDefined();
  });
});
