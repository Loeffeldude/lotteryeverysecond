import { useState, useEffect, useRef } from "react";
import type {
  EuroJackpotResult,
  PowerballResult,
} from "@lotteryeverysecond/backend";
import Ball from "./Ball.tsx";

interface EuroJackpotCardProps {
  type: "eurojackpot";
  result: EuroJackpotResult | null;
  moneySpent?: { amount: number; currency: string };
  moneyWon?: { amount: number; currency: string };
  profitLoss?: { amount: number; currency: string };
}

interface PowerballCardProps {
  type: "powerball";
  result: PowerballResult | null;
  moneySpent?: { amount: number; currency: string };
  moneyWon?: { amount: number; currency: string };
  profitLoss?: { amount: number; currency: string };
}

type LotteryCardProps = EuroJackpotCardProps | PowerballCardProps;

function LotteryCard({
  type,
  result,
  moneySpent,
  moneyWon,
  profitLoss,
}: LotteryCardProps) {
  const title = type === "eurojackpot" ? "EuroJackpot" : "Powerball";

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStoredNumbers = (key: string, defaultValue: number[]) => {
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return defaultValue;
      }
    }
    return defaultValue;
  };

  const [userNumbers, setUserNumbers] = useState<number[]>(() =>
    getStoredNumbers(
      `${type}-numbers`,
      type === "eurojackpot" ? [0, 0, 0, 0, 0] : [0, 0, 0, 0, 0],
    ),
  );
  const [userSpecial, setUserSpecial] = useState<number[]>(() =>
    getStoredNumbers(`${type}-special`, type === "eurojackpot" ? [0, 0] : [0]),
  );

  useEffect(() => {
    localStorage.setItem(`${type}-numbers`, JSON.stringify(userNumbers));
  }, [type, userNumbers]);

  useEffect(() => {
    localStorage.setItem(`${type}-special`, JSON.stringify(userSpecial));
  }, [type, userSpecial]);

  const mainMax = type === "eurojackpot" ? 50 : 69;
  const specialMax = type === "eurojackpot" ? 12 : 26;

  const hasUserGuess =
    userNumbers.some((n) => n > 0) || userSpecial.some((n) => n > 0);

  const prevMoneyWonRef = useRef(moneyWon?.amount);
  const [isMoneyWonAnimating, setIsMoneyWonAnimating] = useState(false);

  useEffect(() => {
    if (
      moneyWon?.amount !== undefined &&
      prevMoneyWonRef.current !== undefined &&
      moneyWon.amount > prevMoneyWonRef.current
    ) {
      setIsMoneyWonAnimating(true);
      const timer = setTimeout(() => setIsMoneyWonAnimating(false), 300);
      return () => clearTimeout(timer);
    }
    prevMoneyWonRef.current = moneyWon?.amount;
  }, [moneyWon?.amount]);

  if (!result) {
    return (
      <div className={`card ${type}`}>
        <h2>{title}</h2>
        <p className="waiting">Waiting for first draw...</p>
      </div>
    );
  }

  return (
    <div className={`card ${type}`}>
      <h2>{title}</h2>
      <div className="draw-info"></div>
      <div className="finance-card">
        <div className="finance-row">
          <span className="finance-label">Money Spent:</span>
          {moneySpent ? (
            <span className="finance-amount">
              {formatCurrency(moneySpent.amount, moneySpent.currency)}
            </span>
          ) : (
            <span className="skeleton skeleton-text">€0</span>
          )}
        </div>
        <div className="finance-row">
          <span className="finance-label">Money Won:</span>
          {moneyWon ? (
            <span className={`finance-amount finance-won ${isMoneyWonAnimating ? "finance-pop" : ""}`}>
              {formatCurrency(moneyWon.amount, moneyWon.currency)}
            </span>
          ) : (
            <span className="skeleton skeleton-text">€0</span>
          )}
        </div>
        <div className="finance-row">
          <span className="finance-label">Profit/Loss:</span>
          {profitLoss ? (
            <span
              className={`finance-amount ${profitLoss.amount >= 0 ? "finance-profit" : "finance-loss"}`}
            >
              {formatCurrency(profitLoss.amount, profitLoss.currency)}
            </span>
          ) : (
            <span className="skeleton skeleton-text">€0</span>
          )}
        </div>
      </div>

      <div className="result-section">
        <h3>Official Draw</h3>
        <div className="numbers">
          <div className="number-group">
            <div className="balls">
              {result.draw.numbers.map((num: number, i: number) => (
                <Ball key={`draw-${i}`} value={num} />
              ))}
            </div>
          </div>
          <div className="number-group">
            <div className="balls">
              {type === "eurojackpot" ? (
                (result as EuroJackpotResult).draw.stars.map(
                  (star: number, i: number) => (
                    <Ball key={`star-${i}`} value={star} type="star" />
                  ),
                )
              ) : (
                <Ball
                  value={(result as PowerballResult).draw.powerball}
                  type="power"
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="result-section">
        <h3>Our Pick</h3>
        <div className="numbers">
          <div className="number-group">
            <div className="balls">
              {result.guesses[0].numbers.map((num: number, i: number) => (
                <Ball
                  key={`guess-${i}`}
                  value={num}
                  isMatch={result.draw.numbers.includes(num)}
                />
              ))}
            </div>
          </div>
          <div className="number-group">
            <div className="balls">
              {type === "eurojackpot" ? (
                (result as EuroJackpotResult).guesses[0].stars.map(
                  (star: number, i: number) => (
                    <Ball
                      key={`guess-star-${i}`}
                      value={star}
                      type="star"
                      isMatch={(
                        result as EuroJackpotResult
                      ).draw.stars.includes(star)}
                    />
                  ),
                )
              ) : (
                <Ball
                  value={(result as PowerballResult).guesses[0].powerball}
                  type="power"
                  isMatch={
                    (result as PowerballResult).draw.powerball ===
                    (result as PowerballResult).guesses[0].powerball
                  }
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="result-section">
        <h3>Your Pick</h3>
        <div className="numbers">
          <div className="number-group">
            <div className="balls">
              {userNumbers.map((num: number, i: number) => (
                <Ball
                  key={`user-${i}`}
                  value={num}
                  editable={true}
                  isMatch={
                    hasUserGuess && num > 0 && result.draw.numbers.includes(num)
                  }
                  min={1}
                  max={mainMax}
                  onChange={(newValue) => {
                    const updated = [...userNumbers];
                    updated[i] = newValue;
                    setUserNumbers(updated);
                  }}
                />
              ))}
            </div>
          </div>
          <div className="number-group">
            <div className="balls">
              {type === "eurojackpot" ? (
                userSpecial.map((star: number, i: number) => (
                  <Ball
                    key={`user-star-${i}`}
                    value={star}
                    type="star"
                    editable={true}
                    isMatch={
                      hasUserGuess &&
                      star > 0 &&
                      (result as EuroJackpotResult).draw.stars.includes(star)
                    }
                    min={1}
                    max={specialMax}
                    onChange={(newValue) => {
                      const updated = [...userSpecial];
                      updated[i] = newValue;
                      setUserSpecial(updated);
                    }}
                  />
                ))
              ) : (
                <Ball
                  value={userSpecial[0]}
                  type="power"
                  editable={true}
                  isMatch={
                    hasUserGuess &&
                    userSpecial[0] > 0 &&
                    (result as PowerballResult).draw.powerball ===
                      userSpecial[0]
                  }
                  min={1}
                  max={specialMax}
                  onChange={(newValue) => {
                    setUserSpecial([newValue]);
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LotteryCard;
