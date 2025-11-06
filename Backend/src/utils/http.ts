export function ok(data: any, headers: Record<string, string> = {}) {
  return response(200, data, headers);
}

export function badRequest(message: string, details?: any) {
  return response(400, { message, details });
}

export function unauthorized(message = 'No autorizado') {
  return response(401, { message });
}

export function notFound(message = 'No encontrado') {
  return response(404, { message });
}

export function response(statusCode: number, data: any, headers: Record<string, string> = {}) {
  return {
    statusCode,
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(data)
  };
}

export function decodeCursor(cursor?: string): any | undefined {
  if (!cursor) return undefined;
  try {
    return JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8'));
  } catch {
    return undefined;
  }
}

export function encodeCursor(obj?: any): string | undefined {
  if (!obj) return undefined;
  return Buffer.from(JSON.stringify(obj)).toString('base64');
}
