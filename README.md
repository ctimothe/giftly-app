# Giftly

Giftly is a modern, real-time social wishlist platform. It enables users to create and manage collaborative wishlists, track item reservations, log fulfilled items, and interact with friends' lists through real-time features like presence tracking and instant notifications.

## Features

- **Wishlists**: Create and manage themed wishlists with granular access control
- **Real-Time Interaction**: Live item reservations, presence tracking, and instant notifications via WebSocket
- **Shrine**: Curated top-4 items pinned to user profiles
- **Analytics**: Wrapped-style statistics on wishlist activity
- **Haul Log**: Track fulfilled wishes with ratings and reviews
- **Group Contributions**: Support multiple contributors per item
- **Privacy Controls**: Wishlist owners have visibility controls over reservation and contribution data

## Tech Stack

### Frontend
- React 18+ with TypeScript
- Vite for build optimization
- Tailwind CSS for styling
- Framer Motion for animations
- Socket.IO client for real-time communication

### Backend
- Node.js with Express.js
- TypeScript for type safety
- Prisma ORM for database access
- Socket.IO for WebSocket communication
- Zod for runtime validation

### Database
- PostgreSQL

### Authentication
- JWT-based authentication with HttpOnly cookies

## Getting Started

### Prerequisites
- Node.js 18 or higher
- npm or yarn
- PostgreSQL database

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/ctimothe/giftly-app.git
   cd giftly-app
   ```

2. Set up environment variables
   ```bash
   # Backend
   cd server
   cp .env.example .env
   # Configure DATABASE_URL, JWT_SECRET, and other required variables
   
   # Frontend
   cd ../client
   cp .env.example .env
   # Configure API endpoint and other client variables
   ```

3. Install dependencies
   ```bash
   cd server && npm install
   cd ../client && npm install
   ```

4. Initialize database
   ```bash
   cd server
   npx prisma migrate deploy
   ```

5. Start the development servers
   ```bash
   # Terminal 1: Backend
   cd server && npm run dev
   
   # Terminal 2: Frontend
   cd client && npm run dev
   ```

6. Access the application at `http://localhost:5173`

## Project Structure

```
.
├── client/               # React frontend application
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── pages/        # Page components
│   │   ├── context/      # React context for state management
│   │   └── lib/          # Utility functions
│   └── package.json
├── server/               # Express backend application
│   ├── src/
│   │   ├── routes/       # API route handlers
│   │   ├── middleware/   # Express middleware
│   │   ├── services/     # Business logic services
│   │   ├── utils/        # Utility functions
│   │   └── lib/          # Library integrations
│   ├── prisma/           # Database schema and migrations
│   └── package.json
└── docker-compose.yml    # Docker configuration for local development
```

## API Documentation

See [DEPLOYMENT.md](./DEPLOYMENT.md) for API endpoint documentation and deployment instructions.

## Development

### Building

```bash
# Client
cd client && npm run build

# Server
cd server && npm run build
```

### Type Checking

```bash
# Client
cd client && npm run type-check

# Server
cd server && npm run type-check
```

### Running Tests

```bash
cd client && npm test
cd server && npm test
```

## Deployment

Refer to [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

## License

Proprietary. All rights reserved.
