import express from 'express';
import cors from 'cors';
import { connectToDatabase } from '../lib/mongodb.js';

const app = express();

app.use(cors());
app.use(express.json());

app.post('/api/register', async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Nama tidak boleh kosong' });
    }

    const { db } = await connectToDatabase();
    
    const existingUser = await db.collection('users').findOne({ 
      name: name.trim() 
    });
    
    if (existingUser) {
      return res.status(400).json({ error: 'Nama sudah digunakan' });
    }
    
    let userId;
    let isUnique = false;
    
    while (!isUnique) {
      userId = Math.random().toString(36).substring(2, 8).toUpperCase();
      const existingId = await db.collection('users').findOne({ userId });
      if (!existingId) isUnique = true;
    }
    
    const newUser = {
      name: name.trim(),
      userId,
      createdAt: new Date(),
      lastActive: new Date()
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

app.post('/api/login', async (req, res) => {
  try {
    const { name, password } = req.body;
    
    if (!name || !password) {
      return res.status(400).json({ error: 'Nama dan password tidak boleh kosong' });
    }

    const { db } = await connectToDatabase();
    
    let user = await db.collection('users').findOne({ 
      name: name.trim() 
    });
    
    if (!user) {
      const userId = Math.random().toString(36).substring(2, 8).toUpperCase();
      user = {
        name: name.trim(),
        userId,
        password: password,
        createdAt: new Date(),
        lastActive: new Date()
      };
      await db.collection('users').insertOne(user);
    } else {
      if (user.password !== password) {
        return res.status(401).json({ error: 'Password salah' });
      }
      await db.collection('users').updateOne(
        { name: name.trim() },
        { $set: { lastActive: new Date() } }
      );
    }
    
    res.json({
      success: true,
      user: {
        name: user.name,
        userId: user.userId
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const { db } = await connectToDatabase();
    
    const users = await db.collection('users')
      .find({
        $or: [
          { userId: { $regex: query, $options: 'i' } },
          { name: { $regex: query, $options: 'i' } }
        ]
      })
      .project({ name: 1, userId: 1 })
      .limit(10)
      .toArray();
    
    res.json(users);
    
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { db } = await connectToDatabase();
    
    const result = await db.collection('users').deleteOne({ userId });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'User tidak ditemukan' });
    }
    
    await db.collection('messages').deleteMany({
      $or: [
        { senderId: userId },
        { receiverId: userId }
      ]
    });
    
    res.json({
      success: true,
      message: 'User dan semua chat-nya berhasil dihapus'
    });
    
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/messages', async (req, res) => {
  try {
    const { senderId, receiverId, text, replyTo } = req.body;
    
    if (!senderId || !receiverId || !text) {
      return res.status(400).json({ error: 'Data tidak lengkap' });
    }

    const { db } = await connectToDatabase();

    const sender = await db.collection('users').findOne({ userId: senderId });
    const receiver = await db.collection('users').findOne({ userId: receiverId });
    
    if (!sender || !receiver) {
      return res.status(404).json({ error: 'User tidak ditemukan' });
    }

    const newMessage = {
      senderId,
      receiverId,
      text: text.trim(),
      replyTo: replyTo || null,
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

app.delete('/api/messages/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    const { db } = await connectToDatabase();
    
    const result = await db.collection('messages').deleteOne({ _id: messageId });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Pesan tidak ditemukan' });
    }
    
    res.json({
      success: true,
      message: 'Pesan berhasil dihapus'
    });
    
  } catch (error) {
    console.error('Delete message error:', error);
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

    const chatList = await Promise.all(
      conversations.map(async (conv) => {
        const user = await db.collection('users').findOne({ 
          userId: conv._id 
        });
        
        if (!user) return null;
        
        return {
          user: {
            name: user.name,
            userId: user.userId
          },
          lastMessage: conv.lastMessage
        };
      })
    );

    const filteredChatList = chatList.filter(chat => chat !== null);
    
    res.json(filteredChatList);
    
  } catch (error) {
    console.error('Get chats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/cleanup', async (req, res) => {
  try {
    const { db } = await connectToDatabase();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const result = await db.collection('messages')
      .deleteMany({ 
        timestamp: { $lt: sevenDaysAgo } 
      });
    
    res.json({
      message: `Deleted ${result.deletedCount} messages older than 7 days`,
      deletedCount: result.deletedCount
    });
    
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({ error: 'Cleanup failed' });
  }
});

export default app;