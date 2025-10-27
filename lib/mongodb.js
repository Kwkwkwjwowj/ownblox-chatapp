import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
let cachedClient = null;
let cachedDb = null;

export async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const client = new MongoClient(uri);
  
  await client.connect();
  const db = client.db('chatapp');

  cachedClient = client;
  cachedDb = db;

  return { client, db };
}