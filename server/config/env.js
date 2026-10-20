require('dotenv').config();

/**
 * Configuración centralizada de variables de entorno.
 * Incluye valores por defecto para despliegue directo en Vercel sin requerir configuración manual extra.
 */
const ENV = {
  TURSO_DATABASE_URL:
    process.env.TURSO_DATABASE_URL ||
    'libsql://tagliaferro-arieldiaznaso.aws-ap-south-1.turso.io',
  TURSO_AUTH_TOKEN:
    process.env.TURSO_AUTH_TOKEN ||
    'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTI1MDY3MjQsImlkIjoiMDFhMTU5YjctMGUwMS03MmZkLWIyMzYtMzFmMTlkMTNlYTFiIiwia2lkIjoiUWlOVGlQdjI1V0lLdHZKb0p2Q3BYQjI3Ql8wb0NhbDQwdmV1U2VEZDJlbyIsInJpZCI6ImZlZmQzYTNjLTJmNjMtNDIxNC1hMjZjLTQ0NTczZjNiNThmZSJ9.dECLReLpiqS60QtwbyVCaSgaBdWZvQue4QL9fQXa0RDjjNZUnCgAT1LQOYQZqzPgmcgCbKHN7eektZjQr2ouAQ',
  JWT_SECRET: process.env.JWT_SECRET || 'stride_sport_secret_key_2026_tagliaferro',
  PORT: process.env.PORT || 3001,
  NODE_ENV: process.env.NODE_ENV || 'development'
};

module.exports = ENV;
