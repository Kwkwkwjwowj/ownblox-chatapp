import express from 'express';
import cors from 'cors';
import { connectToDatabase } from '../lib/mongodb.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.post('/api/register', async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Nama tidak boleh kosong' });
    }

    const { db } = await connectToDatabase();
    
    // Check if user already exists
    const existingUser = await db.collection('users').findOne({ 
      name: name.trim() 
    });
    
    if (existingUser) {
      return res.status(400).json({ error: 'Nama sudah digunakan' });
    }
    
    // Generate unique user ID
    let userId;
    let isUnique = false;
    
    while (!isUnique) {
      userId = Math.random().toString(36).substring(2, 8).toUpperCase();
      const existingId = await db.collection('users').findOne({ userId });
      if (!existingId) isUnique = true;
    }
    
    // Create new user
    const newUser = {
      name: name.trim(),
      userId,
      createdAt: new Date()
    };
    
    await db.collection('users').insertOne(newUser);
    
    res.json({
      success: true,
      user: {
        name: newUser.name,
        userId: newUser.userId
      }
    });
    
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { db } = await connectToDatabase();
    
    const user = await db.collection('users').findOne({ userId });
    
    if (!user) {
      return res.status(404).json({ error: 'User tidak ditemukan' });
    }
    
    res.json({
      name: user.name,
      userId: user.userId
    });
    
  } catch (error) {
    console.error('Search user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/messages', async (req, res) => {
  try {
    const { senderId, receiverId, text } = req.body;
    
    if (!senderId || !receiverId || !text) {
      return res.status(400).json({ error: 'Data tidak lengkap' });
    }

    const { db } = await connectToDatabase();

    // Check if users exist
    const sender = await db.collection('users').findOne({ userId: senderId });
    const receiver = await db.collection('users').findOne({ userId: receiverId });
    
    if (!sender || !receiver) {
      return res.status(404).json({ error: 'User tidak ditemukan' });
    }

    const newMessage = {
      senderId,
      receiverId,
      text: text.trim(),
      timestamp: new Date(),
      read: false
    };

    await db.collection('messages').insertOne(newMessage);
    
    res.json({
      success: true,
      message: newMessage
    });
    
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/messages/:user1Id/:user2Id', async (req, res) => {
  try {
    const { user1Id, user2Id } = req.params;
    const { db } = await connectToDatabase();
    
    const messages = await db.collection('messages')
      .find({
        $or: [
          { senderId: user1Id, receiverId: user2Id },
          { senderId: user2Id, receiverId: user1Id }
        ]
      })
      .sort({ timestamp: 1 })
      .toArray();
    
    res.json(messages);
    
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/chats/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { db } = await connectToDatabase();
    
    // Get all unique conversations for this user
    const conversations = await db.collection('messages')
      .aggregate([
        {
          $match: {
            $or: [
              { senderId: userId },
              { receiverId: userId }
            ]
          }
        },
        {
          $sort: { timestamp: -1 }
        },
        {
          $group: {
            _id: {
              $cond: [
                { $eq: ["$senderId", userId] },
                "$receiverId",
                "$senderId"
              ]
            },
            lastMessage: { $first: "$$ROOT" }
          }
        }
      ])
      .toArray();

    // Get user details for each conversation
    const chatList = await Promise.all(
      conversations.map(async (conv) => {
        const user = await db.collection('users').findOne({ 
          userId: conv._id 
        });
        
        return {
          user: {
            name: user.name,
            userId: user.userId
          },
          lastMessage: conv.lastMessage
        };
      })
    );

    res.json(chatList);
    
  } catch (error) {
    console.error('Get chats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/cleanup', async (req, res) => {
  try {
    const { db } = await connectToDatabase();
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const result = await db.collection('messages')
      .deleteMany({ 
        timestamp: { $lt: yesterday } 
      });
    
    res.json({
      message: `Deleted ${result.deletedCount} old messages`,
      deletedCount: result.deletedCount
    });
    
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({ error: 'Cleanup failed' });
  }
});

// Export for Vercel
export default app;