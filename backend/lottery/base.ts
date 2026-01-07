import { z, ZodObject } from "zod";

interface PrizeTier {
  tier: number;
  fixedPrize?: number;
  shareOfPool?: number;
}

interface ScoreResult {
  matchScore: number;
  prizeTier: number | null;
  winnings: number;
}

interface Lottery<T> {
  draw(): Promise<T>;
  score(guess: T, target: T): ScoreResult;
  price: number;
  currency: string;
  minJackpot: number;
  prizePool: number;
  prizeTiers: PrizeTier[];
}

// this is overengineered to shit
function lottery<
  T extends z.ZodRawShape & { type: z.ZodType<TTkey> },
  TTkey extends string,
>(type: TTkey, data: ZodObject<T>, generator: Lottery<z.infer<ZodObject<T>>>) {
  return {
    ...generator,
    type: type,
    load(v: unknown) {
      return data.parse(v);
    },
    schema: data,
  };
}

export { lottery };
