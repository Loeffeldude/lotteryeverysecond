import { useState, useEffect, useCallback, useMemo } from "react";
import type {
  EuroJackpotResult,
  PowerballResult,
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
  const [totalWins, setTotalWins] = useState(0);

  const timePlayed = useMemo(() => {
    if (!powerball || !euroJackpot) {
      return "";
    }

    const time = Math.max(euroJackpot.id, powerball.id) / 2;

    const seconds = Math.floor(time % 60);
    const minutes = Math.floor(time / 60) % 60;
    const hours = Math.floor(time / (60 * 60)) % 24;
    const days = Math.floor(time / (60 * 60 * 24)) % 365;
    const years = Math.floor(time / (60 * 60 * 24 * 365));
    const format = (n: number) => n.toFixed(0).padStart(2, "0");

    let result = `${format(hours)}H:${format(minutes)}M:${format(seconds)}S`;

    if (days) result = `${days} Days ` + result;
    if (years) result = `${years} Years ` + result;

    return result;
  }, [euroJackpot, powerball]);

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

      if (data.score === 1) {
        setTotalWins((prev) => prev + 1);
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

      const response = await fetch("/wins");
      const data = await response.json();
      setTotalWins(data.wins);
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
        <div className="wins-counter">
          <span className="wins-label">Total Jackpot Wins:</span>
          <span
            className={`wins-number${totalWins ? " wins-number--win" : ""}`}
          >
            {totalWins}
          </span>
        </div>
        <div className="time-played">
          <span className="wins-label">Total Time Played:</span>
          <span className="wins-label">{timePlayed}</span>
        </div>
      </header>

      <div className="cards">
        <LotteryCard type="eurojackpot" result={euroJackpot} />
        <LotteryCard type="powerball" result={powerball} />
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
