// Main server entry point — Express + Socket.io

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import { errorHandler, notFoundHandler, withRequestId } from './utils/errors';
import { authLimiter, defaultApiLimiter, mutationLimiter } from './middleware/rateLimit';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// Socket.io with permissive CORS for development
const io = new Server(httpServer, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE']
    }
});

// Store io instance for route access
app.set('io', io);

// Middleware
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(withRequestId);
app.use('/api', defaultApiLimiter);

// Route imports
import authRoutes from './routes/auth';
import wishlistRoutes from './routes/wishlists';
import itemRoutes from './routes/items';
import contributionRoutes from './routes/contributions';
import noteRoutes from './routes/notes';
import shrineRoutes from './routes/shrine';
import haulRoutes from './routes/hauls';
import wrappedRoutes from './routes/wrapped';

// API routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/wishlists', wishlistRoutes);
app.use('/api/items', mutationLimiter, itemRoutes);
app.use('/api/contributions', mutationLimiter, contributionRoutes);
app.use('/api/notes', mutationLimiter, noteRoutes);
app.use('/api/shrine', shrineRoutes);
app.use('/api/hauls', haulRoutes);
app.use('/api/wrapped', wrappedRoutes);

// Health check endpoints
app.get('/', (_req: express.Request, res: express.Response) => {
    res.json({ message: 'Social Wishlist API', status: 'running' });
});

app.get('/health', (_req: express.Request, res: express.Response) => {
    res.json({ status: 'ok' });
});

app.use(notFoundHandler);
app.use(errorHandler);

// Socket.io connection + room-based presence tracking
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Join a wishlist viewing room for presence tracking
    socket.on('join_wishlist', ({ wishlistId }: { wishlistId: string }) => {
        socket.join(`wishlist:${wishlistId}`);
        // Broadcast updated viewer count to the room
        const room = io.sockets.adapter.rooms.get(`wishlist:${wishlistId}`);
        const count = room ? room.size : 1;
        io.to(`wishlist:${wishlistId}`).emit(`viewers:${wishlistId}`, { count });
        console.log(`Socket ${socket.id} joined wishlist:${wishlistId} (${count} viewers)`);
    });

    // Leave a wishlist viewing room
    socket.on('leave_wishlist', ({ wishlistId }: { wishlistId: string }) => {
        socket.leave(`wishlist:${wishlistId}`);
        // Broadcast updated viewer count after leaving
        const room = io.sockets.adapter.rooms.get(`wishlist:${wishlistId}`);
        const count = room ? room.size : 0;
        io.to(`wishlist:${wishlistId}`).emit(`viewers:${wishlistId}`, { count });
        console.log(`Socket ${socket.id} left wishlist:${wishlistId} (${count} viewers)`);
    });

    // On disconnect, update all rooms the socket was in
    socket.on('disconnecting', () => {
        socket.rooms.forEach((room) => {
            if (room.startsWith('wishlist:')) {
                const wishlistId = room.replace('wishlist:', '');
                const roomSet = io.sockets.adapter.rooms.get(room);
                // Subtract 1 because the disconnecting socket is still in the room
                const count = roomSet ? roomSet.size - 1 : 0;
                io.to(room).emit(`viewers:${wishlistId}`, { count });
            }
        });
        console.log('Client disconnecting:', socket.id);
    });
});

// Start server
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
