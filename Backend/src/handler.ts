import { PutCommand, GetCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from './db';
import { withContext } from './logger';
import { randomUUID } from 'crypto';

const TABLE = process.env.TABLE_NAME || 'Items';

type APIGatewayEvent = { body?: string; headers?: Record<string, string>; pathParameters?: Record<string, string> };

type LambdaContext = { awsRequestId: string };

export const create = async (event: APIGatewayEvent, context: LambdaContext) => {
  const correlationId = event.headers?.['x-correlation-id'] || context.awsRequestId;
  const log = withContext({ fn: 'create', correlationId });

  try {
    const body = JSON.parse(event.body || '{}');
    if (!body?.name) return { statusCode: 400, body: JSON.stringify({ error: 'name_required' }) };

    const id = randomUUID();
    const item = { id, name: body.name, createdAt: new Date().toISOString() };
    await ddb.send(new PutCommand({ TableName: TABLE, Item: item }));
    log.info({ msg: 'created', id });

    return { statusCode: 201, body: JSON.stringify({ id }) };
  } catch (e: any) {
    log.error({ msg: 'create_fail', error: e.message });
    return { statusCode: 500, body: JSON.stringify({ error: 'internal_error' }) };
  }
};

export const get = async (event: APIGatewayEvent, context: LambdaContext) => {
  const correlationId = event.headers?.['x-correlation-id'] || context.awsRequestId;
  const log = withContext({ fn: 'get', correlationId });

  try {
    const id = event.pathParameters?.id;
    const r = await ddb.send(new GetCommand({ TableName: TABLE, Key: { id } }));
    if (!r.Item) return { statusCode: 404, body: JSON.stringify({ error: 'not_found' }) };

    log.info({ msg: 'fetched', id });
    return { statusCode: 200, body: JSON.stringify(r.Item) };
  } catch (e: any) {
    log.error({ msg: 'get_fail', error: e.message });
    return { statusCode: 500, body: JSON.stringify({ error: 'internal_error' }) };
  }
};

export const list = async (_event: APIGatewayEvent, context: LambdaContext) => {
  const correlationId = context.awsRequestId;
  const log = withContext({ fn: 'list', correlationId });

  try {
    const r = await ddb.send(new ScanCommand({ TableName: TABLE, Limit: 50 }));
    log.info({ msg: 'listed', count: r.Items?.length || 0 });
    return { statusCode: 200, body: JSON.stringify(r.Items || []) };
  } catch (e: any) {
    log.error({ msg: 'list_fail', error: e.message });
    return { statusCode: 500, body: JSON.stringify({ error: 'internal_error' }) };
  }
};
