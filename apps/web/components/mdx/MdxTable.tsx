"use client";

import {
  Children,
  isValidElement,
  useMemo,
  useState,
  type ComponentPropsWithoutRef,
  type ReactElement,
  type ReactNode,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import styles from "./MdxTable.module.css";

type SortState = { column: number; direction: "asc" | "desc" } | null;

// Recursively flatten a React node to plain text for sort comparison.
function nodeToText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeToText).join("");
  if (isValidElement(node)) {
    return nodeToText((node.props as { children?: ReactNode }).children);
  }
  return "";
}

function childrenOf(node: ReactNode): ReactNode[] {
  if (isValidElement(node)) {
    return Children.toArray((node.props as { children?: ReactNode }).children);
  }
  return [];
}

function findByType(nodes: ReactNode[], type: string): ReactElement | undefined {
  return nodes.find(
    (node): node is ReactElement => isValidElement(node) && node.type === type,
  );
}

function findAllByType(nodes: ReactNode[], type: string): ReactElement[] {
  return nodes.filter(
    (node): node is ReactElement => isValidElement(node) && node.type === type,
  );
}

function compareText(a: string, b: string): number {
  const numA = parseFloat(a.replace(/[^0-9.-]/g, ""));
  const numB = parseFloat(b.replace(/[^0-9.-]/g, ""));
  const bothNumeric = !Number.isNaN(numA) && !Number.isNaN(numB) && /\d/.test(a) && /\d/.test(b);
  if (bothNumeric) return numA - numB;
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

// Client override for raw markdown tables: sortable columns, sticky header row
// within a horizontally-scrollable container, and a collapse toggle.
export function MdxTable({ children }: ComponentPropsWithoutRef<"table">) {
  const [sort, setSort] = useState<SortState>(null);
  const [collapsed, setCollapsed] = useState(false);
  const reducedMotion = useReducedMotion();

  const { headers, rows } = useMemo(() => {
    const top = Children.toArray(children);
    const thead = findByType(top, "thead");
    const tbody = findByType(top, "tbody");

    const headerRow = thead ? findByType(childrenOf(thead), "tr") : undefined;
    const headerCells = headerRow ? findAllByType(childrenOf(headerRow), "th") : [];

    const bodyRows = tbody ? findAllByType(childrenOf(tbody), "tr") : [];
    const bodyCells = bodyRows.map((row) => findAllByType(childrenOf(row), "td"));

    return {
      headers: headerCells.map((cell) => (cell.props as { children?: ReactNode }).children),
      rows: bodyCells.map((cells) => cells.map((cell) => (cell.props as { children?: ReactNode }).children)),
    };
  }, [children]);

  const sortedRows = useMemo(() => {
    if (!sort) return rows;
    const indexed = rows.map((row, index) => ({ row, index }));
    indexed.sort((a, b) => {
      const result = compareText(nodeToText(a.row[sort.column]), nodeToText(b.row[sort.column]));
      return sort.direction === "asc" ? result : -result;
    });
    return indexed.map((entry) => entry.row);
  }, [rows, sort]);

  function toggleSort(column: number) {
    setSort((current) => {
      if (!current || current.column !== column) return { column, direction: "asc" };
      if (current.direction === "asc") return { column, direction: "desc" };
      return null;
    });
  }

  if (headers.length === 0) {
    return <table>{children}</table>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.bar}>
        <span className={styles.count}>{rows.length} rows</span>
        <button
          type="button"
          className={styles.collapse}
          aria-expanded={!collapsed}
          onClick={() => setCollapsed((value) => !value)}
        >
          {collapsed ? "Expand table" : "Collapse table"}
        </button>
      </div>
      <AnimatePresence initial={false}>
        {collapsed ? null : (
          <motion.div
            key="table"
            className={styles.collapsible}
            initial={reducedMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reducedMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className={styles.scroll}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    {headers.map((header, index) => {
                      const active = sort?.column === index;
                      const Icon = active ? (sort!.direction === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
                      return (
                        <th key={index} scope="col" aria-sort={active ? (sort!.direction === "asc" ? "ascending" : "descending") : "none"}>
                          <button type="button" className={styles.sortButton} onClick={() => toggleSort(index)}>
                            <span>{header}</span>
                            <span className={`${styles.indicator} ${active ? styles.indicatorActive : ""}`} aria-hidden="true">
                              <Icon size={13} strokeWidth={2} />
                            </span>
                          </button>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {sortedRows.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
