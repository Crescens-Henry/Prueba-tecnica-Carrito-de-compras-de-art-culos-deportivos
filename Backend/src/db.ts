import 'dotenv/config'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import { NodeHttpHandler } from '@aws-sdk/node-http-handler'
import http from 'node:http'
import https from 'node:https'

const preferIPv4 = (process.env.DDB_PREFER_IPV4 || 'true').toLowerCase() === 'true'
let endpointFromEnv = process.env.DYNAMODB_ENDPOINT
if (preferIPv4 && endpointFromEnv && endpointFromEnv.includes('localhost')) {
  endpointFromEnv = endpointFromEnv.replace('localhost', '127.0.0.1')
}
const slsOffline = process.env.IS_OFFLINE === 'true' || process.env.SLS_OFFLINE === 'true'
const isLocalFlag = process.env.IS_LOCAL === 'true'
const isLocal = Boolean(endpointFromEnv) || slsOffline || isLocalFlag

const maxAttempts = Number.parseInt(process.env.DDB_MAX_ATTEMPTS || '1', 10)
const useCustomHttp = (process.env.DDB_USE_CUSTOM_HTTP || 'false').toLowerCase() === 'true'
const connTimeout = Number.parseInt(process.env.DDB_CONN_TIMEOUT_MS || '5000', 10)
const socketTimeout = Number.parseInt(process.env.DDB_SOCKET_TIMEOUT_MS || '10000', 10)

const baseConfig: any = {
  region: process.env.AWS_REGION || 'us-east-1',
  endpoint: isLocal ? (endpointFromEnv || 'http://127.0.0.1:8000') : undefined,
  credentials: isLocal ? { accessKeyId: 'dummy', secretAccessKey: 'dummy' } : undefined,
  maxAttempts
}

if (useCustomHttp) {
  // Reutilizar conexiones y bajar timeouts para desarrollo
  const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 50 })
  const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 50 })
  baseConfig.requestHandler = new NodeHttpHandler({ connectionTimeout: connTimeout, socketTimeout, httpAgent, httpsAgent })
}

export const ddb = DynamoDBDocumentClient.from(new DynamoDBClient(baseConfig), {
  marshallOptions: { removeUndefinedValues: true }
})
