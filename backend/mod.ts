import { euroJackpot } from "./lottery/eurojackpot.ts";
import { powerball } from "./lottery/poweball.ts";
import { drawSchema } from "./lottery/db.ts";
import z from "zod";

export { euroJackpot, powerball };

export const euroJackpotDrawSchema = drawSchema(euroJackpot.schema);
export const powerballDrawSchema = drawSchema(powerball.schema);

export const statisticsSchema = z.object({
  type: z.literal("statistics"),
  wins: z.number(),
  timePlayed: z.object({
    seconds: z.number(),
    minutes: z.number(),
    hours: z.number(),
    days: z.number(),
    years: z.number(),
  }),
  gamesPlayed: z.record(z.string(), z.number()),
  moneySpent: z.record(z.string(), z.object({
    amount: z.number(),
    currency: z.string(),
  })),
  moneyWon: z.record(z.string(), z.object({
    amount: z.number(),
    currency: z.string(),
  })),
  profitLoss: z.record(z.string(), z.object({
    amount: z.number(),
    currency: z.string(),
  })),
});

export type EuroJackpotDraw = z.infer<typeof euroJackpot.schema>;
export type PowerballDraw = z.infer<typeof powerball.schema>;
export type EuroJackpotResult = z.infer<typeof euroJackpotDrawSchema>;
export type PowerballResult = z.infer<typeof powerballDrawSchema>;
export type Statistics = z.infer<typeof statisticsSchema>;
