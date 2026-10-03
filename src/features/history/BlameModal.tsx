import React, { useEffect, useState } from "react";
import { Button, Modal, Tabs } from "@/ui";
import { useRepoStore } from "@/store/repoStore";
import { getBlame, getFileHistory } from "@/api/client";
import { formatRelativeDate, shortenHash } from "@/lib/format";
import type { BlameLine } from "@/api/types/blame_line";
import type { Commit } from "@/api/types/commit";

interface BlameModalProps {
  isOpen: boolean;
  onClose: () => void;
  filePath: string;
  onSelectCommit?: (hash: string) => void;
}

export const BlameModal: React.FC<BlameModalProps> = ({
  isOpen,
  onClose,
  filePath,
  onSelectCommit,
}) => {
  const currentRepo = useRepoStore((s) => s.currentRepo);

  const [activeTab, setActiveTab] = useState<"blame" | "history">("blame");
  const [blameLines, setBlameLines] = useState<BlameLine[]>([]);
  const [historyCommits, setHistoryCommits] = useState<Commit[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !currentRepo || !filePath) return;

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    const loadData = async () => {
      try {
        if (activeTab === "blame") {
          const lines = await getBlame(currentRepo.path, filePath);
          if (isMounted) setBlameLines(lines);
        } else {
          const commits = await getFileHistory(currentRepo.path, filePath, 100);
          if (isMounted) setHistoryCommits(commits);
        }
      } catch (err: unknown) {
        const errObj = err as { message?: string };
        if (isMounted) {
          setError(errObj.message || "Ошибка загрузки данных файла");
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [isOpen, currentRepo, filePath, activeTab]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Инспекция файла: ${filePath}`}
      confirmLabel="Закрыть"
      onConfirm={onClose}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          width: "820px",
          maxWidth: "90vw",
          height: "560px",
          maxHeight: "80vh",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Tabs
            items={[
              { id: "blame", label: "Blame (построчная история)" },
              { id: "history", label: "История файла (--follow)" },
            ]}
            activeId={activeTab}
            onChange={(id) => setActiveTab(id as "blame" | "history")}
          />
        </div>

        {error && (
          <div
            style={{
              padding: "8px 12px",
              backgroundColor: "rgba(255, 107, 102, 0.15)",
              color: "var(--del)",
              fontSize: "var(--font-size-xs)",
              borderRadius: "var(--radius-base)",
            }}
          >
            {error}
          </div>
        )}

        <div
          style={{
            flex: 1,
            overflow: "auto",
            backgroundColor: "var(--bg)",
            borderRadius: "var(--radius-base)",
            border: "1px solid var(--line)",
          }}
        >
          {isLoading ? (
            <div style={{ padding: "32px", textAlign: "center", color: "var(--mut)", fontSize: "12px" }}>
              Загрузка...
            </div>
          ) : activeTab === "blame" ? (
            blameLines.length === 0 ? (
              <div style={{ padding: "32px", textAlign: "center", color: "var(--mut)", fontSize: "12px" }}>
                Нет данных blame
              </div>
            ) : (
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontFamily: "var(--font-mono)",
                  fontSize: "11px",
                  lineHeight: 1.5,
                }}
              >
                <tbody>
                  {blameLines.map((line) => (
                    <tr
                      key={line.line_number}
                      data-ctx="blame-line"
                      data-id={line.commit_hash}
                      data-line-no={line.line_number}
                      data-path={filePath}
                      style={{
                        borderBottom: "1px solid rgba(255, 255, 255, 0.03)",
                      }}
                    >
                      {/* Line Number */}
                      <td
                        style={{
                          width: "44px",
                          padding: "2px 8px",
                          textAlign: "right",
                          color: "var(--mut)",
                          userSelect: "none",
                          borderRight: "1px solid var(--line)",
                          backgroundColor: "var(--bg2)",
                        }}
                      >
                        {line.line_number}
                      </td>

                      {/* Commit Hash */}
                      <td
                        style={{
                          width: "70px",
                          padding: "2px 6px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <span
                          style={{
                            color: "var(--acc)",
                            cursor: onSelectCommit ? "pointer" : "default",
                            textDecoration: onSelectCommit ? "underline" : "none",
                          }}
                          onClick={() => {
                            if (onSelectCommit) {
                              onSelectCommit(line.commit_hash);
                              onClose();
                            }
                          }}
                          title={`Коммит: ${line.commit_hash}\n${line.summary}`}
                        >
                          {shortenHash(line.commit_hash)}
                        </span>
                      </td>

                      {/* Author */}
                      <td
                        style={{
                          width: "110px",
                          padding: "2px 6px",
                          color: "var(--tx)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          maxWidth: "110px",
                        }}
                        title={line.author_name}
                      >
                        {line.author_name}
                      </td>

                      {/* Date */}
                      <td
                        style={{
                          width: "90px",
                          padding: "2px 6px",
                          color: "var(--mut)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatRelativeDate(line.author_time)}
                      </td>

                      {/* Code Content */}
                      <td
                        style={{
                          padding: "2px 8px",
                          color: "var(--tx)",
                          whiteSpace: "pre",
                        }}
                      >
                        {line.content}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          ) : historyCommits.length === 0 ? (
            <div style={{ padding: "32px", textAlign: "center", color: "var(--mut)", fontSize: "12px" }}>
              История файла не найдена
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {historyCommits.map((c) => (
                <div
                  key={c.hash}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "8px 12px",
                    borderBottom: "1px solid var(--line)",
                  }}
                >
                  <span
                    className="mono"
                    style={{
                      fontSize: "11px",
                      color: "var(--acc)",
                      cursor: onSelectCommit ? "pointer" : "default",
                      textDecoration: onSelectCommit ? "underline" : "none",
                    }}
                    onClick={() => {
                      if (onSelectCommit) {
                        onSelectCommit(c.hash);
                        onClose();
                      }
                    }}
                  >
                    {shortenHash(c.hash)}
                  </span>
                  <span
                    style={{
                      flex: 1,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      fontSize: "12px",
                      color: "var(--tx)",
                    }}
                    title={c.subject}
                  >
                    {c.subject}
                  </span>
                  <span style={{ fontSize: "11px", color: "var(--mut)" }}>
                    {c.author_name}
                  </span>
                  <span style={{ fontSize: "11px", color: "var(--mut)" }}>
                    {formatRelativeDate(c.author_date)}
                  </span>
                  {onSelectCommit && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        onSelectCommit(c.hash);
                        onClose();
                      }}
                      style={{ padding: "2px 6px", fontSize: "11px" }}
                    >
                      Показать
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
