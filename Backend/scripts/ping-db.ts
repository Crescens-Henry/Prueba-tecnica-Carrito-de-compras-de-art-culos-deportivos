/// <reference types="node" />
import { ScanCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../src/db';

async function main() {
  const start = Date.now();
  console.log('PING DB - Using endpoint:', process.env.DYNAMODB_ENDPOINT || '(none)');
  const out = await ddb.send(new ScanCommand({ TableName: 'Users', Limit: 1 }));
  const ms = Date.now() - start;
  console.log('OK Scan Users, count:', out.Count ?? 0, 'timeMs:', ms);
}

main().catch((err) => {
  console.error('PING DB ERROR:', err);
  process.exit(1);
});
