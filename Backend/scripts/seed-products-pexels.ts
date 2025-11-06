/// <reference types="node" />
import 'dotenv/config'
import axios from 'axios'
import pLimit from 'p-limit'
import fs from 'fs-extra'
import path from 'path'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { BatchWriteCommand, DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb'

const PEXELS_API_KEY = process.env.PEXELS_API_KEY
if (!PEXELS_API_KEY) {
  console.error('ERROR: define PEXELS_API_KEY en variables de entorno o en un .env (PEXELS_API_KEY=...)')
  process.exit(1)
}

const preferIPv4 = (process.env.DDB_PREFER_IPV4 || 'true').toLowerCase() === 'true'
let endpoint = process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000'
if (preferIPv4 && endpoint.includes('localhost')) endpoint = endpoint.replace('localhost', '127.0.0.1')
const region = process.env.AWS_REGION || 'us-east-1'

const client = new DynamoDBClient({
  region,
  endpoint,
  credentials: { accessKeyId: 'dummy', secretAccessKey: 'dummy' }
})
const ddb = DynamoDBDocumentClient.from(client, { marshallOptions: { removeUndefinedValues: true } })

const TABLE = process.env.TABLE || 'Products'
const FALLBACK_IMAGE = process.env.FALLBACK_IMAGE || 'https://via.placeholder.com/600x400?text=No+Image'
const SEED_COUNT = parseInt(process.env.SEED_COUNT || '100', 10)
const CONCURRENCY = parseInt(process.env.PEXELS_CONCURRENCY || '4', 10)
const CACHE_PATH = process.env.PEXELS_CACHE || path.resolve(process.cwd(), '.cache/pexels.json')

type Category = 'futbol' | 'baloncesto' | 'tenis' | 'running' | 'natacion' | 'ciclismo' | 'gimnasio' | 'yoga' | 'padel' | 'voleibol' | 'rugby'

interface SeedProduct {
  productId: string
  name: string
  price: number
  category: Category
  stock: number
  image?: string | null
  brand?: string
  description?: string
  createdAt?: string
}

function pad(n: number, width = 4) { return n.toString().padStart(width, '0') }
function randomInt(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min }
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] }

const BRANDS = [
  'Nike', 'Adidas', 'Puma', 'Under Armour', 'Reebok', 'New Balance', 'Asics', 'Mizuno', 'Wilson', 'Spalding',
  'Head', 'Babolat', 'Yonex', 'Everlast', 'Columbia', 'The North Face', 'Salomon', 'Garmin', 'Decathlon', 'Joma'
]

const CATEGORIES: Category[] = ['futbol','baloncesto','tenis','running','natacion','ciclismo','gimnasio','yoga','padel','voleibol','rugby']

const PRODUCTS_BY_CAT: Record<Category, { name: string; keyword: string }[]> = {
  futbol: [
    { name: 'Balón de Fútbol', keyword: 'soccer ball' },
    { name: 'Botines de Fútbol', keyword: 'soccer boots' },
    { name: 'Canilleras', keyword: 'soccer shin guards' },
    { name: 'Guantes de Portero', keyword: 'goalkeeper gloves' },
    { name: 'Conos de Entrenamiento', keyword: 'soccer training cones' },
    { name: 'Red de Arco', keyword: 'soccer goal net' },
    { name: 'Camiseta de Fútbol', keyword: 'soccer jersey' },
    { name: 'Short de Fútbol', keyword: 'soccer shorts' },
    { name: 'Medias de Fútbol', keyword: 'soccer socks' },
    { name: 'Balón Futsal', keyword: 'futsal ball' }
  ],
  baloncesto: [
    { name: 'Balón de Baloncesto', keyword: 'basketball ball' },
    { name: 'Aro de Baloncesto', keyword: 'basketball hoop' },
    { name: 'Muñequeras', keyword: 'basketball wristbands' },
    { name: 'Rodilleras', keyword: 'basketball knee pads' },
    { name: 'Camiseta de Baloncesto', keyword: 'basketball jersey' },
    { name: 'Short de Baloncesto', keyword: 'basketball shorts' },
    { name: 'Red de Aro', keyword: 'basketball net' },
    { name: 'Balón Street', keyword: 'street basketball' },
    { name: 'Soporte de Aro', keyword: 'basketball backboard' },
    { name: 'Mochila Baloncesto', keyword: 'basketball backpack' }
  ],
  tenis: [
    { name: 'Raqueta de Tenis', keyword: 'tennis racket' },
    { name: 'Pelotas de Tenis', keyword: 'tennis balls' },
    { name: 'Grip Raqueta', keyword: 'tennis grip' },
    { name: 'Mochila Tenis', keyword: 'tennis bag' },
    { name: 'Muñequera Absorbente', keyword: 'tennis wristband' },
    { name: 'Cinta de Cabeza', keyword: 'tennis headband' },
    { name: 'Cuerdas de Raqueta', keyword: 'tennis strings' },
    { name: 'Overgrip', keyword: 'tennis overgrip' },
    { name: 'Vibrador Antivibración', keyword: 'tennis vibration dampener' },
    { name: 'Visera Tenis', keyword: 'tennis visor' }
  ],
  running: [
    { name: 'Zapatillas Running', keyword: 'running shoes' },
    { name: 'Cinturón Hidratación', keyword: 'running hydration belt' },
    { name: 'Calcetas Compresión', keyword: 'compression socks running' },
    { name: 'Camiseta Running', keyword: 'running shirt' },
    { name: 'Short Running', keyword: 'running shorts' },
    { name: 'Gorra Running', keyword: 'running cap' },
    { name: 'Chaleco Reflectante', keyword: 'running reflective vest' },
    { name: 'Reloj Deportivo', keyword: 'sport watch running' },
    { name: 'Porta Celular Brazo', keyword: 'running armband' },
    { name: 'Chaqueta Cortaviento', keyword: 'running windbreaker' }
  ],
  natacion: [
    { name: 'Lentes de Natación', keyword: 'swimming goggles' },
    { name: 'Aletas', keyword: 'swim fins' },
    { name: 'Gorro de Natación', keyword: 'swim cap' },
    { name: 'Traje de Baño', keyword: 'swimsuit' },
    { name: 'Tabla de Patada', keyword: 'kickboard swim' },
    { name: 'Pull Buoy', keyword: 'pull buoy' },
    { name: 'Pinza para Nariz', keyword: 'swim nose clip' },
    { name: 'Tapones de Oído', keyword: 'ear plugs swimming' },
    { name: 'Mochila Natación', keyword: 'swimming backpack' },
    { name: 'Toalla Microfibra', keyword: 'microfiber towel swim' }
  ],
  ciclismo: [
    { name: 'Casco Ciclismo', keyword: 'cycling helmet' },
    { name: 'Guantes Ciclismo', keyword: 'cycling gloves' },
    { name: 'Maillot', keyword: 'cycling jersey' },
    { name: 'Pantalón con Badana', keyword: 'cycling bib shorts' },
    { name: 'Gafas Ciclismo', keyword: 'cycling sunglasses' },
    { name: 'Luz Delantera', keyword: 'bike front light' },
    { name: 'Luz Trasera', keyword: 'bike rear light' },
    { name: 'Ciclocomputador', keyword: 'bike computer' },
    { name: 'Bidón 750ml', keyword: 'bike bottle' },
    { name: 'Bomba de Mano', keyword: 'bike hand pump' }
  ],
  gimnasio: [
    { name: 'Mancuernas 5kg', keyword: 'dumbbells' },
    { name: 'Kettlebell 12kg', keyword: 'kettlebell' },
    { name: 'Barra Olímpica', keyword: 'olympic barbell' },
    { name: 'Discos 2.5kg', keyword: 'weight plates' },
    { name: 'Soga de Batalla', keyword: 'battle rope' },
    { name: 'Cuerda para Saltar', keyword: 'jump rope' },
    { name: 'Esterilla Antideslizante', keyword: 'gym mat' },
    { name: 'Rodillo Foam', keyword: 'foam roller' },
    { name: 'Guantes de Gimnasio', keyword: 'gym gloves' },
    { name: 'Tensor de Mano', keyword: 'hand grip strengthener' }
  ],
  yoga: [
    { name: 'Colchoneta de Yoga', keyword: 'yoga mat' },
    { name: 'Bloques de Yoga', keyword: 'yoga blocks' },
    { name: 'Cinturón de Yoga', keyword: 'yoga strap' },
    { name: 'Rueda de Yoga', keyword: 'yoga wheel' },
    { name: 'Bolster', keyword: 'yoga bolster' },
    { name: 'Bolsa para Mat', keyword: 'yoga mat bag' },
    { name: 'Toalla Antideslizante', keyword: 'yoga towel' },
    { name: 'Cojín de Meditación', keyword: 'meditation cushion' },
    { name: 'Calcetines Yoga', keyword: 'yoga socks' },
    { name: 'Esterilla Viaje', keyword: 'travel yoga mat' }
  ],
  padel: [
    { name: 'Pala de Pádel', keyword: 'padel racket' },
    { name: 'Pelotas de Pádel', keyword: 'padel balls' },
    { name: 'Overgrip Pádel', keyword: 'padel overgrip' },
    { name: 'Muñequera Pádel', keyword: 'padel wristband' },
    { name: 'Protector Marco', keyword: 'padel racket protector' },
    { name: 'Bolso Pádel', keyword: 'padel bag' },
    { name: 'Camiseta Pádel', keyword: 'padel jersey' },
    { name: 'Short Pádel', keyword: 'padel shorts' },
    { name: 'Antivibrador Pádel', keyword: 'padel vibration dampener' },
    { name: 'Calcetas Pádel', keyword: 'padel socks' }
  ],
  voleibol: [
    { name: 'Balón de Voleibol', keyword: 'volleyball ball' },
    { name: 'Rodilleras Voleibol', keyword: 'volleyball knee pads' },
    { name: 'Red de Voleibol', keyword: 'volleyball net' },
    { name: 'Malla Antitranspirante', keyword: 'sports t shirt volleyball' },
    { name: 'Short Voleibol', keyword: 'volleyball shorts' },
    { name: 'Indicador de Antenas', keyword: 'volleyball antenna' },
    { name: 'Silbato Árbitro', keyword: 'referee whistle' },
    { name: 'Bolsa para Balones', keyword: 'ball bag' },
    { name: 'Muñequeras', keyword: 'wristbands' },
    { name: 'Mochila Voleibol', keyword: 'volleyball backpack' }
  ],
  rugby: [
    { name: 'Balón de Rugby', keyword: 'rugby ball' },
    { name: 'Protector Bucal', keyword: 'rugby mouthguard' },
    { name: 'Hombros Protector', keyword: 'rugby shoulder pads' },
    { name: 'Botines Rugby', keyword: 'rugby boots' },
    { name: 'Camiseta Rugby', keyword: 'rugby jersey' },
    { name: 'Short Rugby', keyword: 'rugby shorts' },
    { name: 'Medias Rugby', keyword: 'rugby socks' },
    { name: 'Conos de Entrenamiento', keyword: 'rugby cones' },
    { name: 'Guantes de Entrenamiento', keyword: 'rugby gloves' },
    { name: 'Gorro Scrum', keyword: 'scrum cap' }
  ]
}

type CacheMap = Record<string, string>
async function loadCache(): Promise<CacheMap> {
  try {
    if (await fs.pathExists(CACHE_PATH)) {
      return await fs.readJSON(CACHE_PATH)
    }
  } catch {}
  await fs.ensureDir(path.dirname(CACHE_PATH))
  return {}
}
async function saveCache(cache: CacheMap) {
  await fs.writeJSON(CACHE_PATH, cache, { spaces: 2 })
}

async function searchPexels(query: string, cache: CacheMap): Promise<string | null> {
  if (cache[query]) return cache[query]
  const url = 'https://api.pexels.com/v1/search'
  try {
    const res = await axios.get(url, {
      headers: { Authorization: PEXELS_API_KEY },
      params: { query, per_page: 1 },
      timeout: 15000
    })
    let found: string | null = null
    if (res.data && Array.isArray(res.data.photos) && res.data.photos.length > 0) {
      const photo = res.data.photos[0]
      found = photo.src?.large || photo.src?.original || photo.src?.medium || null
    }
    cache[query] = found || ''
    await saveCache(cache)
    return found
  } catch (err: any) {
    console.warn('Pexels error for:', query, err?.response?.status || err?.message || err)
    return null
  }
}

function buildProduct(i: number, brand: string, tpl: { name: string; keyword: string }, cat: Category, imgUrl: string | null): SeedProduct {
  const idNum = pad(i + 1)
  const name = `${tpl.name} ${brand}`
  const price = randomInt(9, 499)
  const stock = randomInt(0, 120)
  const productId = `${cat}-${idNum}`
  const description = `${tpl.name} de la marca ${brand}. Categoría: ${cat}. Ideal para entrenamientos y actividades deportivas.`
  const createdAt = new Date(Date.now() - randomInt(0, 30) * 24 * 3600 * 1000).toISOString()
  return { productId, name, price, category: cat, stock, image: imgUrl || FALLBACK_IMAGE, brand, description, createdAt }
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

async function batchWrite(items: SeedProduct[]) {
  const groups = chunk(items, 25)
  let total = 0
  for (const g of groups) {
    let requestItems: any = { [TABLE]: g.map((Item) => ({ PutRequest: { Item } })) }
    let attempts = 0
    while (true) {
      const res: any = await ddb.send(new BatchWriteCommand({ RequestItems: requestItems }))
      const unprocessed = res.UnprocessedItems
      const processedCount = (requestItems[TABLE]?.length || 0) - (unprocessed?.[TABLE]?.length || 0)
      total += processedCount
      if (unprocessed && unprocessed[TABLE] && unprocessed[TABLE].length > 0 && attempts < 5) {
        const delay = Math.pow(2, attempts) * 200 + randomInt(0, 200)
        await new Promise((r) => setTimeout(r, delay))
        requestItems = unprocessed as any
        attempts++
      } else {
        break
      }
    }
  }
  return total
}

async function clearTable() {
  console.log('Limpiando tabla', TABLE, '...')
  let lastKey: any = undefined
  let deleted = 0
  while (true) {
    const res: any = await ddb.send(new ScanCommand({ TableName: TABLE, ExclusiveStartKey: lastKey, ProjectionExpression: 'productId' }))
    const items = res.Items || []
    if (items.length) {
      const groups = chunk(items, 25)
      for (const g of groups) {
        const RequestItems = { [TABLE]: g.map((x: any) => ({ DeleteRequest: { Key: { productId: x.productId } } })) } as any
        await ddb.send(new BatchWriteCommand({ RequestItems }))
        deleted += g.length
      }
      console.log(`Eliminados: ${deleted}`)
    }
    if (!res.LastEvaluatedKey) break
    lastKey = res.LastEvaluatedKey
  }
  console.log('✔ Tabla vaciada')
}

async function main() {
  console.log(`Generando ${SEED_COUNT} productos con imágenes de Pexels en tabla ${TABLE}...`)

  await clearTable()

  const limit = pLimit(CONCURRENCY)
  const cache = await loadCache()

  const tasks: Promise<SeedProduct>[] = []
  for (let i = 0; i < SEED_COUNT; i++) {
    tasks.push(limit(async () => {
      const cat = pick(CATEGORIES)
      const tpl = pick(PRODUCTS_BY_CAT[cat])
      const brand = pick(BRANDS)
      const query = `${brand} ${tpl.keyword} ${cat}`
      const img = await searchPexels(query, cache)
      if (!img) console.warn('No se encontró imagen para:', query, '-> uso fallback')
      return buildProduct(i, brand, tpl, cat, img)
    }))
  }

  const items = await Promise.all(tasks)
  const inserted = await batchWrite(items)
  console.log(`✔ Inserción completada. Total insertados: ${inserted}/${items.length}`)
  console.log('Seed finalizado.')
}

main().catch((err) => {
  console.error('Seed error:', err)
  process.exit(1)
})
