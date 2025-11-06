/// <reference types="node" />
import { BatchWriteCommand, GetCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from './db';
import { withHttp } from './middleware/auth';
import { ok, badRequest, notFound, encodeCursor, decodeCursor } from './utils/http';
import { randomUUID } from 'node:crypto';
import { withContext } from './logger';
import { sendOrderConfirmationEmail } from './utils/email';

const CARTS_TABLE = 'Carts';
const ORDERS_TABLE = 'Orders';
const PRODUCTS_TABLE = 'Products';

type AuthEvent = any & { auth?: { user?: { userId: string } } };

export const checkout = withHttp(async (event: AuthEvent) => {
  const log = (event as any).log || withContext({ fn: 'orders.checkout' });
  const userId = event?.auth?.user?.userId;
  // Obtener items del carrito
  const cart = await ddb.send(new QueryCommand({
    TableName: CARTS_TABLE,
    KeyConditionExpression: '#u = :u',
    ExpressionAttributeNames: { '#u': 'userId' },
    ExpressionAttributeValues: { ':u': userId }
  }));
  const items = (cart.Items || []) as any[];
  if (items.length === 0) return badRequest('Carrito vacío');

  // Calcular totales
  const orderItems = items.map((it) => ({
    productId: it.productId,
    quantity: it.quantity || 0,
    price: it.priceAtAdd || 0,
    subtotal: (it.quantity || 0) * (it.priceAtAdd || 0)
  }));
  const total = orderItems.reduce((acc, it) => acc + it.subtotal, 0);
  const orderId = randomUUID();
  const createdAt = new Date().toISOString();

  // Guardar orden
  await ddb.send(new PutCommand({
    TableName: ORDERS_TABLE,
    Item: { userId, orderId, items: orderItems, total, status: 'CREATED', createdAt }
  }));

  // Vaciar carrito (batch delete)
  const chunks: any[][] = [];
  for (let i = 0; i < items.length; i += 25) chunks.push(items.slice(i, i + 25));
  for (const chunk of chunks) {
    const RequestItems = {
      [CARTS_TABLE]: chunk.map((it) => ({ DeleteRequest: { Key: { userId, productId: it.productId } } }))
    } as any;
    await ddb.send(new BatchWriteCommand({ RequestItems }));
  }

  log.debug('order_created', { orderId, total, itemsCount: orderItems.length });
  // Enviar correo de confirmación (no bloqueante para el usuario)
  try {
    const toEmail = event?.auth?.user?.email || userId;
    const toName = event?.auth?.user?.name || toEmail;
    await sendOrderConfirmationEmail({ email: toEmail, name: toName }, {
      orderId,
      total,
      items: orderItems,
      createdAt
    });
    log.info('order_confirmation_email_sent', { orderId, toEmail });
  } catch (err: any) {
    log.warn('order_confirmation_email_failed', { orderId, error: err?.message });
  }

  return ok({ orderId, total, items: orderItems, createdAt });
});

export const listOrders = withHttp(async (event: AuthEvent) => {
  const log = (event as any).log || withContext({ fn: 'orders.list' });
  const userId = event?.auth?.user?.userId;
  const pageSize = Math.min(50, Math.max(1, Number(event?.queryStringParameters?.pageSize ?? 20)));
  const cursor = event?.queryStringParameters?.cursor as string | undefined;
  const startKey = decodeCursor(cursor);

  const res = await ddb.send(new QueryCommand({
    TableName: ORDERS_TABLE,
    KeyConditionExpression: '#u = :u',
    ExpressionAttributeNames: { '#u': 'userId' },
    ExpressionAttributeValues: { ':u': userId },
    Limit: pageSize,
    ExclusiveStartKey: startKey
  }));

  const items = res.Items || [];
  const cursorNext = encodeCursor(res.LastEvaluatedKey);
  log.debug('orders_list', { count: items.length, hasNext: Boolean(cursorNext) });
  return ok({ items, pageSize, cursorNext });
});

export const getOrder = withHttp(async (event: AuthEvent) => {
  const log = (event as any).log || withContext({ fn: 'orders.detail' });
  const userId = event?.auth?.user?.userId;
  const orderId = event?.pathParameters?.orderId;
  if (!orderId) return badRequest('orderId requerido');

  const out = await ddb.send(new GetCommand({ TableName: ORDERS_TABLE, Key: { userId, orderId } }));
  if (!out.Item) return notFound('Orden no encontrada');
  log.debug('order_detail', { orderId });
  return ok(out.Item);
});
