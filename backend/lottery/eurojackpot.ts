import z from "zod";
import { lottery } from "./base.ts";
import { randomInt } from "./util.ts";

const euroJackpot = lottery(
  "eurojackpot",
  z.object({
    type: z.literal("eurojackpot"),
    numbers: z.array(z.number()).length(5),
    stars: z.array(z.number()).length(2),
  }),
  {
    price: 2,
    currency: "EUR",
    minJackpot: 10_000_000,
    prizePool: 10_000_000,
    prizeTiers: [
      { tier: 1, shareOfPool: 0.36 }, // 5+2
      { tier: 2, shareOfPool: 0.086 }, // 5+1
      { tier: 3, shareOfPool: 0.0485 }, // 5+0
      { tier: 4, shareOfPool: 0.008 }, // 4+2
      { tier: 5, shareOfPool: 0.01 }, // 4+1
      { tier: 6, shareOfPool: 0.011 }, // 3+2
      { tier: 7, shareOfPool: 0.008 }, // 4+0
      { tier: 8, shareOfPool: 0.0255 }, // 2+2
      { tier: 9, shareOfPool: 0.0285 }, // 3+1
      { tier: 10, shareOfPool: 0.054 }, // 3+0
      { tier: 11, shareOfPool: 0.0675 }, // 1+2
      { tier: 12, shareOfPool: 0.203 }, // 2+1
    ],
    async draw() {
      const numbers = new Set<number>();
      while (numbers.size < 5) {
        numbers.add(randomInt(1, 51));
      }
      const stars = new Set<number>();
      while (stars.size < 2) {
        stars.add(randomInt(1, 13));
      }
      return {
        type: "eurojackpot",
        numbers: Array.from(numbers).sort((a, b) => a - b),
        stars: Array.from(stars).sort((a, b) => a - b),
      };
    },
    score(guess, target) {
      const matchedNumbers = guess.numbers.filter((n) =>
        target.numbers.includes(n),
      ).length;
      const matchedStars = guess.stars.filter((s) =>
        target.stars.includes(s),
      ).length;

      const matchScore = (matchedNumbers + matchedStars) / 7;

      let prizeTier: number | null = null;
      let winnings = 0;

      // Using average estimated prizes based on typical odds and pool distribution
      if (matchedNumbers === 5 && matchedStars === 2) {
        prizeTier = 1;
        winnings = this.minJackpot; // €10M jackpot
      } else if (matchedNumbers === 5 && matchedStars === 1) {
        prizeTier = 2;
        winnings = 500_000; // ~€500k
      } else if (matchedNumbers === 5 && matchedStars === 0) {
        prizeTier = 3;
        winnings = 100_000; // ~€100k
      } else if (matchedNumbers === 4 && matchedStars === 2) {
        prizeTier = 4;
        winnings = 5_000; // ~€5k
      } else if (matchedNumbers === 4 && matchedStars === 1) {
        prizeTier = 5;
        winnings = 200; // ~€200
      } else if (matchedNumbers === 3 && matchedStars === 2) {
        prizeTier = 6;
        winnings = 100; // ~€100
      } else if (matchedNumbers === 4 && matchedStars === 0) {
        prizeTier = 7;
        winnings = 60; // ~€60
      } else if (matchedNumbers === 2 && matchedStars === 2) {
        prizeTier = 8;
        winnings = 20; // ~€20
      } else if (matchedNumbers === 3 && matchedStars === 1) {
        prizeTier = 9;
        winnings = 15; // ~€15
      } else if (matchedNumbers === 3 && matchedStars === 0) {
        prizeTier = 10;
        winnings = 12; // ~€12
      } else if (matchedNumbers === 1 && matchedStars === 2) {
        prizeTier = 11;
        winnings = 8; // ~€8
      } else if (matchedNumbers === 2 && matchedStars === 1) {
        prizeTier = 12;
        winnings = 6; // ~€6
      }

      return {
        matchScore,
        prizeTier,
        winnings,
      };
    },
  },
);

export { euroJackpot };
