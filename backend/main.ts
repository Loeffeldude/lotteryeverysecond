import z from "zod";
import { lottery } from "./lottery/base.ts";
import { db, drawSchema } from "./lottery/db.ts";
import { euroJackpot } from "./lottery/eurojackpot.ts";
import { powerball } from "./lottery/poweball.ts";
import type { Statistics } from "./mod.ts";

const sleep = (ms: number) =>
  new Promise<void>((res) =>
    setTimeout(() => {
      res();
    }, ms),
  );

async function everySecond(cb: () => Promise<void>) {
  while (true) {
    const now = performance.now();
    try {
      await cb();
    } catch (e) {
      console.error(e);
    }
    const after = performance.now();
    await sleep(1000 - (after - now));
  }
}

async function saveLotteryResult<T extends ReturnType<typeof lottery>>(
  lottery: T,
) {
  const draw = await lottery.draw();
  const guess = await lottery.draw();
  const scoreResult = lottery.score(guess, draw);

  const result = db
    .prepare(
      `INSERT INTO draw (lottery_type, draw, guesses, score, prize_tier, winnings)
    VALUES (?, ?, ?, ?, ?, ?)
    RETURNING *;`,
    )
    .get(
      lottery.type,
      JSON.stringify(draw),
      JSON.stringify([guess]),
      scoreResult.matchScore,
      scoreResult.prizeTier,
      scoreResult.winnings,
    );

  if (!statsCache.gamesPlayed[lottery.type]) {
    statsCache.gamesPlayed[lottery.type] = 0;
  }
  if (!statsCache.totalWinnings[lottery.type]) {
    statsCache.totalWinnings[lottery.type] = 0;
  }

  statsCache.gamesPlayed[lottery.type]++;
  statsCache.totalWinnings[lottery.type] += scoreResult.winnings;

  if (scoreResult.matchScore === 1.0) {
    statsCache.jackpotWins++;
  }

  return drawSchema(lottery.schema).parse(result);
}

const lotteries = [euroJackpot, powerball];

const routes = new Map<
  URLPattern,
  (pattern: URLPatternResult, request: Request) => Promise<Response> | Response
>();
const sockets = new Set<WebSocket>();
let isPaused = false;
let pauseUntil = 0;

const SOCKET_LOG_DEBOUNCE_MS = Number(Deno.env.get("SOCKET_LOG_DEBOUNCE_MS")) || 60_000;

let socketLogTimeout: number | null = null;
const logSocketCount = () => {
  if (socketLogTimeout !== null) {
    clearTimeout(socketLogTimeout);
  }
  socketLogTimeout = setTimeout(() => {
    console.log(`Active WebSocket connections: ${sockets.size}`);
    socketLogTimeout = null;
  }, SOCKET_LOG_DEBOUNCE_MS);
};

interface StatisticsCache {
  gamesPlayed: Record<string, number>;
  totalWinnings: Record<string, number>;
  jackpotWins: number;
}

let statsCache: StatisticsCache = {
  gamesPlayed: {},
  totalWinnings: {},
  jackpotWins: 0,
};

function initializeCache() {
  console.log("Initializing statistics cache...");
  const startTime = performance.now();

  for (const lottery of lotteries) {
    const count = Number(
      db
        .prepare(`SELECT COUNT(*) as count FROM draw WHERE lottery_type = ?`)
        .get(lottery.type)?.["count"] || 0,
    );
    statsCache.gamesPlayed[lottery.type] = count;

    const totalWinnings = Number(
      db
        .prepare(
          `SELECT COALESCE(SUM(winnings), 0) as total FROM draw WHERE lottery_type = ?`,
        )
        .get(lottery.type)?.["total"] || 0,
    );
    statsCache.totalWinnings[lottery.type] = totalWinnings;
  }

  statsCache.jackpotWins = Number(
    db.prepare(`SELECT COUNT(*) as count FROM draw WHERE score = 1.0`).get()?.[
      "count"
    ] || 0,
  );

  const elapsed = performance.now() - startTime;
  console.log(`Cache initialized in ${elapsed.toFixed(0)}ms`);
}

routes.set(new URLPattern({ pathname: "/ws" }), (_, req) => {
  if (req.headers.get("upgrade") != "websocket") {
    return new Response(null, { status: 426 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);

  socket.addEventListener("open", () => {
    sockets.add(socket);
    logSocketCount();

    const statistics = getStatistics();
    socket.send(JSON.stringify(statistics));
  });

  socket.addEventListener("close", () => {
    sockets.delete(socket);
    logSocketCount();
  });

  return response;
});

routes.set(new URLPattern({ pathname: "/wins" }), () => {
  const wins =
    db.prepare(`SELECT COUNT(*) as count FROM draw WHERE score = 1.0`).get()?.[
      "count"
    ] || 0;

  const json = JSON.stringify({ wins });

  return new Response(json, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
});

routes.set(new URLPattern({ pathname: "/history/:type" }), (pattern, req) => {
  const PAGINATION_ITEMS = 24;

  const type = pattern.pathname.groups.type;
  const url = new URL(req.url);
  const params = url.searchParams;

  const lottery = lotteries.find((l) => l.type === type);

  if (!lottery || !type) {
    return new Response(null, { status: 400 });
  }

  const pageParam = Number(params.get("page"));
  const page = isNaN(pageParam) ? 0 : pageParam;

  const sortBy = params.get("sortBy") || "id";
  const sortOrder = params.get("sortOrder") || "desc";

  const validSortColumns = ["id", "lottery_type", "winnings", "timestamp"];
  const validSortOrders = ["asc", "desc"];

  if (!validSortColumns.includes(sortBy) || !validSortOrders.includes(sortOrder)) {
    return new Response(null, { status: 400 });
  }

  const total = db
    .prepare(`SELECT COUNT(*) as count FROM draw WHERE lottery_type = ?`)
    .get(type)?.["count"];

  if (!total) {
    console.error("shit the bed");
    return new Response(null, { status: 500 });
  }

  const orderByClause = `ORDER BY ${sortBy} ${sortOrder.toUpperCase()}`;
  
  let indexHint = "";
  if (sortBy === "id" && sortOrder === "desc") {
    indexHint = "INDEXED BY idx_draw_type_id";
  } else if (sortBy === "timestamp") {
    indexHint = "INDEXED BY idx_draw_type_timestamp";
  } else if (sortBy === "winnings") {
    indexHint = sortOrder === "desc" 
      ? "INDEXED BY idx_draw_type_winnings_desc"
      : "INDEXED BY idx_draw_type_winnings";
  }

  const results = db
    .prepare(
      `SELECT * FROM draw ${indexHint}
     WHERE lottery_type = ?
     ${orderByClause}
     LIMIT ? OFFSET ?;`,
    )
    .all(type, PAGINATION_ITEMS, PAGINATION_ITEMS * page);

  const parsed = z.array(drawSchema(lottery.schema)).parse(results);

  const json = JSON.stringify({
    data: parsed,
    total,
  });

  return new Response(json, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
});

function getStatistics(): Statistics {
  const gamesPlayed: Record<string, number> = {};
  let maxCount = 0;

  for (const lottery of lotteries) {
    const count = statsCache.gamesPlayed[lottery.type] || 0;
    gamesPlayed[lottery.type] = count;
    maxCount = Math.max(maxCount, count);
  }

  const timePlayedSeconds = maxCount / 2;

  const seconds = Math.floor(timePlayedSeconds % 60);
  const minutes = Math.floor(timePlayedSeconds / 60) % 60;
  const hours = Math.floor(timePlayedSeconds / (60 * 60)) % 24;
  const days = Math.floor(timePlayedSeconds / (60 * 60 * 24)) % 365;
  const years = Math.floor(timePlayedSeconds / (60 * 60 * 24 * 365));

  const moneySpent: Record<string, { amount: number; currency: string }> = {};
  const moneyWon: Record<string, { amount: number; currency: string }> = {};
  const profitLoss: Record<string, { amount: number; currency: string }> = {};

  for (const lottery of lotteries) {
    const spent = gamesPlayed[lottery.type] * lottery.price;
    const totalWinnings = statsCache.totalWinnings[lottery.type] || 0;

    moneySpent[lottery.type] = {
      amount: spent,
      currency: lottery.currency,
    };

    moneyWon[lottery.type] = {
      amount: totalWinnings,
      currency: lottery.currency,
    };

    profitLoss[lottery.type] = {
      amount: totalWinnings - spent,
      currency: lottery.currency,
    };
  }

  return {
    type: "statistics",
    wins: statsCache.jackpotWins,
    timePlayed: {
      seconds,
      minutes,
      hours,
      days,
      years,
    },
    gamesPlayed,
    moneySpent,
    moneyWon,
    profitLoss,
  };
}

if (import.meta.main) {
  initializeCache();

  everySecond(async () => {
    const results = await Promise.all(lotteries.map(saveLotteryResult));
    const statistics = getStatistics();

    const payloads = [
      ...results.map((r) => JSON.stringify(r)),
      JSON.stringify(statistics),
    ];

    sockets.forEach((socket) => {
      payloads.forEach((p) => socket.send(p));
    });
  });
  Deno.serve({ port: 3350 }, (req) => {
    for (const [pattern, handler] of routes.entries()) {
      const patternResult = pattern.exec(req.url);
      if (patternResult) {
        return handler(patternResult, req);
      }
    }

    return new Response("Not Found", { status: 404 });
  });
}
