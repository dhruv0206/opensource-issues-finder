import { betterAuth } from "better-auth";
import { Pool } from "pg";

// Create pool instance for both Better Auth and custom queries
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const auth = betterAuth({
  database: pool,
  emailAndPassword: {
    enabled: false, // GitHub only for now
  },
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
      // Map GitHub profile to user fields
      mapProfileToUser: (profile) => {
        return {
          name: profile.login, // GitHub username
          email: profile.email,
          image: profile.avatar_url,
        };
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // Update session every day
  },
  // Use databaseHooks for reliable first-login profile population
  databaseHooks: {
    user: {
      create: {
        // After user is created, populate GitHub profile
        after: async (user) => {
          // Give a small delay for the account to be created
          setTimeout(async () => {
            try {
              // Get the access token from the account table
              const accountResult = await pool.query(
                'SELECT "accessToken" FROM account WHERE "userId" = $1 AND "providerId" = $2',
                [user.id, "github"]
              );
              
              const accessToken = accountResult.rows[0]?.accessToken;
              
              if (accessToken) {
                const response = await fetch("https://api.github.com/user", {
                  headers: {
                    Authorization: `Bearer ${accessToken}`,
                    Accept: "application/vnd.github+json",
                    "User-Agent": "ContribFinder",
                  },
                });
                
                if (response.ok) {
                  const profile = await response.json();
                  
                  // Update user with GitHub profile data
                  await pool.query(
                    `UPDATE "user" SET
                      "githubUsername" = $1,
                      "githubId" = $2,
                      "company" = $3,
                      "blog" = $4,
                      "location" = $5,
                      "bio" = $6,
                      "twitterUsername" = $7,
                      "publicRepos" = $8,
                      "followers" = $9,
                      "following" = $10,
                      "githubCreatedAt" = $11,
                      "hireable" = $12
                    WHERE id = $13`,
                    [
                      profile.login,
                      profile.id,
                      profile.company,
                      profile.blog,
                      profile.location,
                      profile.bio,
                      profile.twitter_username,
                      profile.public_repos,
                      profile.followers,
                      profile.following,
                      profile.created_at ? new Date(profile.created_at) : null,
                      profile.hireable,
                      user.id,
                    ]
                  );
                  
                  console.log(`[Auth] GitHub profile saved for user ${profile.login}`);
                } else {
                  console.error(`[Auth] GitHub API error: ${response.status}`);
                }
              } else {
                console.log(`[Auth] No access token found for user ${user.id}`);
              }
            } catch (error) {
              console.error("[Auth] Failed to fetch GitHub profile:", error);
            }
          }, 500); // Small delay to ensure account record exists
        },
      },
    },
  },
});

