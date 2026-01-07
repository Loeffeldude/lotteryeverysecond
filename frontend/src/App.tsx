import { useState, useEffect, useCallback } from "react";
import type {
  EuroJackpotResult,
  PowerballResult,
  Statistics,
} from "@lotteryeverysecond/backend";
import LotteryCard from "./LotteryCard.tsx";
import HistoryTable from "./HistoryTable.tsx";
import Pagination from "./Pagination.tsx";
import AboutSection from "./AboutSection.tsx";
import { useWebSocket } from "./useWebSocket.ts";
import "./App.css";

const fetchHistory = async (type: string, page: number) => {
  const response = await fetch(`/history/${type}?page=${page}`);
  const data = await response.json();
  return { data: data.data, total: data.total };
};

function App() {
  const [euroJackpot, setEuroJackpot] = useState<EuroJackpotResult | null>(
    null,
  );
  const [powerball, setPowerball] = useState<PowerballResult | null>(null);
  const [history, setHistory] = useState<
    (EuroJackpotResult | PowerballResult)[]
  >([]);
  const [isPaused, setIsPaused] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [statistics, setStatistics] = useState<Statistics | null>(null);

  const itemsPerPage = 24;

  const params = new URLSearchParams(window.location.search);
  const pageParam = params.get("page");
  const [currentPage, setCurrentPage] = useState(
    pageParam ? parseInt(pageParam) : 1,
  );

  const refetchAll = useCallback(async (page: number = 0) => {
    const [euroResult, powerResult] = await Promise.all([
      fetchHistory("eurojackpot", page),
      fetchHistory("powerball", page),
    ]);

    if (page === 0) {
      if (euroResult.data.length > 0) {
        setEuroJackpot(euroResult.data[0]);
      }
      if (powerResult.data.length > 0) {
        setPowerball(powerResult.data[0]);
      }
    }

    const combined = [...euroResult.data, ...powerResult.data]
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      )
      .slice(0, itemsPerPage);

    setHistory(combined);
    setTotalCount(Math.max(euroResult.total, powerResult.total));
  }, []);

  const handlePageChange = async (page: number) => {
    setCurrentPage(page);
    const url = new URL(window.location.href);
    if (page === 1) {
      url.searchParams.delete("page");
    } else {
      url.searchParams.set("page", page.toString());
    }
    window.history.replaceState({}, "", url);
    await refetchAll(page - 1);
  };

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const ws = useWebSocket(`${protocol}//${window.location.host}/ws`);

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      const data = JSON.parse(event.data);

      if (data.type === "statistics") {
        setStatistics(data as Statistics);
        return;
      }

      if (data.lottery_type === "eurojackpot") {
        setEuroJackpot(data as EuroJackpotResult);
        if (!isPaused && currentPage === 1) {
          setHistory((prev) =>
            [data as EuroJackpotResult, ...prev].slice(0, itemsPerPage),
          );
        }
      } else if (data.lottery_type === "powerball") {
        setPowerball(data as PowerballResult);
        if (!isPaused && currentPage === 1) {
          setHistory((prev) =>
            [data as PowerballResult, ...prev].slice(0, itemsPerPage),
          );
        }
      }
    },
    [isPaused, currentPage],
  );

  const handleError = useCallback((error: Event) => {
    console.error("WebSocket error:", error);
  }, []);

  useEffect(() => {
    if (!ws) {
      return;
    }

    ws.addEventListener("message", handleMessage);
    ws.addEventListener("error", handleError);

    return () => {
      ws.removeEventListener("message", handleMessage);
      ws.removeEventListener("error", handleError);
    };
  }, [ws, handleMessage, handleError]);

  const handlePauseToggle = async () => {
    if (isPaused && currentPage === 1) {
      await refetchAll(0);
    }
    setIsPaused(!isPaused);
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      await refetchAll(0);
    };

    fetchInitialData();
  }, [refetchAll]);

  return (
    <div className="container">
      <header>
        <h1>Lottery Every Second</h1>
        <p className="tagline">
          Why wait a week for disappointment when you can have it every second?
        </p>
        <p className="description">
          We play both Powerball and EuroJackpot lotteries automatically, every
          single second. Watch the dreams come true (or not) in real-time.
        </p>
        {statistics && (
          <>
            <div className="wins-counter">
              <span className="wins-label">Total Jackpot Wins:</span>
              <span
                className={`wins-number${statistics.wins ? " wins-number--win" : ""}`}
              >
                {statistics.wins}
              </span>
            </div>
            <div className="time-played">
              <span className="wins-label">Total Time Played:</span>
              <span className="wins-label">
                {statistics.timePlayed.years > 0 &&
                  `${statistics.timePlayed.years} Years `}
                {statistics.timePlayed.days > 0 &&
                  `${statistics.timePlayed.days} Days `}
                {statistics.timePlayed.hours.toString().padStart(2, "0")}H:
                {statistics.timePlayed.minutes.toString().padStart(2, "0")}M:
                {statistics.timePlayed.seconds.toString().padStart(2, "0")}S
              </span>
            </div>
          </>
        )}
      </header>

      <div className="cards">
        <LotteryCard
          type="eurojackpot"
          result={euroJackpot}
          moneySpent={statistics?.moneySpent.eurojackpot}
          moneyWon={statistics?.moneyWon.eurojackpot}
          profitLoss={statistics?.profitLoss.eurojackpot}
        />
        <LotteryCard
          type="powerball"
          result={powerball}
          moneySpent={statistics?.moneySpent.powerball}
          moneyWon={statistics?.moneyWon.powerball}
          profitLoss={statistics?.profitLoss.powerball}
        />
      </div>

      <AboutSection />

      <div className="history-section">
        <div className="history-header">
          <h2>Recent History</h2>
          <button className="pause-button" onClick={handlePauseToggle}>
            {isPaused ? "Resume" : "Pause"}
          </button>
        </div>
        <HistoryTable history={history} />
        <Pagination
          currentPage={currentPage}
          totalPages={Math.ceil(totalCount / itemsPerPage)}
          onPageChange={handlePageChange}
        />
      </div>

      <footer className="footer">
        <a href="/impressum.html">Impressum</a>
        <span className="footer-separator"> | </span>
        <a href="/datenschutz.html">Datenschutzerklärung</a>
        <span className="footer-separator"> | </span>
        <a
          href="https://github.com/Loeffeldude/lotteryeverysecond"
          target="_blank"
          rel="noopener noreferrer"
          className="github-link"
        >
          <img src="/github-mark-white.svg" alt="GitHub" />
          <span> Source</span>
        </a>
      </footer>
    </div>
  );
}

export default App;
