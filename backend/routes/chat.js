const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message');
const Group = require('../models/Group');
const Status = require('../models/Status');
const CallHistory = require('../models/CallHistory');

const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token, authorization denied' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.user = decoded.userId;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

module.exports = (io) => {
  const router = express.Router();

  // Get all users (except current) - used for search only
  router.get('/users', authMiddleware, async (req, res) => {
    try {
      const users = await User.find({ _id: { $ne: req.user } }).select('-password');
      res.json(users);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  });

  // Search users by name (for new chat) — excludes blocked users and users who blocked us
  router.get('/search', authMiddleware, async (req, res) => {
    try {
      const q = req.query.q || '';
      const me = await User.findById(req.user).select('blocked');
      const blockedIds = (me?.blocked || []).map(id => id.toString());
      const users = await User.find({
        _id: { $ne: req.user, $nin: blockedIds },
        blocked: { $ne: req.user },
        name: { $regex: q, $options: 'i' }
      }).select('-password').limit(20);
      res.json(users);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  });

  // Get only conversations — excludes blocked users
  router.get('/conversations', authMiddleware, async (req, res) => {
    try {
      const me = await User.findById(req.user).select('blocked');
      const blockedIds = new Set((me?.blocked || []).map(id => id.toString()));

      const messages = await Message.find({
        $or: [{ senderId: req.user }, { receiverId: req.user }]
      }).sort({ createdAt: -1 }).lean();

      const convMap = new Map();
      const unreadMap = new Map();

      for (const msg of messages) {
        const isFromOther = msg.senderId.toString() !== req.user.toString();
        const otherId = isFromOther ? msg.senderId.toString() : msg.receiverId.toString();

        if (!blockedIds.has(otherId)) {
          if (!convMap.has(otherId)) {
            convMap.set(otherId, msg);
          }
          if (isFromOther && msg.status !== 'read') {
            unreadMap.set(otherId, (unreadMap.get(otherId) || 0) + 1);
          }
        }
      }

      const contactIds = Array.from(convMap.keys());
      const users = await User.find({ _id: { $in: contactIds } }).select('-password').lean();

      const conversations = users.map(u => ({
        user: u,
        lastMessage: convMap.get(u._id.toString()),
        unread: unreadMap.get(u._id.toString()) || 0
      }));

      res.json(conversations);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  });

  // Check if this is the first message between two users
  router.get('/first-message/:userId', authMiddleware, async (req, res) => {
    try {
      const count = await Message.countDocuments({
        $or: [
          { senderId: req.params.userId, receiverId: req.user },
          { senderId: req.user, receiverId: req.params.userId }
        ]
      });
      res.json({ isFirst: count === 0 });
    } catch (err) {
      res.status(500).send('Server Error');
    }
  });

  // Block a user and delete all message history between them
  router.put('/block/:id', authMiddleware, async (req, res) => {
    try {
      const user = await User.findById(req.user);
      const blockId = req.params.id;
      if (!user.blocked.some(id => id.toString() === blockId)) {
        user.blocked.push(blockId);
        await user.save();
      }
      
      // Fully delete the conversation from DB so it resets to a new chat upon unblock
      await Message.deleteMany({
        $or: [
          { senderId: req.user, receiverId: blockId },
          { senderId: blockId, receiverId: req.user }
        ]
      });

      res.json({ success: true, blocked: user.blocked });
    } catch (err) { res.status(500).send('Server Error'); }
  });

  // Unblock a user
  router.put('/unblock/:id', authMiddleware, async (req, res) => {
    try {
      const user = await User.findById(req.user);
      user.blocked = user.blocked.filter(id => id.toString() !== req.params.id);
      await user.save();
      res.json({ success: true, blocked: user.blocked });
    } catch (err) { res.status(500).send('Server Error'); }
  });

  // Get blocked users list (with details)
  router.get('/blocked', authMiddleware, async (req, res) => {
    try {
      const user = await User.findById(req.user).populate('blocked', 'name profilePicture bio');
      res.json(user.blocked || []);
    } catch (err) { res.status(500).send('Server Error'); }
  });

  // Update own profile
  router.put('/profile', authMiddleware, async (req, res) => {
    try {
      const { bio, profilePicture } = req.body;
      const user = await User.findById(req.user);
      if (!user) return res.status(404).json({ msg: 'Not found' });
      
      if (bio !== undefined) user.bio = bio;
      if (profilePicture !== undefined) user.profilePicture = profilePicture;
      
      await user.save();
      
      res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        bio: user.bio,
        profilePicture: user.profilePicture
      });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  });

  // Get messages for a chat (User or Group)
  router.get('/messages/:chatId', authMiddleware, async (req, res) => {
    try {
      const group = await Group.findById(req.params.chatId).catch(() => null);
      let messages;
      
      if (group) {
        messages = await Message.find({ receiverId: group._id }).lean().sort({ createdAt: 1 });
      } else {
        messages = await Message.find({
          $or: [
            { senderId: req.user, receiverId: req.params.chatId },
            { senderId: req.params.chatId, receiverId: req.user }
          ]
        }).lean().sort({ createdAt: 1 });
      }
      res.json(messages);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  });

  // Send a message
  router.post('/messages/:userId', authMiddleware, async (req, res) => {
    try {
      // Check if blocked by either party
      const me = await User.findById(req.user);
      const them = await User.findById(req.params.userId);
      
      if (!me || !them) return res.status(404).json({ msg: 'User not found' });
      
      const meBlockedThem = me.blocked && me.blocked.some(id => id.toString() === req.params.userId);
      const themBlockedMe = them.blocked && them.blocked.some(id => id.toString() === req.user.toString());
      
      if (meBlockedThem || themBlockedMe) {
        return res.status(403).json({ msg: 'Cannot send message to this user' });
      }

      const { text, type, imageUrl, viewOnce } = req.body;
      const newMessage = new Message({
        senderId: req.user,
        receiverId: req.params.userId,
        text: text || "",
        type,
        imageUrl,
        viewOnce,
        replyTo: req.body.replyTo || null,
        fileName: req.body.fileName || "",
        fileSize: req.body.fileSize || ""
      });

      const savedMessage = await newMessage.save();

      // Emit real-time message to receiver if online (the socket event logic should be handled here or in frontend via the saved message response)
      // Usually, it's better to let frontend emit Socket send_message event separately, or we can broadcast it here.
      // Easiest is to respond with the HTTP and let React emit to Socket. We will broadcast via Socket if needed.

      res.json(savedMessage);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  });

  // Mark messages as read
  router.put('/messages/read/:userId', authMiddleware, async (req, res) => {
    try {
      await Message.updateMany(
        { senderId: req.params.userId, receiverId: req.user, status: { $ne: 'read' } },
        { $set: { status: 'read' } }
      );
      res.json({ success: true });
    } catch (err) {
      res.status(500).send('Server Error');
    }
  });

  // Delete a message
  router.delete('/messages/:messageId', authMiddleware, async (req, res) => {
    try {
      const message = await Message.findById(req.params.messageId);
      if (!message) return res.status(404).json({ msg: 'Message not found' });
      if (message.senderId.toString() !== req.user) {
        return res.status(401).json({ msg: 'Not authorized' });
      }
      message.deleted = true;
      message.text = "This message was deleted";
      message.imageUrl = "";
      await message.save();
      res.json(message);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  });

  // Clear or Delete an entire conversation with a specific user
  router.delete('/conversations/:userId', authMiddleware, async (req, res) => {
    try {
      await Message.deleteMany({
        $or: [
          { senderId: req.user, receiverId: req.params.userId },
          { senderId: req.params.userId, receiverId: req.user }
        ]
      });
      res.json({ success: true, msg: 'Conversation deleted' });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  });

  // Edit a message
  router.put('/messages/:messageId/edit', authMiddleware, async (req, res) => {
    try {
      const message = await Message.findById(req.params.messageId);
      if (!message) return res.status(404).json({ msg: 'Not found' });
      if (message.senderId.toString() !== req.user) return res.status(401).json({ msg: 'Not authorized' });
      message.text = req.body.text;
      message.edited = true;
      await message.save();
      res.json(message);
    } catch (err) { res.status(500).send('Server Error'); }
  });

  // React to a message
  router.post('/messages/:messageId/react', authMiddleware, async (req, res) => {
    try {
      const { emoji } = req.body;
      const message = await Message.findById(req.params.messageId);
      if (!message) return res.status(404).json({ msg: 'Not found' });
      // Toggle: remove if same user already reacted with same emoji
      const existing = message.reactions.find(r => r.emoji === emoji && r.userId.toString() === req.user);
      if (existing) {
        message.reactions = message.reactions.filter(r => !(r.emoji === emoji && r.userId.toString() === req.user));
      } else {
        message.reactions.push({ emoji, userId: req.user });
      }
      await message.save();
      res.json(message);
    } catch (err) { res.status(500).send('Server Error'); }
  });

  // Mark a view-once message as viewed
  router.put('/messages/view-once/:messageId', authMiddleware, async (req, res) => {
    try {
      const message = await Message.findById(req.params.messageId);
      if (!message || !message.viewOnce) return res.status(404).json({ msg: 'Not found' });
      message.viewed = true;
      await message.save();
      res.json(message);
    } catch (err) {
      res.status(500).send('Server Error');
    }
  });

  // Create a new Group
  router.post('/groups', authMiddleware, async (req, res) => {
    try {
      const { name, members } = req.body;
      const memberIds = [...members, req.user]; // ensure creator is implicitly a member
      const newGroup = new Group({
        name,
        members: memberIds,
        admin: req.user
      });
      await newGroup.save();
      res.json(newGroup);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  });

  // Get all Groups for User
  router.get('/groups', authMiddleware, async (req, res) => {
    try {
      const groups = await Group.find({ members: req.user });
      res.json(groups);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  });

  // -- STATUS / STORIES --

  // Post a new status
  router.post('/status', authMiddleware, async (req, res) => {
    try {
      const { type, content, caption, backgroundColor } = req.body;
      const status = new Status({ userId: req.user, type, content, caption, backgroundColor });
      await status.save();
      res.json(status);
    } catch (err) { res.status(500).send('Server Error'); }
  });

  // Get all live statuses from contacts
  router.get('/status', authMiddleware, async (req, res) => {
    try {
      const statuses = await Status.find()
        .sort({ createdAt: -1 })
        .populate('userId', 'name profilePicture')
        .populate('views.user', 'name profilePicture')
        .populate('likes', 'name profilePicture');
      res.json(statuses);
    } catch (err) { res.status(500).send('Server Error'); }
  });

  // Mark a status as seen
  router.put('/status/:id/seen', authMiddleware, async (req, res) => {
    try {
      const status = await Status.findById(req.params.id);
      if (!status) return res.status(404).json({ msg: 'Not found' });
      
      // Don't count owner's own views
      if (status.userId.toString() === req.user) {
        return res.json({ success: true, owner: true });
      }

      const alreadySeen = status.views.some(v => v.user && v.user.toString() === req.user);
      if (!alreadySeen) {
        status.views.push({ user: req.user, seenAt: new Date() });
        await status.save();
      }
      res.json({ success: true });
    } catch (err) { res.status(500).send('Server Error'); }
  });

  // Delete a status
  router.delete('/status/:id', authMiddleware, async (req, res) => {
    try {
      const status = await Status.findById(req.params.id);
      if (!status) return res.status(404).json({ msg: 'Not found' });
      if (status.userId.toString() !== req.user) {
        return res.status(401).json({ msg: 'Not authorized' });
      }
      await status.deleteOne();
      res.json({ success: true });
    } catch (err) { res.status(500).send('Server Error'); }
  });

  // Toggle like a status
  router.put('/status/:id/like', authMiddleware, async (req, res) => {
    try {
      const status = await Status.findById(req.params.id);
      if (!status) return res.status(404).json({ msg: 'Not found' });
      
      const alreadyLiked = status.likes.some(u => u && u.toString() === req.user);
      if (alreadyLiked) {
        status.likes = status.likes.filter(u => u && u.toString() !== req.user);
      } else {
        status.likes.push(req.user);
      }
      await status.save();
      res.json(status);
    } catch (err) { res.status(500).send('Server Error'); }
  });

  // -- USER PREFERENCES (FAVORITES, ARCHIVE, STARS) --

  // Toggle favorite user
  router.put('/favorites/:id', authMiddleware, async (req, res) => {
    try {
      const user = await User.findById(req.user);
      const favId = req.params.id;
      const index = user.favorites.findIndex(id => id.toString() === favId);
      if (index > -1) {
        user.favorites.splice(index, 1);
      } else {
        user.favorites.push(favId);
      }
      await user.save();
      res.json(user.favorites);
    } catch (err) { res.status(500).send('Server Error'); }
  });

  // Toggle archive chat
  router.put('/archive/:id', authMiddleware, async (req, res) => {
    try {
      const user = await User.findById(req.user);
      const chatId = req.params.id;
      const index = user.archived.findIndex(id => id.toString() === chatId);
      if (index > -1) {
        user.archived.splice(index, 1);
      } else {
        user.archived.push(chatId);
      }
      await user.save();
      res.json(user.archived);
    } catch (err) { res.status(500).send('Server Error'); }
  });

  // Toggle pin chat
  router.put('/pin/:id', authMiddleware, async (req, res) => {
    try {
      const user = await User.findById(req.user);
      const chatId = req.params.id;
      const index = user.pinned.findIndex(id => id.toString() === chatId);
      if (index > -1) {
        user.pinned.splice(index, 1);
      } else {
        user.pinned.push(chatId);
      }
      await user.save();
      res.json(user.pinned);
    } catch (err) { res.status(500).send('Server Error'); }
  });

  // Toggle star message
  router.put('/messages/:id/star', authMiddleware, async (req, res) => {
    try {
      const message = await Message.findById(req.params.id);
      if (!message) return res.status(404).json({ msg: 'Message not found' });
      
      const index = message.starredBy.findIndex(id => id.toString() === req.user);
      if (index > -1) {
        message.starredBy.splice(index, 1);
      } else {
        message.starredBy.push(req.user);
      }
      await message.save();
      res.json({ starred: message.starredBy.some(id => id.toString() === req.user) });
    } catch (err) { res.status(500).send('Server Error'); }
  });

  // Get starred messages for user
  router.get('/messages/starred', authMiddleware, async (req, res) => {
    try {
      const messages = await Message.find({ starredBy: req.user }).populate('senderId', 'name profilePicture');
      res.json(messages);
    } catch (err) { res.status(500).send('Server Error'); }
  });

  // -- CALLS --

  // Log a call
  router.post('/calls', authMiddleware, async (req, res) => {
    try {
      const { receiver, type, status, duration } = req.body;
      const call = new CallHistory({
        caller: req.user,
        receiver,
        type,
        status,
        duration
      });
      await call.save();
      res.json(call);
    } catch (err) { res.status(500).send('Server Error'); }
  });

  // Get call history
  router.get('/calls', authMiddleware, async (req, res) => {
    try {
      const calls = await CallHistory.find({
        $or: [{ caller: req.user }, { receiver: req.user }]
      })
      .sort({ timestamp: -1 })
      .populate('caller', 'name profilePicture')
      .populate('receiver', 'name profilePicture');
      res.json(calls);
    } catch (err) { res.status(500).send('Server Error'); }
  });

  // Set chat background
  router.put('/background/:id', authMiddleware, async (req, res) => {
    try {
      const user = await User.findById(req.user);
      const chatId = req.params.id;
      const { background } = req.body;
      user.chatBackgrounds.set(chatId, background);
      await user.save();
      res.json({ success: true, background });
    } catch (err) { res.status(500).send('Server Error'); }
  });

  // Set user settings
  router.put('/settings', authMiddleware, async (req, res) => {
    try {
      const user = await User.findById(req.user);
      const { theme, textSize, disappearTime } = req.body;
      if (theme !== undefined) user.settings.theme = theme;
      if (textSize !== undefined) user.settings.textSize = textSize;
      if (disappearTime !== undefined) user.settings.disappearTime = disappearTime;
      await user.save();
      res.json(user.settings);
    } catch (err) { res.status(500).send('Server Error'); }
  });

  return router;
};
