import React, { useEffect, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { EmptyState, Input, Skeleton, Splitter } from "@/ui";
import { CommitRow } from "./CommitRow";
import { CommitDetailsPanel } from "./CommitDetailsPanel";
import { useHistoryStore } from "@/store/historyStore";
import { useRepoStore } from "@/store/repoStore";
import { useStatusStore } from "@/store/statusStore";

export const HistoryView: React.FC = () => {
  const currentRepo = useRepoStore((s) => s.currentRepo);
  const status = useStatusStore((s) => s.status);

  const commits = useHistoryStore((s) => s.commits);
  const graphNodes = useHistoryStore((s) => s.graphNodes);
  const hasMore = useHistoryStore((s) => s.hasMore);
  const isLoading = useHistoryStore((s) => s.isLoading);
  const error = useHistoryStore((s) => s.error);

  const selectedCommitHash = useHistoryStore((s) => s.selectedCommitHash);
  const selectCommit = useHistoryStore((s) => s.selectCommit);

  const loadInitial = useHistoryStore((s) => s.loadInitial);
  const loadMore = useHistoryStore((s) => s.loadMore);
  const setSearchQuery = useHistoryStore((s) => s.setSearchQuery);
  const setSelectedBranch = useHistoryStore((s) => s.setSelectedBranch);
  const selectedBranch = useHistoryStore((s) => s.selectedBranch);

  const [detailsPanelWidth, setDetailsPanelWidth] = useState(440);
  const [searchInput, setSearchInput] = useState("");
  const parentRef = useRef<HTMLDivElement>(null);

  // Initial load
  useEffect(() => {
    if (currentRepo) {
      loadInitial(currentRepo.path);
    }
  }, [currentRepo, loadInitial]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentRepo) {
        setSearchQuery(currentRepo.path, searchInput);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, currentRepo, setSearchQuery]);

  // TanStack Virtualizer for 34px fixed rows
  const rowVirtualizer = useVirtualizer({
    count: commits.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 34,
    overscan: 25,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();

  // Infinite scroll trigger when reaching near the bottom
  useEffect(() => {
    if (!virtualItems.length || !hasMore || isLoading || !currentRepo) return;
    const lastItem = virtualItems[virtualItems.length - 1];
    if (lastItem.index >= commits.length - 20) {
      loadMore(currentRepo.path);
    }
  }, [virtualItems, commits.length, hasMore, isLoading, currentRepo, loadMore]);

  const handleResize = (delta: number) => {
    setDetailsPanelWidth((w) => Math.min(Math.max(280, w - delta), 800));
  };

  const currentHeadBranch = status?.branch.head || "main";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        overflow: "hidden",
        backgroundColor: "var(--bg)",
      }}
    >
      {/* History Top Toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "6px 14px",
          borderBottom: "1px solid var(--line)",
          backgroundColor: "var(--bg2)",
          flexShrink: 0,
        }}
      >
        {/* Branch Filter */}
        <select
          value={selectedBranch}
          onChange={(e) => {
            if (currentRepo) setSelectedBranch(currentRepo.path, e.target.value);
          }}
          style={{
            height: "26px",
            backgroundColor: "var(--bg3)",
            color: "var(--tx)",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius-base)",
            padding: "0 8px",
            fontSize: "var(--font-size-sm)",
            outline: "none",
            cursor: "pointer",
          }}
        >
          <option value="ALL">Все ветки (--all)</option>
          <option value="HEAD">Текущая ветка (HEAD: {currentHeadBranch})</option>
        </select>

        {/* Search input */}
        <div style={{ width: "240px" }}>
          <Input
            placeholder="Поиск по сообщению/автору/хешу…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            style={{ height: "26px", fontSize: "var(--font-size-sm)" }}
          />
        </div>

        {/* Stats */}
        <span style={{ fontSize: "var(--font-size-xs)", color: "var(--mut)", marginLeft: "auto" }}>
          {commits.length} коммитов{hasMore ? "+" : ""}
          {isLoading && " (загрузка…)"}
        </span>
      </div>

      {/* Main View Area */}
      <div style={{ flex: 1, display: "flex", minHeight: 0, overflow: "hidden" }}>
        {/* Left: Virtualized Commit List */}
        <div
          ref={parentRef}
          data-empty-history="true"
          style={{
            flex: 1,
            height: "100%",
            overflow: "auto",
            position: "relative",
            outline: "none",
          }}
        >
          {error ? (
            <EmptyState title="Ошибка истории" description={error} />
          ) : commits.length === 0 && !isLoading ? (
            <EmptyState
              title="Нет коммитов"
              description="В выбранной ветке или по заданному поисковому запросу коммитов не найдено"
            />
          ) : (
            <div
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                width: "100%",
                position: "relative",
              }}
            >
              {virtualItems.map((virtualRow) => {
                const commit = commits[virtualRow.index];
                const node = graphNodes[virtualRow.index];
                if (!commit || !node) return null;

                const isSelected = selectedCommitHash === commit.hash;

                return (
                  <div
                    key={commit.hash}
                    data-ctx="commit"
                    data-id={commit.hash}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    <CommitRow
                      commit={commit}
                      node={node}
                      isSelected={isSelected}
                      onSelect={() => currentRepo && selectCommit(currentRepo.path, commit.hash)}
                    />
                  </div>
                );
              })}
            </div>
          )}

          {isLoading && commits.length === 0 && (
            <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
              <Skeleton height="34px" width="100%" />
              <Skeleton height="34px" width="100%" />
              <Skeleton height="34px" width="100%" />
              <Skeleton height="34px" width="100%" />
            </div>
          )}
        </div>

        {/* Resizable Splitter */}
        <Splitter direction="horizontal" onResize={handleResize} />

        {/* Right: Commit Details Panel */}
        <div
          style={{
            width: `${detailsPanelWidth}px`,
            height: "100%",
            flexShrink: 0,
            borderLeft: "1px solid var(--line)",
            backgroundColor: "var(--bg2)",
            overflow: "hidden",
          }}
        >
          <CommitDetailsPanel />
        </div>
      </div>
    </div>
  );
};
