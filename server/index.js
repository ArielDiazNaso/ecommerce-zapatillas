const app = require('./app');
const ENV = require('./config/env');
const { initDatabase } = require('./config/database');

async function startServer() {
  try {
    await initDatabase();
    app.listen(ENV.PORT, () => {
      console.log(`Servidor ejecutándose en http://localhost:${ENV.PORT}`);
    });
  } catch (error) {
    console.error('Error fatal al iniciar el servidor:', error);
    process.exit(1);
  }
}

startServer();
