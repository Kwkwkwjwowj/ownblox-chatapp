import { MongoClient } from 'mongodb';

const uri = "mongodb+srv://ihome-rtogswd20_db_user:vloutueMK78R7NJ@ownblox-chat.edxuiar.mongodb.net/?appName=ownblox-chat";

let cachedClient = null;
let cachedDb = null;

export async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  try {
    const client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 10000,
    });
    
    await client.connect();
    
    const db = client.db('chatapp');
    cachedClient = client;
    cachedDb = db;

    return { client, db };
  } catch (error) {
    throw error;
  }
}