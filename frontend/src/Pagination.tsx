import { useState, useEffect } from "react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

function useIsMobile(breakpoint = 900) {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= breakpoint);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= breakpoint);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [breakpoint]);

  return isMobile;
}

function getPageNumbers(currentPage: number, totalPages: number, maxVisible: number): (number | "ellipsis")[] {
  const pages: (number | "ellipsis")[] = [];

  if (totalPages <= maxVisible) {
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
    return pages;
  }

  const sidePages = Math.floor((maxVisible - 3) / 2);

  pages.push(1);

  if (currentPage <= sidePages + 2) {
    for (let i = 2; i <= maxVisible - 2; i++) {
      pages.push(i);
    }
    pages.push("ellipsis");
    pages.push(totalPages);
    return pages;
  }

  if (currentPage >= totalPages - sidePages - 1) {
    pages.push("ellipsis");
    for (let i = totalPages - (maxVisible - 3); i <= totalPages; i++) {
      pages.push(i);
    }
    return pages;
  }

  pages.push("ellipsis");
  for (let i = currentPage - sidePages; i <= currentPage + sidePages; i++) {
    pages.push(i);
  }
  pages.push("ellipsis");
  pages.push(totalPages);

  return pages;
}

function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationProps) {
  const isMobile = useIsMobile();
  const maxVisible = isMobile ? 5 : 7;
  const pageNumbers = getPageNumbers(currentPage, totalPages, maxVisible);

  return (
    <nav className="pagination" aria-label="Pagination">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="pagination-button pagination-nav"
        aria-label="Previous page"
      >
        {"<"}
      </button>
      <div className="pagination-pages" role="list">
        {pageNumbers.map((page, index) =>
          page === "ellipsis" ? (
            <span
              key={`ellipsis-${index}`}
              className="pagination-ellipsis"
              aria-hidden="true"
            >
              ...
            </span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`pagination-button pagination-page ${
                page === currentPage ? "pagination-page-active" : ""
              }`}
              aria-label={`Page ${page}`}
              aria-current={page === currentPage ? "page" : undefined}
            >
              {page}
            </button>
          )
        )}
      </div>
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className="pagination-button pagination-nav"
        aria-label="Next page"
      >
        {">"}
      </button>
    </nav>
  );
}

export default Pagination;
