import z from "zod";
import { lottery } from "./base.ts";
import { randomInt } from "./util.ts";

const powerball = lottery(
  "powerball",
  z.object({
    type: z.literal("powerball"),
    numbers: z.array(z.number()).length(5),
    powerball: z.number(),
  }),
  {
    price: 2,
    currency: "USD",
    minJackpot: 20_000_000,
    prizePool: 20_000_000,
    prizeTiers: [
      { tier: 1, fixedPrize: 20_000_000 }, // 5+PB (jackpot)
      { tier: 2, fixedPrize: 1_000_000 }, // 5+0
      { tier: 3, fixedPrize: 50_000 }, // 4+PB
      { tier: 4, fixedPrize: 100 }, // 4+0
      { tier: 5, fixedPrize: 100 }, // 3+PB
      { tier: 6, fixedPrize: 7 }, // 3+0
      { tier: 7, fixedPrize: 7 }, // 2+PB
      { tier: 8, fixedPrize: 4 }, // 1+PB
      { tier: 9, fixedPrize: 4 }, // 0+PB
    ],
    async draw() {
      const numbers = new Set<number>();
      while (numbers.size < 5) {
        numbers.add(randomInt(1, 70));
      }
      const powerball = randomInt(1, 27);

      return {
        type: "powerball",
        numbers: Array.from(numbers).sort((a, b) => a - b),
        powerball,
      };
    },
    score(guess, target) {
      const matchedNumbers = guess.numbers.filter((n) =>
        target.numbers.includes(n),
      ).length;
      const matchedPowerball = guess.powerball === target.powerball ? 1 : 0;

      const matchScore = (matchedNumbers + matchedPowerball) / 6;

      let prizeTier: number | null = null;
      let winnings = 0;

      if (matchedNumbers === 5 && matchedPowerball === 1) {
        prizeTier = 1;
        winnings = this.minJackpot;
      } else if (matchedNumbers === 5 && matchedPowerball === 0) {
        prizeTier = 2;
        winnings = 1_000_000;
      } else if (matchedNumbers === 4 && matchedPowerball === 1) {
        prizeTier = 3;
        winnings = 50_000;
      } else if (matchedNumbers === 4 && matchedPowerball === 0) {
        prizeTier = 4;
        winnings = 100;
      } else if (matchedNumbers === 3 && matchedPowerball === 1) {
        prizeTier = 5;
        winnings = 100;
      } else if (matchedNumbers === 3 && matchedPowerball === 0) {
        prizeTier = 6;
        winnings = 7;
      } else if (matchedNumbers === 2 && matchedPowerball === 1) {
        prizeTier = 7;
        winnings = 7;
      } else if (matchedNumbers === 1 && matchedPowerball === 1) {
        prizeTier = 8;
        winnings = 4;
      } else if (matchedNumbers === 0 && matchedPowerball === 1) {
        prizeTier = 9;
        winnings = 4;
      }

      return {
        matchScore,
        prizeTier,
        winnings,
      };
    },
  },
);

export { powerball };
