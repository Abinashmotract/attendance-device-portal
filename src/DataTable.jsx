import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./ui.jsx";

export default function DataTable({ columns, rows, rowKey, empty = "Nothing to show.", pageSize = 10 }) {
  const [page, setPage] = useState(1);
  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    setPage(1);
  }, [total, pageSize]);

  const current = Math.min(page, pages);
  const start = (current - 1) * pageSize;
  const visible = rows.slice(start, start + pageSize);

  return (
    <section className="panel scroll">
      <table>
        <thead>
          <tr>
            {columns.map((column) => <th key={column.key}>{column.header}</th>)}
          </tr>
        </thead>
        <tbody>
          {visible.length === 0 ? (
            <tr><td colSpan={columns.length}>{empty}</td></tr>
          ) : visible.map((row) => (
            <tr key={rowKey(row)}>
              {columns.map((column) => <td key={column.key}>{column.render ? column.render(row) : row[column.key]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="pager">
        <span className="meta">{total === 0 ? "0 rows" : `${start + 1}–${Math.min(start + pageSize, total)} of ${total}`}</span>
        <div className="pages">
          <Button icon={ChevronLeft} disabled={current <= 1} onClick={() => setPage(current - 1)} aria-label="Previous page" />
          {Array.from({ length: Math.min(5, pages) }, (_, index) => {
            const size = Math.min(5, pages);
            const startPage = Math.max(1, Math.min(current - 2, pages - size + 1));
            return startPage + index;
          }).map((number) => (
            <Button key={number} className={number === current ? "active" : ""} onClick={() => setPage(number)}>
              {number}
            </Button>
          ))}
          <Button icon={ChevronRight} disabled={current >= pages} onClick={() => setPage(current + 1)} aria-label="Next page" />
        </div>
      </div>
    </section>
  );
}
