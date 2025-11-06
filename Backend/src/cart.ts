/// <reference types="node" />
import { GetCommand, PutCommand, QueryCommand, UpdateCommand, DeleteCommand, BatchGetCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from './db';
import { withHttp } from './middleware/auth';
import { ok, badRequest, notFound } from './utils/http';
import { withContext } from './logger';

const CARTS_TABLE = 'Carts';
const PRODUCTS_TABLE = 'Products';

type AuthEvent = any & { auth?: { user?: { userId: string } } };

export const getCart = withHttp(async (event: AuthEvent) => {
  const log = (event as any).log || withContext({ fn: 'cart.get' });
  const userId = event?.auth?.user?.userId;
  // Caché en memoria por usuario para respuestas repetidas en un corto periodo
  const CACHE_TTL_MS = parseInt(process.env.CART_CACHE_TTL_MS || '0', 10);
  const cacheKey = `cart:${userId}`;
  const now = Date.now();
  const g: any = global as any;
  g.__cartCache = g.__cartCache || new Map<string, { at: number; value: any }>();
  const cache: Map<string, { at: number; value: any }> = g.__cartCache;
  const cached = cache.get(cacheKey);
  if (CACHE_TTL_MS > 0 && cached && now - cached.at < CACHE_TTL_MS) {
    log.debug('cart_cache_hit', { ageMs: now - cached.at });
    return ok(cached.value);
  }

  const t0 = Date.now();
  const res = await ddb.send(new QueryCommand({
    TableName: CARTS_TABLE,
    KeyConditionExpression: '#u = :u',
    ExpressionAttributeNames: { '#u': 'userId' },
    ExpressionAttributeValues: { ':u': userId },
    ProjectionExpression: 'userId, productId, quantity, priceAtAdd, updatedAt, addedAt',
    ConsistentRead: false
  }));
  const items = res.Items || [];
  // Enriquecer en backend para evitar N+1 desde el frontend
  let productsById: Record<string, any> = {};
  if (items.length > 0) {
    const keys = items.map((it: any) => ({ productId: it.productId }));
    const batch = await ddb.send(new BatchGetCommand({
      RequestItems: {
        [PRODUCTS_TABLE]: {
          Keys: keys,
          ProjectionExpression: 'productId, #n, image, price, stock',
          ExpressionAttributeNames: { '#n': 'name' }
        }
      }
    }));
    const prodList = (batch.Responses && (batch.Responses as any)[PRODUCTS_TABLE]) || [];
    productsById = Object.fromEntries(prodList.map((p: any) => [p.productId, p]));
  }

  const enriched = items.map((it: any) => {
    const p = productsById[it.productId] || {};
    return {
      ...it,
      name: p.name,
      image: p.image,
      currentPrice: p.price,
      stock: p.stock
    };
  });
  const total = enriched.reduce((acc: number, it: any) => acc + (it.quantity || 0) * (it.priceAtAdd || 0), 0);
  const payload = { items: enriched, total };
  if (CACHE_TTL_MS > 0) cache.set(cacheKey, { at: now, value: payload });
  const t1 = Date.now();
  log.debug('cart_get', { count: items.length, total, ms: t1 - t0 });
  return ok(payload);
});

export const addItem = withHttp(async (event: AuthEvent) => {
  const log = (event as any).log || withContext({ fn: 'cart.add' });
  const userId = event?.auth?.user?.userId;
  const body = event.body || {};
  const productId = String(body.productId || '').trim();
  const qty = Math.max(1, Number(body.quantity ?? 1));
  if (!productId) return badRequest('productId requerido');

  const prod = await ddb.send(new GetCommand({ TableName: PRODUCTS_TABLE, Key: { productId } }));
  if (!prod.Item) return notFound('Producto no existe');
  const price = (prod.Item as any).price || 0;

  const now = new Date().toISOString();
  await ddb.send(new UpdateCommand({
    TableName: CARTS_TABLE,
    Key: { userId, productId },
    UpdateExpression: 'SET quantity = if_not_exists(quantity, :zero) + :inc, priceAtAdd = if_not_exists(priceAtAdd, :p), updatedAt = :now, addedAt = if_not_exists(addedAt, :now)',
    ExpressionAttributeValues: { ':zero': 0, ':inc': qty, ':p': price, ':now': now },
    ReturnValues: 'ALL_NEW'
  }));
  // invalidar caché del carrito del usuario
  const g: any = global as any;
  if (g.__cartCache) g.__cartCache.delete(`cart:${userId}`);

  log.debug('cart_add', { productId, qty });
  return ok({ ok: true });
});

export const updateItem = withHttp(async (event: AuthEvent) => {
  const log = (event as any).log || withContext({ fn: 'cart.update' });
  const userId = event?.auth?.user?.userId;
  const productId = String(event.pathParameters?.productId || '').trim();
  const body = event.body || {};
  const quantity = Number(body.quantity);
  if (!productId) return badRequest('productId requerido');
  if (!Number.isFinite(quantity)) return badRequest('quantity inválido');

  if (quantity <= 0) {
    await ddb.send(new DeleteCommand({ TableName: CARTS_TABLE, Key: { userId, productId } }));
    const g: any = global as any;
    if (g.__cartCache) g.__cartCache.delete(`cart:${userId}`);
    log.debug('cart_delete_by_update', { productId });
    return ok({ deleted: true });
  }

  const now = new Date().toISOString();
  const res = await ddb.send(new UpdateCommand({
    TableName: CARTS_TABLE,
    Key: { userId, productId },
    UpdateExpression: 'SET quantity = :q, updatedAt = :now',
    ExpressionAttributeValues: { ':q': quantity, ':now': now },
    ConditionExpression: 'attribute_exists(userId) AND attribute_exists(productId)',
    ReturnValues: 'ALL_NEW'
  }));

  if (!res.Attributes) return notFound('Item no existe');
  const g: any = global as any;
  if (g.__cartCache) g.__cartCache.delete(`cart:${userId}`);
  log.debug('cart_update', { productId, quantity });
  return ok(res.Attributes);
});

export const deleteItem = withHttp(async (event: AuthEvent) => {
  const log = (event as any).log || withContext({ fn: 'cart.delete' });
  const userId = event?.auth?.user?.userId;
  const productId = String(event.pathParameters?.productId || '').trim();
  if (!productId) return badRequest('productId requerido');
  await ddb.send(new DeleteCommand({ TableName: CARTS_TABLE, Key: { userId, productId } }));
  const g: any = global as any;
  if (g.__cartCache) g.__cartCache.delete(`cart:${userId}`);
  log.debug('cart_delete', { productId });
  return ok({ deleted: true });
});
