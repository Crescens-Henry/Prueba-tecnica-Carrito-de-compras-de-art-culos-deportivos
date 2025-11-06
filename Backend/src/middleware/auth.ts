import middy from '@middy/core';
import httpErrorHandler from '@middy/http-error-handler';
import jsonBodyParser from '@middy/http-json-body-parser';
import jwt from 'jsonwebtoken';
import { withContext } from '../logger';

export type AuthUser = {
  userId: string;
  email?: string;
  name?: string;
};

type Handler = (event: any, context: any) => Promise<any>;

type VerifyOptions = {
  required?: boolean; // si es true, falla si no hay token
};

export function withHttp(handler: Handler, opts: VerifyOptions = { required: true }) {
  const base = async (event: any, context: any) => {
    const requestId = context?.awsRequestId;
    const correlationId = event?.headers?.['x-correlation-id'] || requestId;
    const route = event?.rawPath;
    const method = event?.requestContext?.http?.method;
    const t0 = Date.now();
    let log = withContext({ correlationId, requestId, route, method });

    const authHeader = event?.headers?.authorization || event?.headers?.Authorization;
    const token = (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer '))
      ? authHeader.slice(7)
      : null;

    const secret = process.env.JWT_SECRET || 'dev-secret';

    if (token) {
      try {
        const payload = jwt.verify(token, secret) as AuthUser & { iat?: number; exp?: number };
        // Adjuntar usuario al evento
        (event as any).auth = { user: { userId: payload.userId, email: payload.email, name: payload.name } };
        log = withContext({ correlationId, requestId, route, method, userId: payload.userId });
      } catch (err) {
        if (opts.required) {
          return { statusCode: 401, body: JSON.stringify({ message: 'Token inválido o expirado' }) };
        }
      }
    } else if (opts.required) {
      return { statusCode: 401, body: JSON.stringify({ message: 'Autorización requerida' }) };
    }

    // Adjuntar logger al evento para logueos de la función
    (event as any).log = log;
    
    // Simulación: si viene un header especial, log error para demostración
    const headers = event?.headers || {};
    const hasErrorHeader = Object.keys(headers).some(key => 
      key.toLowerCase() === 'x-simulate-error'
    );
    
    if (hasErrorHeader) {
      log.error('database_connection_failed', { error: 'Connection timeout: could not connect to DynamoDB', retries: 3, elapsedMs: 5000 });
    }

    try {
      const res = await handler(event, context);
      const durationMs = Date.now() - t0;
      const statusCode = res?.statusCode ?? 200;
      
      // Diferenciar nivel de log según status code
      if (statusCode >= 500) {
        log.error('request_error', { statusCode, durationMs });
      } else if (statusCode >= 400) {
        log.warn('request_warning', { statusCode, durationMs });
      } else {
        log.info('request_ok', { statusCode, durationMs });
      }
      return res;
    } catch (error: any) {
      const durationMs = Date.now() - t0;
      log.error('request_exception', { error: error?.message, durationMs, stack: error?.stack });
      throw error;
    }
  };

  // Evitar 415 Unsupported Media Type en requests sin JSON (p.ej. GET con Content-Type distinto)
  return middy(base)
    .use(jsonBodyParser({ disableContentTypeError: true }))
    .use(httpErrorHandler());
}
