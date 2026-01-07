import { DatabaseSync } from "node:sqlite";
import { z, ZodObject } from "zod";

const dbPath = Deno.env.get("DATABASE_PATH") || "db.db";
const db = new DatabaseSync(dbPath);

const getSchemaVersion = (): number => {
  try {
    const result = db
      .prepare(
        "SELECT version FROM schema_version ORDER BY version DESC LIMIT 1",
      )
      .get();
    return result ? Number(result["version"]) : 0;
  } catch {
    return 0;
  }
};

const setSchemaVersion = (version: number) => {
  db.prepare("INSERT INTO schema_version (version) VALUES (?)").run(version);
};

const migrations = [
  () => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER PRIMARY KEY,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS draw (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lottery_type TEXT,
        draw TEXT,
        guesses TEXT,
        score FLOAT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_draw_type ON draw (lottery_type);
      CREATE INDEX IF NOT EXISTS idx_score ON draw (score);
      CREATE INDEX IF NOT EXISTS idx_draw_type_score ON draw (lottery_type, score);
    `);
  },
  () => {
    db.exec(`
      ALTER TABLE draw ADD COLUMN prize_tier INTEGER;
      ALTER TABLE draw ADD COLUMN winnings FLOAT DEFAULT 0;
      
      CREATE INDEX IF NOT EXISTS idx_draw_winnings ON draw (winnings);
      CREATE INDEX IF NOT EXISTS idx_draw_type_winnings ON draw (lottery_type, winnings);
      CREATE INDEX IF NOT EXISTS idx_draw_timestamp ON draw (timestamp);
    `);
  },
  () => {
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_draw_type_id ON draw (lottery_type, id DESC);
      CREATE INDEX IF NOT EXISTS idx_draw_type_timestamp ON draw (lottery_type, timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_draw_type_winnings_desc ON draw (lottery_type, winnings DESC);
    `);
  },
];

// Run migrations
const currentVersion = getSchemaVersion();
for (let i = currentVersion; i < migrations.length; i++) {
  console.log(`Running migration ${i + 1}...`);
  migrations[i]();
  setSchemaVersion(i + 1);
  console.log(`Migration ${i + 1} completed.`);
}

const parseJsonPreprocessor = (value: unknown, ctx: z.RefinementCtx) => {
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch (e) {
      ctx.addIssue({
        code: "custom",
        message: (e as Error).message,
      });
    }
  }

  return value;
};

const drawSchema = <T extends ZodObject>(schema: T) =>
  z.object({
    id: z.number(),
    lottery_type: z.string(),
    score: z.number(),
    guesses: z.preprocess(parseJsonPreprocessor, z.array(schema)),
    draw: z.preprocess(parseJsonPreprocessor, schema),
    timestamp: z.coerce.date(),
    prize_tier: z.number().nullable().optional(),
    winnings: z.number().optional(),
  });

export { db, drawSchema };
