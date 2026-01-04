import z from "zod";
import { lottery } from "./lottery/base.ts";
import { db, drawSchema } from "./lottery/db.ts";
import { euroJackpot } from "./lottery/eurojackpot.ts";
import { powerball } from "./lottery/poweball.ts";

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

  const result = db
    .prepare(
      `INSERT INTO draw (lottery_type, draw, guesses, score)
    VALUES (?, ?, ?, ?)
    RETURNING *;`,
    )
    .get(
      lottery.type,
      JSON.stringify(draw),
      JSON.stringify([guess]),
      lottery.score(draw, guess),
    );

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

routes.set(new URLPattern({ pathname: "/ws" }), (_, req) => {
  if (req.headers.get("upgrade") != "websocket") {
    return new Response(null, { status: 426 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);

  socket.addEventListener("open", () => {
    sockets.add(socket);
  });

  socket.addEventListener("close", () => {
    sockets.delete(socket);
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

  const total = db
    .prepare(`SELECT COUNT(*) as count FROM draw WHERE lottery_type = ?`)
    .get(type)?.["count"];

  if (!total) {
    console.error("shit the bed");
    return new Response(null, { status: 500 });
  }

  const results = db
    .prepare(
      `SELECT * FROM draw 
     WHERE lottery_type = ?
     ORDER BY id DESC
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

if (import.meta.main) {
  everySecond(async () => {
    const results = await Promise.all(lotteries.map(saveLotteryResult));
    const payloads = results.map((r) => JSON.stringify(r));

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
