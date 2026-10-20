# 📋 Informe de Retroalimentación de Usuarios

## 1. Metodología y Transparencia de Datos
En cumplimiento estricto de la consigna académica (*"Informe de retroalimentación preparado para recoger opiniones de usuarios, sin inventar resultados"*), el sistema cuenta con una tabla dedicada `feedback` en la base de datos y una pantalla interactiva (`/feedback`) accesible desde la barra de navegación principal.

- **Estado inicial de la base de datos:** `0 respuestas inventadas`.
- **Recolección en vivo:** Cada vez que un cliente, empleado o docente evaluador completa la encuesta en `/feedback`, su respuesta queda registrada en **Turso** y el panel calcula automáticamente los indicadores reales:
  - Total de encuestas recibidas (`COUNT(*)`)
  - Promedio de Calificación General (`1 a 5`)
  - Promedio de Facilidad de Uso / Usabilidad (`1 a 5`)
  - Promedio de Velocidad de Respuesta (`1 a 5`)
  - Promedio de Diseño Claro/Oscuro (`1 a 5`)

---

## 2. Dimensiones e Indicadores del Instrumento de Evaluación

| Dimensión Evaluada | Escala | Pregunta Guía para el Usuario Evaluador |
| :--- | :--- | :--- |
| **1. Funcionalidad del Módulo** | Selección | ¿Qué módulo utilizó? (Tienda Online, POS, Inventario, Proyectos, Dashboard) |
| **2. Usabilidad y Navegación** | 1 a 5 | ¿Qué tan intuitivo resultó encontrar productos, operar el carrito o usar la caja POS? |
| **3. Velocidad y Sincronización** | 1 a 5 | ¿Qué tan rápida fue la actualización del stock y los reportes tras cada operación? |
| **4. Diseño Visual y Adaptabilidad** | 1 a 5 | ¿Cómo califica la interfaz responsive en celular/PC y el selector de Modo Claro/Oscuro? |
| **5. Observaciones Abiertas** | Texto libre | Comentarios sobre la experiencia de uso y propuestas de mejora para futuras iteraciones. |

---

## 3. Plantilla de Registro para Defensa Académica
*(Completar con las respuestas reales obtenidas durante la demostración en clase o prueba con usuarios)*

| # | Nombre del Evaluador | Rol | Módulo Evaluado | Puntaje Gral. (1-5) | Comentario / Sugerencia Real |
| :- | :--- | :--- | :--- | :---: | :--- |
| 1 | *[Pendiente de prueba real]* | — | — | — | — |
| 2 | *[Pendiente de prueba real]* | — | — | — | — |
| 3 | *[Pendiente de prueba real]* | — | — | — | — |
