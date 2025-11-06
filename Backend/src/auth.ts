/// <reference types="node" />
import { PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { ddb } from './db';
import { withContext } from './logger';
import { withHttp } from './middleware/auth';

const USERS_TABLE = 'Users';

// Política de contraseña: min 8, 1 mayúscula, 1 número y 1 caracter especial
const PASSWORD_POLICY = z.string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .regex(/[A-Z]/, 'Debe incluir al menos una letra mayúscula')
  .regex(/[0-9]/, 'Debe incluir al menos un número')
  .regex(/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>\/?`~]/, 'Debe incluir al menos un caracter especial');

const RegisterSchema = z.object({
  email: z.string().email(),
  password: PASSWORD_POLICY,
  name: z.string().min(1)
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: PASSWORD_POLICY
});

export const register = withHttp(async (event: any, context: any) => {
  const log = (event as any).log || withContext({ fn: 'auth.register' });
  log.debug('register_start', {
    env: {
      endpoint: process.env.DYNAMODB_ENDPOINT,
      isLocal: process.env.IS_LOCAL,
      isOffline: process.env.IS_OFFLINE || process.env.SLS_OFFLINE,
      region: process.env.AWS_REGION
    }
  });

  const body = event.body || {};
  const parsed = RegisterSchema.safeParse(body);
  if (!parsed.success) {
    return { statusCode: 400, body: JSON.stringify({ message: 'Payload inválido', issues: parsed.error.issues }) };
  }
  const { email, password, name } = parsed.data;
  const userId = email.toLowerCase(); // asumimos userId = email para consultas directas

  // Hash configurable por entorno (BCRYPT_SALT_ROUNDS), por defecto 6 en local
  const saltRounds = Number.parseInt(process.env.BCRYPT_SALT_ROUNDS || '6', 10);
  const passwordHash = await bcrypt.hash(password, saltRounds);
  try {
    log.debug('ddb_put_start', { table: USERS_TABLE, userId });
    await ddb.send(new PutCommand({
      TableName: USERS_TABLE,
      Item: { userId, email: userId, name, passwordHash, createdAt: new Date().toISOString() },
      ConditionExpression: 'attribute_not_exists(userId)'
    }));
    log.debug('ddb_put_done', { userId });
  } catch (err: any) {
    if (err?.name === 'ConditionalCheckFailedException') {
      return { statusCode: 409, body: JSON.stringify({ message: 'Usuario ya existe' }) };
    }
    log.error({ msg: 'register_error', error: err?.message, stack: err?.stack });
    return { statusCode: 500, body: JSON.stringify({ message: 'Error interno' }) };
  }

  log.debug('user_registered', { userId });
  const secret = process.env.JWT_SECRET || 'dev-secret';
  const token = jwt.sign({ userId, email: userId, name }, secret, { expiresIn: '1d' });
  return { statusCode: 201, body: JSON.stringify({ token, user: { userId, email: userId, name } }) };
}, { required: false });

export const login = withHttp(async (event: any, context: any) => {
  const log = (event as any).log || withContext({ fn: 'auth.login' });
  log.debug('login_start', {
    env: {
      endpoint: process.env.DYNAMODB_ENDPOINT,
      isLocal: process.env.IS_LOCAL,
      isOffline: process.env.IS_OFFLINE || process.env.SLS_OFFLINE,
      region: process.env.AWS_REGION
    }
  });

  const body = event.body || {};
  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) {
    return { statusCode: 400, body: JSON.stringify({ message: 'Payload inválido', issues: parsed.error.issues }) };
  }
  const { email, password } = parsed.data;
  const userId = email.toLowerCase();

  log.debug('ddb_get_start', { table: USERS_TABLE, userId });
  const res = await ddb.send(new GetCommand({ TableName: USERS_TABLE, Key: { userId } }));
  log.debug('ddb_get_done', { found: Boolean(res.Item) });
  const user = res.Item as any;
  if (!user) return { statusCode: 401, body: JSON.stringify({ message: 'Credenciales inválidas' }) };

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return { statusCode: 401, body: JSON.stringify({ message: 'Credenciales inválidas' }) };

  const secret = process.env.JWT_SECRET || 'dev-secret';
  const token = jwt.sign({ userId: user.userId, email: user.email, name: user.name }, secret, { expiresIn: '1d' });
  log.debug('user_login', { userId });
  return { statusCode: 200, body: JSON.stringify({ token, user: { userId: user.userId, email: user.email, name: user.name } }) };
}, { required: false });
