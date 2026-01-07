import type {
  EuroJackpotResult,
  PowerballResult,
} from "@lotteryeverysecond/backend";
import Ball from "./Ball.tsx";

interface HistoryTableProps {
  history: (EuroJackpotResult | PowerballResult)[];
}

function HistoryTable({ history }: HistoryTableProps) {
  const formatCurrency = (amount: number, type: string) => {
    const currency = type === "eurojackpot" ? "EUR" : "USD";
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="history-table">
      <table>
        <thead>
          <tr>
            <th>Game #</th>
            <th>Type</th>
            <th>Draw</th>
            <th>Guess</th>
            <th>Winnings</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          {history.map((result) => (
            <tr key={`${result.lottery_type}-${result.id}`}>
              <td>{result.id}</td>
              <td className="type-cell">
                {result.lottery_type === "eurojackpot"
                  ? "EuroJackpot"
                  : "Powerball"}
              </td>
              <td className="numbers-cell">
                <div className="balls-inline">
                  {result.lottery_type === "eurojackpot" ? (
                    <>
                      {(result as EuroJackpotResult).draw.numbers.map(
                        (num, i) => (
                          <Ball key={`draw-${i}`} value={num} />
                        ),
                      )}
                      <span className="separator">|</span>
                      {(result as EuroJackpotResult).draw.stars.map(
                        (star, i) => (
                          <Ball
                            key={`star-${i}`}
                            value={star}
                            type="star"
                          />
                        ),
                      )}
                    </>
                  ) : (
                    <>
                      {(result as PowerballResult).draw.numbers.map(
                        (num, i) => (
                          <Ball key={`draw-${i}`} value={num} />
                        ),
                      )}
                      <span className="separator">|</span>
                      <Ball
                        value={(result as PowerballResult).draw.powerball}
                        type="power"
                      />
                    </>
                  )}
                </div>
              </td>
              <td className="numbers-cell">
                <div className="balls-inline">
                  {result.lottery_type === "eurojackpot" ? (
                    <>
                      {(result as EuroJackpotResult).guesses[0].numbers.map(
                        (num, i) => (
                          <Ball
                            key={`guess-${i}`}
                            value={num}
                            isMatch={(
                              result as EuroJackpotResult
                            ).draw.numbers.includes(num)}
                          />
                        ),
                      )}
                      <span className="separator">|</span>
                      {(result as EuroJackpotResult).guesses[0].stars.map(
                        (star, i) => (
                          <Ball
                            key={`star-${i}`}
                            value={star}
                            type="star"
                            isMatch={(
                              result as EuroJackpotResult
                            ).draw.stars.includes(star)}
                          />
                        ),
                      )}
                    </>
                  ) : (
                    <>
                      {(result as PowerballResult).guesses[0].numbers.map(
                        (num, i) => (
                          <Ball
                            key={`guess-${i}`}
                            value={num}
                            isMatch={(
                              result as PowerballResult
                            ).draw.numbers.includes(num)}
                          />
                        ),
                      )}
                      <span className="separator">|</span>
                      <Ball
                        value={
                          (result as PowerballResult).guesses[0].powerball
                        }
                        type="power"
                        isMatch={
                          (result as PowerballResult).draw.powerball ===
                          (result as PowerballResult).guesses[0].powerball
                        }
                      />
                    </>
                  )}
                </div>
              </td>
              <td className={`score-cell ${(result as any).winnings > 0 ? 'has-winnings' : ''}`}>
                {(result as any).winnings > 0
                  ? formatCurrency((result as any).winnings, result.lottery_type)
                  : '-'
                }
              </td>
              <td className="time-cell">
                {new Date(result.timestamp).toLocaleTimeString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {history.length === 0 && (
        <p className="waiting">Waiting for results...</p>
      )}
    </div>
  );
}

export default HistoryTable;
