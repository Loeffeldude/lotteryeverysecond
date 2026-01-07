import { DatabaseSync } from "node:sqlite";
import { euroJackpot } from "./lottery/eurojackpot.ts";
import { powerball } from "./lottery/poweball.ts";

const dbPath = Deno.env.get("DATABASE_PATH") || "db.db";
const db = new DatabaseSync(dbPath);

const lotteries = [euroJackpot, powerball];

console.log("Migrating existing lottery results to add winnings...");

const startTime = performance.now();
let updated = 0;

for (const lottery of lotteries) {
  console.log(`Processing ${lottery.type}...`);
  
  const results = db
    .prepare(`SELECT id, draw, guesses FROM draw WHERE lottery_type = ? AND (winnings IS NULL OR winnings = 0)`)
    .all(lottery.type);

  console.log(`Found ${results.length} ${lottery.type} games to update`);

  const updateStmt = db.prepare(
    `UPDATE draw SET prize_tier = ?, winnings = ? WHERE id = ?`
  );

  db.exec("BEGIN TRANSACTION");

  for (const row of results) {
    const draw = lottery.load(JSON.parse(row["draw"] as string));
    const guesses = JSON.parse(row["guesses"] as string);
    const guess = lottery.load(guesses[0]);

    const scoreResult = lottery.score(guess as any, draw as any);

    updateStmt.run(scoreResult.prizeTier, scoreResult.winnings, row["id"]);
    updated++;

    if (updated % 10000 === 0) {
      console.log(`  Updated ${updated.toLocaleString()} records...`);
    }
  }

  db.exec("COMMIT");
  console.log(`Completed ${lottery.type}`);
}

const elapsed = (performance.now() - startTime) / 1000;
console.log(`Migration complete! Updated ${updated.toLocaleString()} records in ${elapsed.toFixed(1)}s`);
