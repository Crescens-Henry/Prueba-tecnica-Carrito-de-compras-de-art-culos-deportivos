import { withContext } from './logger';
import { withHttp } from './middleware/auth';

export const handler = async (event: any, context: any) => {
  const log = (event as any).log || withContext({ fn: 'health' });

  log.info('healthcheck', { path: event?.rawPath, method: event?.requestContext?.http?.method });

  return {
    statusCode: 200,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ok: true, ts: new Date().toISOString() })
  };
};

// Endpoint para probar ERROR logs
export const testError = withHttp(async (event: any, context: any) => {
  const log = (event as any).log || withContext({ fn: 'testError' });
  
  try {
    // Simular un error de conexión a BD
    throw new Error('Database connection timeout: could not reach PostgreSQL at localhost:5432 after 5000ms');
  } catch (error: any) {
    log.error('database_connection_failed', { 
      error: error.message, 
      service: 'postgresql',
      host: 'localhost',
      port: 5432,
      timeout_ms: 5000
    });
    throw error;
  }
}, { required: false });
