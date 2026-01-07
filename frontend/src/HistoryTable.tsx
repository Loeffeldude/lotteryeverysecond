import type {
  EuroJackpotResult,
  PowerballResult,
} from "@lotteryeverysecond/backend";
import Ball from "./Ball.tsx";

interface HistoryTableProps {
  history: (EuroJackpotResult | PowerballResult)[];
  sortBy: string;
  sortOrder: string;
  onSort: (column: string) => void;
}

function HistoryTable({ history, sortBy, sortOrder, onSort }: HistoryTableProps) {
  const formatCurrency = (amount: number, type: string) => {
    const currency = type === "eurojackpot" ? "EUR" : "USD";
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const renderSortIndicator = (column: string) => {
    if (sortBy !== column) return null;
    return sortOrder === "desc" ? " ▼" : " ▲";
  };

  return (
    <div className="history-table">
      <table>
        <thead>
          <tr>
            <th className="sortable" onClick={() => onSort("id")}>
              Game #{renderSortIndicator("id")}
            </th>
            <th>Type</th>
            <th>Draw</th>
            <th>Guess</th>
            <th className="sortable" onClick={() => onSort("winnings")}>
              Winnings{renderSortIndicator("winnings")}
            </th>
            <th className="sortable" onClick={() => onSort("timestamp")}>
              Time{renderSortIndicator("timestamp")}
            </th>
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
                {new Intl.DateTimeFormat(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                }).format(new Date(result.timestamp))}
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
