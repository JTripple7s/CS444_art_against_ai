const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const bcrypt = require("bcryptjs");

const BRAIN_DIR = "C:\\Users\\jtbur\\.gemini\\antigravity-ide\\brain\\4022ad70-16b6-46fc-a40b-0cb5fe51d26b";
const UPLOADS_DIR = path.join(__dirname, "../uploads");

// Asset mapping: Target Upload Name -> Generated Source Name pattern
const ASSET_MAPPING = {
  "seed_cozy_cabin.png": "seed_cozy_cabin_1784476484316.png",
  "seed_celestial_whale.png": "seed_celestial_whale_1784476496115.png",
  "seed_charcoal_man.png": "seed_charcoal_man_1784476507073.png",
  "seed_neon_bazaar.png": "seed_neon_bazaar_1784476517303.png",
  "seed_clockwork_tree.png": "seed_clockwork_tree_1784476526904.png",
  "seed_morning_lake.png": "seed_morning_lake_1784476534796.png",
  "seed_retro_astronaut.png": "seed_retro_astronaut_1784476543858.png",
  "seed_phoenix_glass.png": "seed_phoenix_glass_1784476553085.png",
  "seed_surreal_instruments.png": "seed_surreal_instruments_1784476564265.png",
  "seed_clay_dragon.png": "seed_clay_dragon_1784476572531.png",
  "avatar_painter.png": "avatar_painter_1784476583448.png",
  "avatar_cyberpunk.png": "avatar_cyberpunk_1784476593775.png",
  "avatar_sculptor.png": "avatar_sculptor_1784476611838.png"
};

function copyAssets() {
  console.log("Copying generated seed assets to uploads directory...");
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }

  for (const [targetName, srcName] of Object.entries(ASSET_MAPPING)) {
    const srcPath = path.join(BRAIN_DIR, srcName);
    const destPath = path.join(UPLOADS_DIR, targetName);

    if (fs.existsSync(srcPath)) {
      try {
        fs.copyFileSync(srcPath, destPath);
        console.log(`Copied: ${srcName} -> ${targetName}`);
      } catch (err) {
        console.error(`Failed to copy ${srcName}:`, err.message);
      }
    } else {
      console.warn(`Source asset not found: ${srcPath}. Skipping copy.`);
    }
  }
}

async function seed() {
  copyAssets();

  const dbPath = path.join(__dirname, "AAA.db");
  console.log(`Connecting to database at ${dbPath}...`);

  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  console.log("Clearing existing tables...");
  try {
    await db.run("DELETE FROM comments");
  } catch(e) {}
  try {
    await db.run("DELETE FROM artwork_votes");
  } catch(e) {}
  try {
    await db.run("DELETE FROM follows");
  } catch(e) {}
  try {
    await db.run("DELETE FROM artworks");
  } catch(e) {}
  try {
    await db.run("DELETE FROM users");
  } catch(e) {}

  // Reset auto-increment
  try {
    await db.run("DELETE FROM sqlite_sequence WHERE name='users'");
    await db.run("DELETE FROM sqlite_sequence WHERE name='artworks'");
    await db.run("DELETE FROM sqlite_sequence WHERE name='comments'");
    await db.run("DELETE FROM sqlite_sequence WHERE name='follows'");
  } catch(e) {}

  console.log("Generating password hashes...");
  const passwordHash = await bcrypt.hash("password123", 10);

  const seedUsers = [
    {
      username: "Aura_Digital",
      email: "aura@digital.local",
      bio: "Digital illustrator passionate about neon lighting and cyberpunk themes.",
      profile_pic_url: "/uploads/avatar_cyberpunk.png"
    },
    {
      username: "Canvas_Queen",
      email: "queen@canvas.local",
      bio: "Fine art student. Specialized in cozy oil paintings and watercolors.",
      profile_pic_url: "/uploads/avatar_painter.png"
    },
    {
      username: "Clay_Craftsman",
      email: "clay@craftsman.local",
      bio: "Sculptor and miniature model maker. Clay is my playground.",
      profile_pic_url: "/uploads/avatar_sculptor.png"
    },
    {
      username: "Ink_Master",
      email: "ink@master.local",
      bio: "Drawing trees, gears, and clockwork. Sketchbook is my diary.",
      profile_pic_url: null
    },
    {
      username: "Stella_Nebula",
      email: "stella@nebula.local",
      bio: "Dreaming in watercolors. Space, stars, and magical creatures.",
      profile_pic_url: null
    },
    {
      username: "Retro_Block",
      email: "retro@block.local",
      bio: "Lino-cut printing enthusiast. Vintage cosmic landscapes.",
      profile_pic_url: null
    }
  ];

  console.log("Seeding users...");
  const userMap = {}; // mapping username to database ID
  for (const user of seedUsers) {
    const res = await db.run(
      `INSERT INTO users (username, email, password_hash, profile_pic_url, bio)
       VALUES (?, ?, ?, ?, ?)`,
      [user.username, user.email, passwordHash, user.profile_pic_url, user.bio]
    );
    userMap[user.username] = res.lastID;
  }
  console.log("Seeded users:", Object.keys(userMap));

  const seedArtworks = [
    {
      title: "Nebula Dreams",
      artist: "Stella_Nebula",
      image_url: "/uploads/seed_celestial_whale.png",
      description: "A whimsical watercolor dream of floating in a celestial ocean alongside a giant nebula whale. Hand-painted on cold-press paper with soft indigo and purple gradients."
    },
    {
      title: "Cozy Fireplace Cabin",
      artist: "Canvas_Queen",
      image_url: "/uploads/seed_cozy_cabin.png",
      description: "An oil painting capturing a quiet log cabin deep in a warm autumn forest. Warm light and a cozy fire glow through the windows."
    },
    {
      title: "Wise Charcoal Portrait",
      artist: "Canvas_Queen",
      image_url: "/uploads/seed_charcoal_man.png",
      description: "A realistic charcoal and pencil sketch focusing on the expressive eyes and deep lines of a wise old storyteller."
    },
    {
      title: "Cyberpunk Bazaar",
      artist: "Aura_Digital",
      image_url: "/uploads/seed_neon_bazaar.png",
      description: "A digital painting of a busy neon street market in a futuristic city. Captures warm food stall lights reflecting off rainy streets."
    },
    {
      title: "The Clockwork Tree",
      artist: "Ink_Master",
      image_url: "/uploads/seed_clockwork_tree.png",
      description: "An intricate black ink illustration showing mechanical brass gears and cogs working together to form a living tree."
    },
    {
      title: "Calm Lake Sunrise",
      artist: "Canvas_Queen",
      image_url: "/uploads/seed_morning_lake.png",
      description: "A soft, impressionistic pastel drawing capturing a quiet mountain lake at dawn as the first pink light hits the mist."
    },
    {
      title: "Astronaut Moons",
      artist: "Retro_Block",
      image_url: "/uploads/seed_retro_astronaut.png",
      description: "A handmade, two-tone lino-cut block print showing an astronaut looking at twin moons over an alien desert."
    },
    {
      title: "Stained Glass Phoenix",
      artist: "Stella_Nebula",
      image_url: "/uploads/seed_phoenix_glass.png",
      description: "A geometric stained glass mosaic concept depicting a phoenix rising from the ashes in brilliant red and orange hues."
    },
    {
      title: "Melting Violins",
      artist: "Stella_Nebula",
      image_url: "/uploads/seed_surreal_instruments.png",
      description: "A surrealist oil painting inspired by dream states, showing melting instruments in an endless golden desert."
    },
    {
      title: "Sleeping Clay Dragon",
      artist: "Clay_Craftsman",
      image_url: "/uploads/seed_clay_dragon.png",
      description: "A macro view of a tiny green dragon sculpture hand-sculpted in polymer clay, curled up sleeping on old leather books."
    }
  ];

  console.log("Seeding artworks...");
  const artMap = {}; // mapping title to database ID
  for (const art of seedArtworks) {
    const userId = userMap[art.artist];
    const res = await db.run(
      `INSERT INTO artworks (title, description, image_url, user_id, vote_count)
       VALUES (?, ?, ?, ?, ?)`,
      [art.title, art.description, art.image_url, userId, 0]
    );
    artMap[art.title] = res.lastID;
  }
  console.log("Seeded artworks:", Object.keys(artMap));

  // Seed follows
  const seedFollows = [
    { follower: "Stella_Nebula", followed: "Aura_Digital" },
    { follower: "Stella_Nebula", followed: "Canvas_Queen" },
    { follower: "Stella_Nebula", followed: "Ink_Master" },
    { follower: "Aura_Digital", followed: "Stella_Nebula" },
    { follower: "Aura_Digital", followed: "Ink_Master" },
    { follower: "Aura_Digital", followed: "Retro_Block" },
    { follower: "Canvas_Queen", followed: "Clay_Craftsman" },
    { follower: "Canvas_Queen", followed: "Stella_Nebula" },
    { follower: "Clay_Craftsman", followed: "Canvas_Queen" },
    { follower: "Retro_Block", followed: "Ink_Master" },
    { follower: "Retro_Block", followed: "Aura_Digital" }
  ];

  console.log("Seeding follows...");
  for (const follow of seedFollows) {
    await db.run(
      `INSERT INTO follows (follower_id, followed_id) VALUES (?, ?)`,
      [userMap[follow.follower], userMap[follow.followed]]
    );
  }

  // Seed comments
  const seedComments = [
    { art: "Nebula Dreams", user: "Aura_Digital", text: "This is stunning! The watercolor blend is absolutely beautiful." },
    { art: "Nebula Dreams", user: "Ink_Master", text: "I love the whimsical feel. Watercolor suits this cosmic theme perfectly." },
    { art: "Nebula Dreams", user: "Canvas_Queen", text: "Beautiful work, Stella. The whale is very creative!" },
    
    { art: "Cozy Fireplace Cabin", user: "Stella_Nebula", text: "Wow, it feels so warm and inviting. I wish I could step inside!" },
    { art: "Cozy Fireplace Cabin", user: "Clay_Craftsman", text: "Excellent texture details on the logs and chimney. Masterful oil technique." },
    
    { art: "Wise Charcoal Portrait", user: "Ink_Master", text: "The contrast between light and dark in this sketch is spectacular." },
    { art: "Wise Charcoal Portrait", user: "Aura_Digital", text: "Incredible detail in the beard. Feels very emotional and alive." },
    
    { art: "Cyberpunk Bazaar", user: "Stella_Nebula", text: "I love how the neon reflections look on the wet pavement. Spectacular!" },
    { art: "Cyberpunk Bazaar", user: "Retro_Block", text: "Great architectural details. The atmosphere is top-notch." },
    
    { art: "The Clockwork Tree", user: "Aura_Digital", text: "The line work on those brass gears must have taken ages! Incredibly precise." },
    { art: "The Clockwork Tree", user: "Canvas_Queen", text: "Fascinating concept. The blending of organic and mechanical details is beautiful." },
    
    { art: "Astronaut Moons", user: "Ink_Master", text: "Lino-cuts are so hard to get this clean. Incredible execution." },
    { art: "Astronaut Moons", user: "Aura_Digital", text: "Loving the retro vibes. Color palette works really well!" },
    
    { art: "Sleeping Clay Dragon", user: "Canvas_Queen", text: "Oh my goodness, this is adorable! The leather textures on the books are fantastic." },
    { art: "Sleeping Clay Dragon", user: "Retro_Block", text: "Amazing work on the dragon scales. Love the macro photography too!" }
  ];

  console.log("Seeding comments...");
  for (const comment of seedComments) {
    await db.run(
      `INSERT INTO comments (text, user_id, artwork_id) VALUES (?, ?, ?)`,
      [comment.text, userMap[comment.user], artMap[comment.art]]
    );
  }

  // Seed votes (Upvotes)
  const seedVotes = [
    { art: "Nebula Dreams", voters: ["Aura_Digital", "Ink_Master", "Canvas_Queen"] },
    { art: "Cozy Fireplace Cabin", voters: ["Stella_Nebula", "Clay_Craftsman", "Ink_Master", "Retro_Block"] },
    { art: "Wise Charcoal Portrait", voters: ["Ink_Master", "Aura_Digital"] },
    { art: "Cyberpunk Bazaar", voters: ["Stella_Nebula", "Retro_Block", "Clay_Craftsman"] },
    { art: "The Clockwork Tree", voters: ["Aura_Digital", "Canvas_Queen", "Stella_Nebula"] },
    { art: "Calm Lake Sunrise", voters: ["Stella_Nebula", "Clay_Craftsman"] },
    { art: "Astronaut Moons", voters: ["Ink_Master", "Aura_Digital", "Canvas_Queen"] },
    { art: "Stained Glass Phoenix", voters: ["Canvas_Queen", "Clay_Craftsman"] },
    { art: "Melting Violins", voters: ["Ink_Master", "Aura_Digital"] },
    { art: "Sleeping Clay Dragon", voters: ["Canvas_Queen", "Retro_Block", "Stella_Nebula", "Aura_Digital"] }
  ];

  console.log("Seeding votes...");
  for (const vote of seedVotes) {
    const artworkId = artMap[vote.art];
    for (const voter of vote.voters) {
      const userId = userMap[voter];
      await db.run(
        `INSERT INTO artwork_votes (user_id, artwork_id) VALUES (?, ?)`,
        [userId, artworkId]
      );
    }
    // Update the vote_count column in artworks
    await db.run(
      `UPDATE artworks SET vote_count = ? WHERE id = ?`,
      [vote.voters.length, artworkId]
    );
  }

  console.log("Closing database connection...");
  await db.close();
  console.log("Database seeded successfully!");
}

seed().catch(err => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
