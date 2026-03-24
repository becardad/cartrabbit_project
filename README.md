### Deployment Link
https://text-nest-frontend.vercel.app/

# TextNest - Full Stack WhatsApp Clone

This is a simplified full-stack clone of WhatsApp Web (TextNest), built using React (Vite) for the frontend and Node.js/Express for the backend. It features real-time messaging, user authentication, and data persistence using MongoDB.

## Features
- **User Authentication**: Secure Signup and Login using JWT.
- **Real-time Messaging**: Instant message delivery using Socket.IO.
- **Group Chats**: Create and participate in group conversations.
- **Video & Audio Calling**: Integrated WebRTC-based calling system.
- **Archive Chats**: Keep your chat list clean by archiving conversations.
- **AI Assistance**: Integrated AI chat for assistance.
- **Media Support**: Send and view images, videos, and documents.
- **Voice Notes**: Record and send voice messages.
- **Message Actions**: React to, edit, delete, and star messages.
- **UI/UX**: Responsive, two-panel layout with dark mode and smooth animations.
- **Real-time Indicators**: Online status and typing indicators.
- **View-Once Support**: Support for view-once media items.

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
