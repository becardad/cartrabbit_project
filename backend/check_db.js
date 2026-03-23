const mongoose = require('mongoose');
require('dotenv').config();

const UserSchema = new mongoose.Schema({}, { strict: false });
const MessageSchema = new mongoose.Schema({}, { strict: false });

const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Message = mongoose.models.Message || mongoose.model('Message', MessageSchema);

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/whatsapp-web-clone2').then(async () => {
  const users = await User.find({}).lean();
  const messages = await Message.find({}).lean();

  console.log(`Users in DB: ${users.length}`);
  if (users.length > 0) {
    console.log(`Sample User: ${JSON.stringify(users[0], null, 2)}`);
  }

  console.log(`Messages in DB: ${messages.length}`);
  if (messages.length > 0) {
    console.log(`Sample Message: ${JSON.stringify(messages[0], null, 2)}`);
  }
  process.exit(0);
}).catch(err => {
  console.error("DB Connection Error:", err);
  process.exit(1);
});
