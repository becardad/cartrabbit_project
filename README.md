### Deployment Link
https://text-nest-frontend.vercel.app/

# TextNest - Full Stack WhatsApp Clone

This is a simplified full-stack clone of WhatsApp Web (TextNest), built using React (Vite) for the frontend and Node.js/Express for the backend. It features real-time messaging, user authentication, and data persistence using MongoDB.

## Key Features

### 💬 Messaging & Communication
- **Real-time Chat**: Instant messaging powered by Socket.IO for seamless communication.
- **Group Conversations**: Create and manage group chats with multiple members.
- **Video & Audio Calling**: High-quality WebRTC-based calling system with signaling.
- **Voice Notes**: Integrated recorder to send and play voice messages.
- **AI Assistant**: Specialized chat interface powered by Google Gemini AI for instant help and conversation.

### 🔐 Security & Privacy
- **User Authentication**: Secure signup and login system using JWT (JSON Web Tokens) and Bcrypt hashing.
- **View-Once Media**: Send photos and videos that disappear after being viewed once.
- **Block System**: Ability to block/unblock users to maintain privacy.

### 🛠️ Advanced Chat Tools
- **Message Actions**: React to messages with emojis, edit sent messages, and delete for everyone or just for yourself.
- **File & Media Sharing**: Support for sharing images, videos, and various document types (PDF, Docs, etc.).
- **Forward & Reply**: Easily reply to specific messages or forward them to other contacts.
- **Starred Messages**: Save important messages to a dedicated "Starred" list for quick access.
- **Search in Chat**: Quickly find specific messages within a conversation.
- **Export Chat**: Download your chat history as a text file.

### 🎨 Personalization & UX
- **Custom Wallpapers**: Change chat backgrounds with a variety of colors and patterns.
- **Status/Stories**: Share updates with contacts that disappear after 24 hours.
- **Responsive Design**: Modern, glassmorphic UI that works beautifully on desktop and tablet.
- **Real-time Indicators**: Live "Online" status and "Typing..." indicators for active engagement.
- **Archive & Pin**: Organize your chat list by pinning important conversations or archiving older ones.

## Technology Stack
- **Frontend**: React.js, React Router, Vite, Axios, Socket.io-client, Tailwind CSS, Shadcn UI
- **Backend**: Node.js, Express, Socket.IO, Mongoose (MongoDB), JSON Web Tokens (JWT), Bcrypt

## Local Setup Instructions

### 1. Backend Setup
1. Open a terminal and navigate to the `backend` folder:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Environment Variables: 
   The backend reads a `.env` file. A default `.env` with the following variables is expected:
   ```env
   MONGODB_URI=mongodb://localhost:27017/whatsapp-clone
   PORT=5001
   JWT_SECRET=supersecretpassword123
   ```
4. Start the server:
   ```bash
   node server.js
   ```

### 2. Frontend Setup
1. Open a new terminal and navigate to the `frontend` folder:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
4. Access the application at [http://localhost:5173/](http://localhost:5173/) (or the port shown in your terminal). Open it in two separate browsers to test messaging!
