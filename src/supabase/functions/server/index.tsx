import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
import { createClient } from "jsr:@supabase/supabase-js@2";

const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Helper to create Supabase client
const getSupabaseClient = () => {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
};

// Helper to verify auth
const verifyAuth = async (request: Request) => {
  const accessToken = request.headers.get('Authorization')?.split(' ')[1];
  const supabase = getSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser(accessToken);
  if (!user?.id) {
    return null;
  }
  return user.id;
};

// Health check endpoint
app.get("/make-server-e949556f/health", (c) => {
  return c.json({ status: "ok" });
});

// Auth endpoints
app.post("/make-server-e949556f/signup", async (c) => {
  try {
    const { email, password, name } = await c.req.json();
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true
    });

    if (error) {
      console.log(`Error creating user during signup: ${error.message}`);
      return c.json({ error: error.message }, 400);
    }

    // Create user profile
    await kv.set(`user:${data.user.id}`, {
      id: data.user.id,
      email,
      name,
      services: [],
      createdAt: new Date().toISOString()
    });

    return c.json({ user: data.user });
  } catch (error) {
    console.log(`Server error during signup: ${error}`);
    return c.json({ error: String(error) }, 500);
  }
});

// User profile endpoints
app.get("/make-server-e949556f/profile", async (c) => {
  try {
    const userId = await verifyAuth(c.req.raw);
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const profile = await kv.get(`user:${userId}`);
    return c.json({ profile });
  } catch (error) {
    console.log(`Error fetching profile: ${error}`);
    return c.json({ error: String(error) }, 500);
  }
});

app.put("/make-server-e949556f/profile", async (c) => {
  try {
    const userId = await verifyAuth(c.req.raw);
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const updates = await c.req.json();
    const profile = await kv.get(`user:${userId}`) || {};
    const updatedProfile = { ...profile, ...updates };
    await kv.set(`user:${userId}`, updatedProfile);

    return c.json({ profile: updatedProfile });
  } catch (error) {
    console.log(`Error updating profile: ${error}`);
    return c.json({ error: String(error) }, 500);
  }
});

// TMDB proxy endpoints
app.get("/make-server-e949556f/tmdb/search", async (c) => {
  try {
    const query = c.req.query('query');
    const type = c.req.query('type') || 'multi';
    const apiKey = Deno.env.get('TMDB_API_KEY');

    const response = await fetch(
      `https://api.themoviedb.org/3/search/${type}?api_key=${apiKey}&query=${encodeURIComponent(query)}`
    );
    const data = await response.json();
    return c.json(data);
  } catch (error) {
    console.log(`Error searching TMDB: ${error}`);
    return c.json({ error: String(error) }, 500);
  }
});

app.get("/make-server-e949556f/tmdb/details/:type/:id", async (c) => {
  try {
    const { type, id } = c.req.param();
    const apiKey = Deno.env.get('TMDB_API_KEY');

    const response = await fetch(
      `https://api.themoviedb.org/3/${type}/${id}?api_key=${apiKey}&append_to_response=watch/providers,credits`
    );
    const data = await response.json();
    return c.json(data);
  } catch (error) {
    console.log(`Error fetching TMDB details: ${error}`);
    return c.json({ error: String(error) }, 500);
  }
});

app.get("/make-server-e949556f/tmdb/tv/:id/season/:season", async (c) => {
  try {
    const { id, season } = c.req.param();
    const apiKey = Deno.env.get('TMDB_API_KEY');

    const response = await fetch(
      `https://api.themoviedb.org/3/tv/${id}/season/${season}?api_key=${apiKey}`
    );
    const data = await response.json();
    return c.json(data);
  } catch (error) {
    console.log(`Error fetching season details: ${error}`);
    return c.json({ error: String(error) }, 500);
  }
});

app.get("/make-server-e949556f/tmdb/trending", async (c) => {
  try {
    const type = c.req.query('type') || 'all';
    const apiKey = Deno.env.get('TMDB_API_KEY');

    const response = await fetch(
      `https://api.themoviedb.org/3/trending/${type}/week?api_key=${apiKey}`
    );
    const data = await response.json();
    return c.json(data);
  } catch (error) {
    console.log(`Error fetching trending: ${error}`);
    return c.json({ error: String(error) }, 500);
  }
});

app.get("/make-server-e949556f/tmdb/similar/:type/:id", async (c) => {
  try {
    const { type, id } = c.req.param();
    const apiKey = Deno.env.get('TMDB_API_KEY');

    const response = await fetch(
      `https://api.themoviedb.org/3/${type}/${id}/similar?api_key=${apiKey}`
    );
    const data = await response.json();
    return c.json(data);
  } catch (error) {
    console.log(`Error fetching similar content: ${error}`);
    return c.json({ error: String(error) }, 500);
  }
});

app.get("/make-server-e949556f/tmdb/recommendations/:type/:id", async (c) => {
  try {
    const { type, id } = c.req.param();
    const apiKey = Deno.env.get('TMDB_API_KEY');

    const response = await fetch(
      `https://api.themoviedb.org/3/${type}/${id}/recommendations?api_key=${apiKey}`
    );
    const data = await response.json();
    return c.json(data);
  } catch (error) {
    console.log(`Error fetching recommendations: ${error}`);
    return c.json({ error: String(error) }, 500);
  }
});

// My Shows (for schedule tracking) endpoints
app.get("/make-server-e949556f/my-shows", async (c) => {
  try {
    const userId = await verifyAuth(c.req.raw);
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const shows = await kv.get(`myShows:${userId}`) || [];
    return c.json({ shows });
  } catch (error) {
    console.log(`Error fetching my shows: ${error}`);
    return c.json({ error: String(error) }, 500);
  }
});

app.post("/make-server-e949556f/my-shows", async (c) => {
  try {
    const userId = await verifyAuth(c.req.raw);
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const show = await c.req.json();
    const shows = await kv.get(`myShows:${userId}`) || [];
    
    // Check if already tracking this specific show + season combination
    // If selectedSeason is provided, check for exact match (id + selectedSeason)
    // Otherwise, just check for id match (for backwards compatibility)
    const exists = shows.find((s: any) => {
      if (show.selectedSeason !== undefined) {
        // Check both id and season
        return s.id === show.id && s.selectedSeason === show.selectedSeason;
      } else {
        // Just check id (for shows added without season specification)
        return s.id === show.id && s.selectedSeason === undefined;
      }
    });
    
    if (exists) {
      // Return success if already exists instead of error (idempotent operation)
      return c.json({ shows, alreadyExists: true });
    }

    shows.push({ ...show, addedAt: new Date().toISOString() });
    await kv.set(`myShows:${userId}`, shows);

    return c.json({ shows });
  } catch (error) {
    console.log(`Error adding show: ${error}`);
    return c.json({ error: String(error) }, 500);
  }
});

app.delete("/make-server-e949556f/my-shows/:id", async (c) => {
  try {
    const userId = await verifyAuth(c.req.raw);
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { id } = c.req.param();
    const shows = await kv.get(`myShows:${userId}`) || [];
    const filteredShows = shows.filter((show: any) => show.id !== parseInt(id));
    
    await kv.set(`myShows:${userId}`, filteredShows);
    return c.json({ shows: filteredShows });
  } catch (error) {
    console.log(`Error removing show: ${error}`);
    return c.json({ error: String(error) }, 500);
  }
});

// Get detailed show info with progress
app.get("/make-server-e949556f/my-shows-detailed", async (c) => {
  try {
    const userId = await verifyAuth(c.req.raw);
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const shows = await kv.get(`myShows:${userId}`) || [];
    const apiKey = Deno.env.get('TMDB_API_KEY');
    const detailedShows = [];

    for (const show of shows) {
      try {
        // Get show details from TMDB
        const detailsResponse = await fetch(
          `https://api.themoviedb.org/3/tv/${show.id}?api_key=${apiKey}&append_to_response=watch/providers`
        );
        const details = await detailsResponse.json();

        // Get season details for the tracked season
        const seasonNum = show.selectedSeason || details.number_of_seasons;
        const seasonResponse = await fetch(
          `https://api.themoviedb.org/3/tv/${show.id}/season/${seasonNum}?api_key=${apiKey}`
        );
        const seasonData = await seasonResponse.json();

        // Calculate watch progress
        let watchedCount = 0;
        let totalEpisodes = seasonData.episodes?.length || 0;
        let nextUnwatchedEpisode = null;

        if (seasonData.episodes) {
          for (const episode of seasonData.episodes) {
            const watchKey = `watchHistory:${userId}:${show.id}:${seasonNum}:${episode.episode_number}`;
            const watchStatus = await kv.get(watchKey);
            
            if (watchStatus?.watched) {
              watchedCount++;
            } else if (!nextUnwatchedEpisode && episode.air_date && new Date(episode.air_date) <= new Date()) {
              nextUnwatchedEpisode = episode;
            }
          }
        }

        // Get streaming providers
        const usProviders = details['watch/providers']?.results?.US?.flatrate || [];

        detailedShows.push({
          ...show,
          status: details.status,
          genres: details.genres,
          nextEpisodeToAir: details.next_episode_to_air,
          lastEpisodeToAir: details.last_episode_to_air,
          numberOfSeasons: details.number_of_seasons,
          providers: usProviders,
          seasonData: {
            seasonNumber: seasonNum,
            episodeCount: totalEpisodes,
            watchedCount: watchedCount,
            progress: totalEpisodes > 0 ? (watchedCount / totalEpisodes) * 100 : 0,
            nextUnwatchedEpisode: nextUnwatchedEpisode
          }
        });
      } catch (err) {
        console.log(`Error fetching details for show ${show.id}:`, err);
        // Still include the show with basic info
        detailedShows.push({
          ...show,
          seasonData: {
            seasonNumber: show.selectedSeason || 1,
            episodeCount: 0,
            watchedCount: 0,
            progress: 0,
            nextUnwatchedEpisode: null
          }
        });
      }
    }

    return c.json({ shows: detailedShows });
  } catch (error) {
    console.log(`Error fetching detailed shows: ${error}`);
    return c.json({ error: String(error) }, 500);
  }
});

// Get upcoming episodes for user's shows
app.get("/make-server-e949556f/schedule", async (c) => {
  try {
    const userId = await verifyAuth(c.req.raw);
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const shows = await kv.get(`myShows:${userId}`) || [];
    const apiKey = Deno.env.get('TMDB_API_KEY');
    const schedule: any[] = [];

    // For each show, get the latest season info
    for (const show of shows) {
      try {
        const detailsResponse = await fetch(
          `https://api.themoviedb.org/3/tv/${show.id}?api_key=${apiKey}`
        );
        const details = await detailsResponse.json();

        // Get episodes from the latest season
        if (details.last_episode_to_air || details.next_episode_to_air) {
          if (details.next_episode_to_air) {
            schedule.push({
              showId: show.id,
              showName: show.name,
              showPoster: show.poster,
              episode: details.next_episode_to_air,
              airDate: details.next_episode_to_air.air_date,
              type: 'upcoming'
            });
          }
        }

        // Also check recent episodes from current season
        if (details.last_episode_to_air) {
          const seasonNum = details.last_episode_to_air.season_number;
          const seasonResponse = await fetch(
            `https://api.themoviedb.org/3/tv/${show.id}/season/${seasonNum}?api_key=${apiKey}`
          );
          const season = await seasonResponse.json();

          if (season.episodes) {
            const now = new Date();
            const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

            season.episodes.forEach((episode: any) => {
              if (episode.air_date) {
                const airDate = new Date(episode.air_date);
                if (airDate >= thirtyDaysAgo && airDate <= thirtyDaysFromNow) {
                  const isUpcoming = airDate > now;
                  schedule.push({
                    showId: show.id,
                    showName: show.name,
                    showPoster: show.poster,
                    episode: episode,
                    airDate: episode.air_date,
                    type: isUpcoming ? 'upcoming' : 'recent'
                  });
                }
              }
            });
          }
        }
      } catch (err) {
        console.log(`Error fetching details for show ${show.id}:`, err);
      }
    }

    // Sort by air date
    schedule.sort((a, b) => new Date(a.airDate).getTime() - new Date(b.airDate).getTime());

    return c.json({ schedule });
  } catch (error) {
    console.log(`Error fetching schedule: ${error}`);
    return c.json({ error: String(error) }, 500);
  }
});

// Personal queue endpoints (for discovery/matching)
app.get("/make-server-e949556f/queue", async (c) => {
  try {
    const userId = await verifyAuth(c.req.raw);
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const queue = await kv.get(`queue:${userId}`) || [];
    return c.json({ queue });
  } catch (error) {
    console.log(`Error fetching queue: ${error}`);
    return c.json({ error: String(error) }, 500);
  }
});

app.post("/make-server-e949556f/queue", async (c) => {
  try {
    const userId = await verifyAuth(c.req.raw);
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const item = await c.req.json();
    const queue = await kv.get(`queue:${userId}`) || [];
    
    // Check if already in queue
    const exists = queue.find((q: any) => q.id === item.id && q.type === item.type);
    if (exists) {
      return c.json({ error: "Already in queue" }, 400);
    }

    queue.push({ ...item, addedAt: new Date().toISOString() });
    await kv.set(`queue:${userId}`, queue);

    // Add to activity feed
    const profile = await kv.get(`user:${userId}`);
    await addActivity(userId, 'added', item, profile?.name);

    return c.json({ queue });
  } catch (error) {
    console.log(`Error adding to queue: ${error}`);
    return c.json({ error: String(error) }, 500);
  }
});

app.delete("/make-server-e949556f/queue/:type/:id", async (c) => {
  try {
    const userId = await verifyAuth(c.req.raw);
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { type, id } = c.req.param();
    const queue = await kv.get(`queue:${userId}`) || [];
    const filteredQueue = queue.filter((item: any) => !(item.id === parseInt(id) && item.type === type));
    
    await kv.set(`queue:${userId}`, filteredQueue);
    return c.json({ queue: filteredQueue });
  } catch (error) {
    console.log(`Error removing from queue: ${error}`);
    return c.json({ error: String(error) }, 500);
  }
});

// Group endpoints
app.post("/make-server-e949556f/groups", async (c) => {
  try {
    const userId = await verifyAuth(c.req.raw);
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { name, memberIds } = await c.req.json();
    const groupId = `group:${crypto.randomUUID()}`;
    
    const group = {
      id: groupId,
      name,
      createdBy: userId,
      members: [userId, ...memberIds],
      createdAt: new Date().toISOString()
    };

    await kv.set(groupId, group);
    
    // Add to each member's group list
    for (const memberId of group.members) {
      const memberGroups = await kv.get(`userGroups:${memberId}`) || [];
      memberGroups.push(groupId);
      await kv.set(`userGroups:${memberId}`, memberGroups);
    }

    return c.json({ group });
  } catch (error) {
    console.log(`Error creating group: ${error}`);
    return c.json({ error: String(error) }, 500);
  }
});

app.get("/make-server-e949556f/groups", async (c) => {
  try {
    const userId = await verifyAuth(c.req.raw);
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const groupIds = await kv.get(`userGroups:${userId}`) || [];
    const groups = await kv.mget(groupIds);
    
    // Fetch member details for each group
    const groupsWithMembers = await Promise.all(
      groups.map(async (group: any) => {
        const members = await kv.mget(group.members.map((id: string) => `user:${id}`));
        return { ...group, memberDetails: members };
      })
    );

    return c.json({ groups: groupsWithMembers });
  } catch (error) {
    console.log(`Error fetching groups: ${error}`);
    return c.json({ error: String(error) }, 500);
  }
});

// Group queue and swipe endpoints
app.post("/make-server-e949556f/groups/:groupId/queue", async (c) => {
  try {
    const userId = await verifyAuth(c.req.raw);
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { groupId } = c.req.param();
    const item = await c.req.json();
    
    const queueKey = `${groupId}:queue`;
    const queue = await kv.get(queueKey) || [];
    
    const exists = queue.find((q: any) => q.id === item.id && q.type === item.type);
    if (!exists) {
      queue.push({ ...item, addedBy: userId, addedAt: new Date().toISOString() });
      await kv.set(queueKey, queue);
    }

    return c.json({ queue });
  } catch (error) {
    console.log(`Error adding to group queue: ${error}`);
    return c.json({ error: String(error) }, 500);
  }
});

app.get("/make-server-e949556f/groups/:groupId/queue", async (c) => {
  try {
    const userId = await verifyAuth(c.req.raw);
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { groupId } = c.req.param();
    const queue = await kv.get(`${groupId}:queue`) || [];

    return c.json({ queue });
  } catch (error) {
    console.log(`Error fetching group queue: ${error}`);
    return c.json({ error: String(error) }, 500);
  }
});

app.post("/make-server-e949556f/groups/:groupId/swipe", async (c) => {
  try {
    const userId = await verifyAuth(c.req.raw);
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { groupId } = c.req.param();
    const { itemId, itemType, direction, ratingType, watchedStatus } = await c.req.json();
    
    const swipeKey = `${groupId}:swipes:${itemType}:${itemId}`;
    const swipes = await kv.get(swipeKey) || { 
      likes: [], 
      passes: [],
      userDetails: {} // Store rating type and watched status per user
    };
    
    // Support both old direction-based and new rating type-based swipes
    const finalRatingType = ratingType || (direction === 'right' ? 'thumbs_up' : 'thumbs_down');
    const isPositive = finalRatingType === 'thumbs_up' || finalRatingType === 'two_thumbs_up';
    
    // Remove user from both lists first
    swipes.likes = swipes.likes.filter((id: string) => id !== userId);
    swipes.passes = swipes.passes.filter((id: string) => id !== userId);
    
    if (isPositive) {
      swipes.likes.push(userId);
    } else {
      swipes.passes.push(userId);
    }
    
    // Store user's rating details
    if (!swipes.userDetails) swipes.userDetails = {};
    swipes.userDetails[userId] = {
      ratingType: finalRatingType,
      watchedStatus: watchedStatus || 'not_seen',
      swipedAt: new Date().toISOString()
    };
    
    await kv.set(swipeKey, swipes);

    // Check if it's a match (all members gave thumbs up or two thumbs up)
    const group = await kv.get(groupId);
    const isMatch = group.members.every((memberId: string) => swipes.likes.includes(memberId));
    
    if (isMatch) {
      const matchesKey = `${groupId}:matches`;
      const matches = await kv.get(matchesKey) || [];
      
      // Don't add duplicate matches
      const existingMatch = matches.find((m: any) => m.id === itemId && m.type === itemType);
      if (!existingMatch) {
        matches.push({ 
          id: itemId, 
          type: itemType, 
          matchedAt: new Date().toISOString(),
          userDetails: swipes.userDetails
        });
        await kv.set(matchesKey, matches);
      }
      
      return c.json({ swipes, match: true });
    }

    return c.json({ swipes, match: false });
  } catch (error) {
    console.log(`Error recording swipe: ${error}`);
    return c.json({ error: String(error) }, 500);
  }
});

app.get("/make-server-e949556f/groups/:groupId/matches", async (c) => {
  try {
    const userId = await verifyAuth(c.req.raw);
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { groupId } = c.req.param();
    const matches = await kv.get(`${groupId}:matches`) || [];

    return c.json({ matches });
  } catch (error) {
    console.log(`Error fetching matches: ${error}`);
    return c.json({ error: String(error) }, 500);
  }
});

// Activity feed
async function addActivity(userId: string, action: string, item: any, userName: string) {
  const activity = {
    userId,
    userName,
    action,
    item,
    timestamp: new Date().toISOString()
  };
  
  const feedKey = `feed:${userId}`;
  const feed = await kv.get(feedKey) || [];
  feed.unshift(activity);
  await kv.set(feedKey, feed.slice(0, 100)); // Keep last 100 activities
}

app.get("/make-server-e949556f/feed", async (c) => {
  try {
    const userId = await verifyAuth(c.req.raw);
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Get user's own feed
    const myFeed = await kv.get(`feed:${userId}`) || [];
    
    // TODO: In a real app, we'd fetch friends' feeds too
    // For now, just return user's own activity
    return c.json({ feed: myFeed });
  } catch (error) {
    console.log(`Error fetching feed: ${error}`);
    return c.json({ error: String(error) }, 500);
  }
});

// Rating endpoints
app.post("/make-server-e949556f/rate", async (c) => {
  try {
    const userId = await verifyAuth(c.req.raw);
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { itemId, itemType, rating, ratingType, watchedStatus, item } = await c.req.json();
    const ratingKey = `rating:${userId}:${itemType}:${itemId}`;
    
    // Support both old number-based ratings and new Netflix-style ratings
    const finalRatingType = ratingType || (rating >= 7 ? 'thumbs_up' : rating >= 4 ? 'neutral' : 'thumbs_down');
    const finalWatchedStatus = watchedStatus || 'not_seen'; // Default to not_seen for backward compatibility
    
    await kv.set(ratingKey, { 
      rating: rating || 0, // Keep numeric rating for backward compatibility
      ratingType: finalRatingType,
      watchedStatus: finalWatchedStatus,
      itemId, 
      itemType,
      ratedAt: new Date().toISOString() 
    });

    // Add to activity feed (only if rating is positive)
    if (finalRatingType === 'thumbs_up' || finalRatingType === 'two_thumbs_up' || rating >= 7) {
      const profile = await kv.get(`user:${userId}`);
      await addActivity(userId, 'rated', { ...item, ratingType: finalRatingType }, profile?.name);
    }

    return c.json({ success: true });
  } catch (error) {
    console.log(`Error saving rating: ${error}`);
    return c.json({ error: String(error) }, 500);
  }
});

app.get("/make-server-e949556f/ratings", async (c) => {
  try {
    const userId = await verifyAuth(c.req.raw);
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Get all ratings for this user
    const allRatings = await kv.getByPrefix(`rating:${userId}:`);
    return c.json({ ratings: allRatings || [] });
  } catch (error) {
    console.log(`Error fetching ratings: ${error}`);
    return c.json({ error: String(error) }, 500);
  }
});

app.get("/make-server-e949556f/rating/:type/:id", async (c) => {
  try {
    const userId = await verifyAuth(c.req.raw);
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { type, id } = c.req.param();
    const ratingKey = `rating:${userId}:${type}:${id}`;
    const rating = await kv.get(ratingKey);
    
    return c.json({ rating: rating?.rating || null });
  } catch (error) {
    console.log(`Error fetching rating: ${error}`);
    return c.json({ error: String(error) }, 500);
  }
});

// Episode notification endpoints
app.get("/make-server-e949556f/episode-notifications/:showId/:season/:episode", async (c) => {
  try {
    const userId = await verifyAuth(c.req.raw);
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { showId, season, episode } = c.req.param();
    const key = `notification:${userId}:${showId}:${season}:${episode}`;
    const notification = await kv.get(key);
    
    return c.json({ enabled: notification?.enabled || false });
  } catch (error) {
    console.log(`Error fetching episode notification: ${error}`);
    return c.json({ error: String(error) }, 500);
  }
});

app.post("/make-server-e949556f/episode-notifications", async (c) => {
  try {
    const userId = await verifyAuth(c.req.raw);
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { showId, seasonNumber, episodeNumber, episodeName, airDate, enabled } = await c.req.json();
    const key = `notification:${userId}:${showId}:${seasonNumber}:${episodeNumber}`;
    
    if (enabled) {
      await kv.set(key, {
        showId,
        seasonNumber,
        episodeNumber,
        episodeName,
        airDate,
        enabled: true,
        createdAt: new Date().toISOString()
      });
    } else {
      await kv.del(key);
    }

    return c.json({ success: true });
  } catch (error) {
    console.log(`Error saving episode notification: ${error}`);
    return c.json({ error: String(error) }, 500);
  }
});

// Watch history endpoints
app.get("/make-server-e949556f/watch-history/:showId/:season/:episode", async (c) => {
  try {
    const userId = await verifyAuth(c.req.raw);
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { showId, season, episode } = c.req.param();
    const key = `watchHistory:${userId}:${showId}:${season}:${episode}`;
    const history = await kv.get(key);
    
    return c.json({ 
      watched: history?.watched || false,
      rating: history?.rating || 0
    });
  } catch (error) {
    console.log(`Error fetching watch history: ${error}`);
    return c.json({ error: String(error) }, 500);
  }
});

app.post("/make-server-e949556f/watch-history", async (c) => {
  try {
    const userId = await verifyAuth(c.req.raw);
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { showId, seasonNumber, episodeNumber, episodeName, watched, rating } = await c.req.json();
    const key = `watchHistory:${userId}:${showId}:${seasonNumber}:${episodeNumber}`;
    
    await kv.set(key, {
      showId,
      seasonNumber,
      episodeNumber,
      episodeName,
      watched,
      rating,
      updatedAt: new Date().toISOString()
    });

    return c.json({ success: true });
  } catch (error) {
    console.log(`Error saving watch history: ${error}`);
    return c.json({ error: String(error) }, 500);
  }
});

// Watch list endpoint - returns all aired episodes from tracked shows
app.get("/make-server-e949556f/watch-list", async (c) => {
  try {
    const userId = await verifyAuth(c.req.raw);
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const shows = await kv.get(`myShows:${userId}`) || [];
    const apiKey = Deno.env.get('TMDB_API_KEY');
    const episodes: any[] = [];

    // For each show, get all episodes from tracked seasons
    for (const show of shows) {
      try {
        const detailsResponse = await fetch(
          `https://api.themoviedb.org/3/tv/${show.id}?api_key=${apiKey}`
        );
        const details = await detailsResponse.json();

        // Get episodes from the tracked season or latest season
        const seasonToFetch = show.selectedSeason || details.number_of_seasons;
        const seasonResponse = await fetch(
          `https://api.themoviedb.org/3/tv/${show.id}/season/${seasonToFetch}?api_key=${apiKey}`
        );
        const season = await seasonResponse.json();

        if (season.episodes) {
          const now = new Date();
          
          // Only include aired episodes
          for (const episode of season.episodes) {
            if (episode.air_date) {
              const airDate = new Date(episode.air_date);
              if (airDate <= now) {
                // Check watch status
                const watchKey = `watchHistory:${userId}:${show.id}:${episode.season_number}:${episode.episode_number}`;
                const watchStatus = await kv.get(watchKey);
                
                episodes.push({
                  showId: show.id,
                  showName: show.name,
                  showPoster: show.poster,
                  episode: episode,
                  watched: watchStatus?.watched || false,
                  rating: watchStatus?.rating || 0
                });
              }
            }
          }
        }
      } catch (err) {
        console.log(`Error fetching episodes for show ${show.id}:`, err);
      }
    }

    // Sort by air date (most recent first)
    episodes.sort((a, b) => {
      const dateA = new Date(a.episode.air_date);
      const dateB = new Date(b.episode.air_date);
      return dateB.getTime() - dateA.getTime();
    });

    return c.json({ episodes });
  } catch (error) {
    console.log(`Error fetching watch list: ${error}`);
    return c.json({ error: String(error) }, 500);
  }
});

// Analytics endpoint
app.get("/make-server-e949556f/analytics", async (c) => {
  try {
    const userId = await verifyAuth(c.req.raw);
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const apiKey = Deno.env.get('TMDB_API_KEY');
    const shows = await kv.get(`myShows:${userId}`) || [];
    
    // Get all watch history for this user
    const watchHistoryKeys = await kv.getByPrefix(`watchHistory:${userId}:`);
    
    // Platform analytics
    const platformStats: { [key: string]: { 
      episodesWatched: number; 
      shows: Set<number>;
      totalRuntime: number;
      showTitles: string[];
    } } = {};
    
    const showProviders: { [key: number]: any[] } = {};
    const showDetails: { [key: number]: any } = {};
    
    // Get show details and providers
    for (const show of shows) {
      try {
        const detailsResponse = await fetch(
          `https://api.themoviedb.org/3/tv/${show.id}?api_key=${apiKey}&append_to_response=watch/providers`
        );
        const details = await detailsResponse.json();
        showDetails[show.id] = details;
        
        const usProviders = details['watch/providers']?.results?.US?.flatrate || [];
        showProviders[show.id] = usProviders;
      } catch (err) {
        console.log(`Error fetching show ${show.id}:`, err);
      }
    }
    
    // Analyze watch history
    for (const historyItem of watchHistoryKeys) {
      if (historyItem.watched) {
        const showId = historyItem.showId;
        const providers = showProviders[showId] || [];
        const showDetail = showDetails[showId];
        const showName = shows.find((s: any) => s.id === showId)?.name || 'Unknown';
        
        // Estimate runtime (average TV episode is 45 min)
        const runtime = showDetail?.episode_run_time?.[0] || 45;
        
        // Attribute to each provider
        if (providers.length > 0) {
          providers.forEach((provider: any) => {
            const providerName = provider.provider_name;
            if (!platformStats[providerName]) {
              platformStats[providerName] = {
                episodesWatched: 0,
                shows: new Set<number>(),
                totalRuntime: 0,
                showTitles: []
              };
            }
            platformStats[providerName].episodesWatched++;
            platformStats[providerName].shows.add(showId);
            platformStats[providerName].totalRuntime += runtime;
            if (!platformStats[providerName].showTitles.includes(showName)) {
              platformStats[providerName].showTitles.push(showName);
            }
          });
        }
      }
    }
    
    // Convert to array and calculate percentages
    const totalEpisodes = watchHistoryKeys.filter((h: any) => h.watched).length;
    const totalMinutes = Object.values(platformStats).reduce((sum, stat) => sum + stat.totalRuntime, 0);
    
    const platformData = Object.entries(platformStats).map(([name, stats]) => ({
      name,
      episodesWatched: stats.episodesWatched,
      showCount: stats.shows.size,
      totalMinutes: stats.totalRuntime,
      totalHours: Math.round(stats.totalRuntime / 60),
      percentage: totalEpisodes > 0 ? Math.round((stats.episodesWatched / totalEpisodes) * 100) : 0,
      timePercentage: totalMinutes > 0 ? Math.round((stats.totalRuntime / totalMinutes) * 100) : 0,
      showTitles: stats.showTitles
    })).sort((a, b) => b.episodesWatched - a.episodesWatched);
    
    // Get top shows
    const showEpisodeCounts: { [key: number]: number } = {};
    watchHistoryKeys.forEach((h: any) => {
      if (h.watched && h.showId) {
        showEpisodeCounts[h.showId] = (showEpisodeCounts[h.showId] || 0) + 1;
      }
    });
    
    const topShows = Object.entries(showEpisodeCounts)
      .map(([showId, count]) => {
        const show = shows.find((s: any) => s.id === parseInt(showId));
        const providers = showProviders[parseInt(showId)] || [];
        return {
          id: parseInt(showId),
          name: show?.name || 'Unknown',
          poster: show?.poster,
          episodesWatched: count,
          providers: providers.map((p: any) => p.provider_name)
        };
      })
      .sort((a, b) => b.episodesWatched - a.episodesWatched)
      .slice(0, 10);
    
    // Calculate recommendations for service optimization
    const recommendations = [];
    
    // Find underutilized services (< 10% of watch time)
    const underutilized = platformData.filter(p => p.timePercentage < 10 && p.timePercentage > 0);
    if (underutilized.length > 0) {
      recommendations.push({
        type: 'remove',
        platforms: underutilized.map(p => p.name),
        message: `You watch less than 10% of your content on ${underutilized.map(p => p.name).join(', ')}. Consider removing ${underutilized.length === 1 ? 'this service' : 'these services'} to save money.`,
        savings: underutilized.length * 10 // Estimate $10/month per service
      });
    }
    
    // Find primary platform
    if (platformData.length > 0 && platformData[0].timePercentage > 50) {
      recommendations.push({
        type: 'primary',
        platforms: [platformData[0].name],
        message: `${platformData[0].name} is your primary streaming service with ${platformData[0].timePercentage}% of your watch time.`
      });
    }
    
    return c.json({
      summary: {
        totalEpisodes,
        totalMinutes,
        totalHours: Math.round(totalMinutes / 60),
        totalShows: shows.length,
        platformCount: platformData.length
      },
      platforms: platformData,
      topShows,
      recommendations
    });
  } catch (error) {
    console.log(`Error generating analytics: ${error}`);
    return c.json({ error: String(error) }, 500);
  }
});

Deno.serve(app.fetch);