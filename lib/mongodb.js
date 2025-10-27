import { MongoClient } from 'mongodb';

// PAKAI INI:
const uri = "mongodb+srv://ihome-rtogswd20_db_user:vloutueMK78R7NJ@ownblox-chat.edxuiar.mongodb.net/?appName=ownblox-chat";

let cachedClient = null;
let cachedDb = null;

export async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  try {
    console.log('Connecting to MongoDB...');
    const client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 10000,
    });
    
    await client.connect();
    console.log('✅ MongoDB Connected!');
    
    const db = client.db('chatapp');
    cachedClient = client;
    cachedDb = db;

    return { client, db };
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    throw error;
  }
}