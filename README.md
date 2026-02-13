# Giftly 🎁 — Social Wishlist with a Vibe

Giftly is a modern, real-time social wishlist application designed to make gifting fun, interactive, and seamless. Beyond just a list of items, it offers a "cult-like" social experience with features like **Hype Buttons**, **The Shrine (Top 4)**, **Haul Logs**, and **Gift Wrapped** analytics.

Built for the "Vibe Coding" challenge.

## ✨ Key Features

- **Social Wishlists**: Create themed wishlists (Coquette, Dark Mode, etc.) and share them with friends.
- **Real-Time Interaction**: See who's viewing your list, reserve items instantly, and get notified when someone contributes — all without refreshing.
- **The Shrine**: Pin your top 4 "Holy Grail" items to your profile (inspired by Twitter/Letterboxd top 4).
- **Gift Wrapped**: Spotify-Wrapped style analytics for your wishlist personality (e.g., "Most Delusional Wish").
- **Haul Log**: A diary of fulfilled wishes where you rate and review gifts you've received.
- **Group Gifting**: Friends can "chip in" to expensive items.
- **Spoiler Protection**: Owners can't see who reserved what or how much is collected, keeping the surprise alive.

## 🛠 Tech Stack

- **Frontend**: React (Vite), TypeScript, Tailwind CSS, Framer Motion, Lucide React
- **Backend**: Node.js, Express, Socket.IO (Real-time), Prisma ORM
- **Database**: PostgreSQL (Supabase)
- **Authentication**: JWT (HttpOnly cookies + local storage fallback)

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database (or Supabase URL)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd wishlist_app
   ```

2. **Setup Backend**
   ```bash
   cd server
   npm install
   cp .env.example .env  # (Or create .env with DATABASE_URL & JWT_SECRET)
   npx prisma migrate dev --name init  # Apply DB schema
   npm run dev
   ```

3. **Setup Frontend**
   ```bash
   cd client
   npm install
   npm run dev
   ```

4. **Visit** `http://localhost:3000`

## 🧠 Product Decisions & "Vibe"
*Notes for Robert:*

1.  **"Steal This" Mechanic**: I noticed people love curating lists from others. I added a "Steal" button that clones an item to your own list but keeps a "stolen from @username" provenance tag, adding a social layer to curation.
2.  **Hype Button**: Instead of a binary "like", I implemented a "hold-to-hype" button that streams particles and updates counters in real-time. It feels more visceral and "TikTok-coded".
3.  **The Shrine**: Limited to 4 items to force curation. It tells visitors immediately what the user *really* wants.
4.  **Spoiler Protection**: Critical strict separation. The owner view hides all reservation/contribution data to ensure the platform can be used for genuine surprises.

## 📦 Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions on Railway (Backend) and Vercel (Frontend).
