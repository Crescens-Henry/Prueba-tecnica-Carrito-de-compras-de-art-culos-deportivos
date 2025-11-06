/// <reference types="node" />
import {
  CreateTableCommand,
  DynamoDBClient,
  ListTablesCommand,
  KeySchemaElement,
  AttributeDefinition
} from '@aws-sdk/client-dynamodb';

const preferIPv4 = (process.env.DDB_PREFER_IPV4 || 'true').toLowerCase() === 'true';
let endpoint = process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000';
if (preferIPv4 && endpoint.includes('localhost')) {
  endpoint = endpoint.replace('localhost', '127.0.0.1');
}
const region = process.env.AWS_REGION || 'us-east-1';

const client = new DynamoDBClient({
  region,
  endpoint,
  credentials: { accessKeyId: 'dummy', secretAccessKey: 'dummy' }
});

async function tableExists(tableName: string) {
  const out = await client.send(new ListTablesCommand({}));
  return (out.TableNames || []).includes(tableName);
}

async function ensureTable(
  tableName: string,
  keySchema: KeySchemaElement[],
  attributeDefinitions: AttributeDefinition[]
) {
  if (await tableExists(tableName)) {
    console.log(`✔ Table already exists: ${tableName}`);
    return;
  }
  await client.send(
    new CreateTableCommand({
      TableName: tableName,
      KeySchema: keySchema,
      AttributeDefinitions: attributeDefinitions,
      BillingMode: 'PAY_PER_REQUEST'
    })
  );
  console.log(`✔ Created table: ${tableName}`);
}

async function main() {
  console.log(`Using DynamoDB at ${endpoint} (${region})`);

  // 1) Usuarios: PK userId
  await ensureTable(
    'Users',
    [
      { AttributeName: 'userId', KeyType: 'HASH' }
    ],
    [
      { AttributeName: 'userId', AttributeType: 'S' }
    ]
  );

  // 2) Productos: PK productId
  await ensureTable(
    'Products',
    [
      { AttributeName: 'productId', KeyType: 'HASH' }
    ],
    [
      { AttributeName: 'productId', AttributeType: 'S' }
    ]
  );

  // 3) Carritos: PK userId, SK productId  (un item por producto en el carrito)
  await ensureTable(
    'Carts',
    [
      { AttributeName: 'userId', KeyType: 'HASH' },
      { AttributeName: 'productId', KeyType: 'RANGE' }
    ],
    [
      { AttributeName: 'userId', AttributeType: 'S' },
      { AttributeName: 'productId', AttributeType: 'S' }
    ]
  );

  // 4) Orders (Historial): PK userId, SK orderId
  await ensureTable(
    'Orders',
    [
      { AttributeName: 'userId', KeyType: 'HASH' },
      { AttributeName: 'orderId', KeyType: 'RANGE' }
    ],
    [
      { AttributeName: 'userId', AttributeType: 'S' },
      { AttributeName: 'orderId', AttributeType: 'S' }
    ]
  );

  console.log('All tables ensured.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
