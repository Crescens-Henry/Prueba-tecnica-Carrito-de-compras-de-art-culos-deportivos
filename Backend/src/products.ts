import { GetCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from './db';
import { withHttp } from './middleware/auth';
import { productQuerySchema } from './schemas';
import { ok, badRequest, notFound, decodeCursor, encodeCursor } from './utils/http';
import { withContext } from './logger';

const PRODUCTS_TABLE = 'Products';
// Caché en memoria para acelerar listados repetidos en desarrollo
const CACHE_TTL_MS = parseInt(process.env.PRODUCTS_CACHE_TTL_MS || '15000', 10);
const listCache = new Map<string, { at: number; value: any }>();

export const list = withHttp(async (event) => {
  const log = (event as any).log || withContext({ fn: 'products.list' });
  const query = productQuerySchema.safeParse(event.queryStringParameters || {});
  if (!query.success) return badRequest('Query inválida', query.error.flatten());
  const { pageSize, cursor, search, category, min, max, sort } = query.data;
  log.debug('products_list_req', { pageSize, hasCursor: Boolean(cursor), search, category, min, max, sort });

  const t0 = Date.now();
  const startKey = decodeCursor(cursor);

  const expNames: Record<string, string> = {};
  const expValues: Record<string, any> = {};
  const filters: string[] = [];

  if (search) {
    expNames['#name'] = 'name';
    expValues[':term'] = search;
    filters.push('contains(#name, :term)');
  }
  if (category) {
    expNames['#category'] = 'category';
    expValues[':category'] = category;
    filters.push('#category = :category');
  }
  if (typeof min === 'number') {
    expNames['#price'] = 'price';
    expValues[':min'] = min;
    filters.push('#price >= :min');
  }
  if (typeof max === 'number') {
    expNames['#price'] = 'price';
    expValues[':max'] = max;
    filters.push('#price <= :max');
  }

  const FilterExpression = filters.length ? filters.join(' AND ') : undefined;
  const ExpressionAttributeNames = Object.keys(expNames).length ? expNames : undefined;
  const ExpressionAttributeValues = Object.keys(expValues).length ? expValues : undefined;

  // Proyección para reducir payload: sólo campos necesarios para la UI
  const projNames = { '#id': 'productId', '#name': 'name', '#price': 'price', '#cat': 'category', '#img': 'image', '#stk': 'stock' }
  const ProjectionExpression = '#id, #name, #price, #cat, #img, #stk'
  const cacheKey = JSON.stringify({ pageSize, cursor: startKey, search: search || '', category: category || '', min: min ?? null, max: max ?? null, sort: sort || '' });
  const now = Date.now();
  const cached = listCache.get(cacheKey);
  if (cached && now - cached.at < CACHE_TTL_MS) {
    log.debug('products_list_cache_hit', { ageMs: now - cached.at });
    return ok(cached.value);
  }

  const res = await ddb.send(new ScanCommand({
    TableName: PRODUCTS_TABLE,
    Limit: pageSize,
    ExclusiveStartKey: startKey,
    FilterExpression,
    ProjectionExpression,
    ExpressionAttributeNames: { ...(ExpressionAttributeNames || {}), ...projNames },
    ExpressionAttributeValues
  }));

  let items = res.Items || [];

  if (sort === 'price_asc') items.sort((a: any, b: any) => a.price - b.price);
  if (sort === 'price_desc') items.sort((a: any, b: any) => b.price - a.price);
  if (sort === 'name_asc') items.sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));
  if (sort === 'name_desc') items.sort((a: any, b: any) => (b.name || '').localeCompare(a.name || ''));

  const cursorNext = encodeCursor(res.LastEvaluatedKey as any);
  const payload = { items, pageSize, cursorNext };
  listCache.set(cacheKey, { at: now, value: payload });
  const t1 = Date.now();
  log.debug('products_list_res', { count: items.length, hasNext: Boolean(cursorNext), ms: t1 - t0 });
  return ok(payload);
});

export const getById = withHttp(async (event) => {
  const log = (event as any).log || withContext({ fn: 'products.getById' });
  const id = event.pathParameters?.id;
  if (!id) return badRequest('Falta id');
  // Caché simple por id
  const cacheKey = `detail:${id}`;
  const now = Date.now();
  const cached = listCache.get(cacheKey);
  if (cached && now - cached.at < CACHE_TTL_MS) {
    log.debug('product_detail_cache_hit', { id });
    return ok(cached.value);
  }

  const t0 = Date.now();
  const out = await ddb.send(new GetCommand({ TableName: PRODUCTS_TABLE, Key: { productId: id } }));
  const t1 = Date.now();
  if (!out.Item) return notFound('Producto no encontrado');
  const payload = out.Item;
  listCache.set(cacheKey, { at: now, value: payload });
  log.debug('product_detail', { id, ms: t1 - t0 });
  return ok(payload);
});
