# TV Scheduler & Recommendation App

A modern TV show scheduling and recommendation app built with React, TypeScript, and Supabase.

## Features

- 📺 **Schedule Tracking** - Track your favorite TV shows and see upcoming episodes
- 🔍 **Discovery** - Swipe-based recommendation system powered by TMDB
- 👥 **Groups** - Create groups with friends to find shows you all want to watch
- ⭐ **Ratings** - Rate episodes and shows to improve recommendations
- 📱 **Watch List** - Track episodes you want to watch
- 🔔 **Notifications** - Get notified when new episodes air

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **UI**: Radix UI (shadcn/ui components), Tailwind CSS
- **Backend**: Supabase (Edge Functions, Auth, Database)
- **External API**: The Movie Database (TMDB)

## Getting Started

### Prerequisites

- Node.js 20+ 
- npm or yarn
- Supabase account and project

### Installation

1. Clone the repository:
```bash
git clone https://github.com/johndodson23/Tvscheduler.git
cd Tvscheduler
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env.local` file:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Deploy Supabase Edge Functions:
The backend server code is in `src/supabase/functions/server/`. Deploy it to your Supabase project.

5. Run the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:3000`

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

The app is configured for automatic deployment on push to `main` branch.

### Manual Build

```bash
npm run build
```

The built files will be in the `build` directory.

## Project Structure

```
src/
  ├── components/     # React components
  │   ├── ui/        # shadcn/ui components
  │   └── ...        # Feature components
  ├── utils/         # Utilities (API, auth, etc.)
  ├── supabase/      # Supabase Edge Functions
  └── styles/        # Global styles
```

## License

MIT
