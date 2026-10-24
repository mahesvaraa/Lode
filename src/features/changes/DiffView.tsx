import React, { useState } from "react";
import { Button, EmptyState, Modal, Skeleton } from "@/ui";
import { useStatusStore } from "@/store/statusStore";
import { useRepoStore } from "@/store/repoStore";
import { useI18n } from "@/lib/i18n";
import { DiffToolbar } from "./DiffToolbar";
import { InlineDiffView } from "./InlineDiffView";
import { SideBySideDiffView } from "./SideBySideDiffView";

export const DiffView: React.FC = () => {
  const { t } = useI18n();
  const currentRepo = useRepoStore((s) => s.currentRepo);
  const selectedFile = useStatusStore((s) => s.selectedFile);
  const diff = useStatusStore((s) => s.diff);
  const isLoading = useStatusStore((s) => s.isLoadingDiff);
  const diffError = useStatusStore((s) => s.diffError);
  const diffMode = useStatusStore((s) => s.diffMode);
  const setDiffMode = useStatusStore((s) => s.setDiffMode);
  const showFullDiff = useStatusStore((s) => s.showFullDiff);
  const setShowFullDiff = useStatusStore((s) => s.setShowFullDiff);
  const ignoreWhitespace = useStatusStore((s) => s.ignoreWhitespace);
  const setIgnoreWhitespace = useStatusStore((s) => s.setIgnoreWhitespace);

  const stageFile = useStatusStore((s) => s.stageFile);
  const unstageFile = useStatusStore((s) => s.unstageFile);
  const discardFile = useStatusStore((s) => s.discardFile);

  const [confirmDiscardFile, setConfirmDiscardFile] = useState(false);

  if (!selectedFile) {
    return (
      <EmptyState
        title="Файл не выбран"
        description="Выберите файл из списка изменений слева, чтобы просмотреть различия"
      />
    );
  }

  if (isLoading) {
    return (
      <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
        <Skeleton height="24px" width="40%" />
        <Skeleton height="14px" width="100%" />
        <Skeleton height="14px" width="95%" />
        <Skeleton height="14px" width="98%" />
        <Skeleton height="14px" width="80%" />
      </div>
    );
  }

  if (diffError) {
    return (
      <EmptyState
        title="Ошибка чтения diff"
        description={diffError}
      />
    );
  }

  if (!diff) {
    return (
      <EmptyState
        title="Нет различий"
        description="Файл идентичен текущему индексу или ветке"
      />
    );
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFileStageToggle = () => {
    if (!currentRepo || !selectedFile) return;
    if (selectedFile.is_staged) {
      unstageFile(currentRepo.path, selectedFile.path);
    } else {
      stageFile(currentRepo.path, selectedFile.path);
    }
  };

  const handleConfirmDiscard = () => {
    if (!currentRepo || !selectedFile) return;
    const isUntracked = diff.status === "Untracked";
    discardFile(currentRepo.path, selectedFile.path, isUntracked);
    setConfirmDiscardFile(false);
  };

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
      {/* Top Header & Actions Toolbar */}
      <DiffToolbar
        diff={diff}
        selectedFile={selectedFile}
        diffMode={diffMode}
        setDiffMode={setDiffMode}
        ignoreWhitespace={ignoreWhitespace}
        onToggleIgnoreWhitespace={() => currentRepo && setIgnoreWhitespace(currentRepo.path, !ignoreWhitespace)}
        onStageToggle={handleFileStageToggle}
        onDiscardClick={() => setConfirmDiscardFile(true)}
      />

      {/* Truncation Warning Banner */}
      {diff.is_truncated && !showFullDiff && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "8px 14px",
            backgroundColor: "var(--delbg)",
            borderBottom: "1px solid var(--line)",
            fontSize: "var(--font-size-sm)",
          }}
        >
          <span>
            Diff очень большой (более 5 000 строк или 1 МБ). Показана первая часть для сохранения быстродействия.
          </span>
          <div style={{ marginLeft: "auto" }}>
            <Button size="sm" onClick={() => setShowFullDiff(true)}>
              Показать всё
            </Button>
          </div>
        </div>
      )}

      {/* Main Diff Content */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflow: diffMode === "side-by-side" ? "hidden" : "auto",
          position: "relative",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {diff.is_binary ? (
          <div
            style={{
              padding: "40px",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <div style={{ fontSize: "32px", color: "var(--mut)" }}>💾</div>
            <h4 style={{ margin: 0 }}>{t.diff.binaryFile}</h4>
            <p style={{ margin: 0, color: "var(--mut)", fontSize: "var(--font-size-sm)" }}>
              Размер: {formatFileSize(diff.raw_size_bytes)}. {t.diff.binaryDesc}
            </p>
          </div>
        ) : diffMode === "inline" ? (
          <InlineDiffView hunks={diff.hunks} filePath={diff.new_path} isStaged={selectedFile.is_staged} />
        ) : (
          <SideBySideDiffView hunks={diff.hunks} filePath={diff.new_path} isStaged={selectedFile.is_staged} />
        )}
      </div>

      {/* Discard confirmation modal */}
      <Modal
        isOpen={confirmDiscardFile}
        onClose={() => setConfirmDiscardFile(false)}
        title="Подтверждение отката изменений"
        confirmLabel="Откатить изменения"
        isDanger={true}
        onConfirm={handleConfirmDiscard}
      >
        <p style={{ margin: 0, lineHeight: 1.5 }}>
          Вы уверены, что хотите безвозвратно откатить изменения в файле <b>{selectedFile.path}</b>?
          Несохранённые данные будут утеряны.
        </p>
      </Modal>
    </div>
  );
};
