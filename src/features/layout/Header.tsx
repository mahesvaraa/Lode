import React, { useState } from "react";
import { Button, Checkbox, IconButton, Chip, Modal } from "@/ui";
import { t } from "@/lib/i18n";
import { useRepoStore } from "@/store/repoStore";
import { useUiStore } from "@/store/uiStore";
import { useToastStore } from "@/store/toastStore";
import { useStatusStore } from "@/store/statusStore";
import { useRemoteStore } from "@/store/remoteStore";
import { useRefsStore } from "@/store/refsStore";
import { useHistoryStore } from "@/store/historyStore";
import { CommandPalette } from "@/features/palette/CommandPalette";
import { SettingsModal } from "@/features/settings/SettingsModal";

export const Header: React.FC = () => {
  const currentRepo = useRepoStore((s) => s.currentRepo);
  const closeRepo = useRepoStore((s) => s.closeRepo);

  const toggleTheme = useUiStore((s) => s.toggleTheme);
  const theme = useUiStore((s) => s.theme);
  const isCommandPaletteOpen = useUiStore((s) => s.isCommandPaletteOpen);
  const setCommandPaletteOpen = useUiStore((s) => s.setCommandPaletteOpen);
  const isSettingsOpen = useUiStore((s) => s.isSettingsOpen);
  const setSettingsOpen = useUiStore((s) => s.setSettingsOpen);
  const setStashModalOpen = useUiStore((s) => s.setStashModalOpen);
  const setRemoteModalOpen = useUiStore((s) => s.setRemoteModalOpen);
  const showToast = useToastStore((s) => s.showToast);

  const status = useStatusStore((s) => s.status);
  const loadStatus = useStatusStore((s) => s.loadStatus);
  const loadRefs = useRefsStore((s) => s.loadRefs);
  const loadHistory = useHistoryStore((s) => s.loadInitial);

  const isFetching = useRemoteStore((s) => s.isFetching);
  const isPulling = useRemoteStore((s) => s.isPulling);
  const isPushing = useRemoteStore((s) => s.isPushing);
  const fetchAction = useRemoteStore((s) => s.fetch);
  const pullAction = useRemoteStore((s) => s.pull);
  const pushAction = useRemoteStore((s) => s.push);

  const [showPushRejectedModal, setShowPushRejectedModal] = useState(false);
  const [confirmForcePush, setConfirmForcePush] = useState(false);

  const branchAhead = status?.branch.ahead || 0;
  const branchBehind = status?.branch.behind || 0;
  const currentBranch = currentRepo?.current_branch || status?.branch.head || "main";
  const isProtectedBranch = currentBranch === "master" || currentBranch === "main";

  const refreshAll = async () => {
    if (!currentRepo) return;
    await Promise.all([
      loadStatus(currentRepo.path),
      loadRefs(currentRepo.path),
      loadHistory(currentRepo.path),
    ]);
  };

  const handleFetch = async () => {
    if (!currentRepo) return;
    try {
      await fetchAction(currentRepo.path);
      await refreshAll();
      showToast("Синхронизация с сервером (fetch) завершена");
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      showToast(errObj.message || "Ошибка fetch");
    }
  };

  const handlePull = async () => {
    if (!currentRepo) return;
    try {
      await pullAction(currentRepo.path);
      await refreshAll();
      showToast("Получение изменений (pull) завершено");
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      showToast(errObj.message || "Ошибка pull");
    }
  };

  const handlePush = async (forceWithLease: boolean = false) => {
    if (!currentRepo) return;
    try {
      const setUpstream = !status?.branch.upstream;
      await pushAction(currentRepo.path, undefined, undefined, setUpstream, forceWithLease);
      await refreshAll();
      showToast("Отправка на сервер (push) завершена");
      setShowPushRejectedModal(false);
      setConfirmForcePush(false);
    } catch (err: unknown) {
      const errObj = err as { message?: string; kind?: string };
      if (errObj.kind === "PushRejected" || (errObj.message && errObj.message.includes("Отклонено сервером"))) {
        setShowPushRejectedModal(true);
      } else {
        showToast(errObj.message || "Ошибка push");
      }
    }
  };

  return (
    <>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "0 12px",
          height: "var(--header-height)",
          backgroundColor: "var(--bg2)",
          borderBottom: "1px solid var(--line)",
          userSelect: "none",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", gap: "6px", marginRight: "8px" }}>
          <i
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              backgroundColor: "var(--bg3)",
              border: "1px solid var(--line)",
              display: "inline-block",
            }}
          />
          <i
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              backgroundColor: "var(--bg3)",
              border: "1px solid var(--line)",
              display: "inline-block",
            }}
          />
          <i
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              backgroundColor: "var(--bg3)",
              border: "1px solid var(--line)",
              display: "inline-block",
            }}
          />
        </div>

        <div
          data-ctx="repo-header"
          data-id={currentRepo?.path || ""}
          style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "default" }}
          title="Правый клик для управления репозиторием"
        >
          <b style={{ fontWeight: 600 }}>lode</b>
          <span style={{ color: "var(--mut)" }}>/</span>
          <span>{currentRepo?.name}</span>
        </div>

        {currentRepo?.current_branch && (
          <Chip variant="head">
            {currentRepo.current_branch}
          </Chip>
        )}

        <div style={{ flex: 1 }} />

        {/* Fetch Button */}
        <Button
          size="sm"
          disabled={isFetching}
          onClick={handleFetch}
          title="Получить новые ветки и коммиты с сервера (git fetch --all --prune)"
        >
          {isFetching ? "Загрузка..." : t.header.fetch}
        </Button>

        {/* Pull Button with Behind Badge */}
        <Button
          size="sm"
          disabled={isPulling}
          onClick={handlePull}
          title="Забрать изменения из удалённой ветки (git pull --ff-only)"
          style={{ display: "flex", alignItems: "center", gap: "6px" }}
        >
          <span>{isPulling ? "Получение..." : t.header.pull}</span>
          {branchBehind > 0 && (
            <b
              style={{
                fontSize: "11px",
                backgroundColor: "var(--acc)",
                color: "#fff",
                borderRadius: "10px",
                padding: "0 5px",
                lineHeight: "15px",
              }}
            >
              ↓{branchBehind}
            </b>
          )}
        </Button>

        {/* Push Button with Ahead Badge */}
        <Button
          size="sm"
          variant="primary"
          disabled={isPushing}
          onClick={() => handlePush(false)}
          title="Отправить локальные коммиты на сервер (git push)"
          style={{ display: "flex", alignItems: "center", gap: "6px" }}
        >
          <span>{isPushing ? "Отправка..." : t.header.push}</span>
          {branchAhead > 0 && (
            <b
              style={{
                fontSize: "11px",
                backgroundColor: "rgba(255, 255, 255, 0.3)",
                color: "#fff",
                borderRadius: "10px",
                padding: "0 5px",
                lineHeight: "15px",
              }}
            >
              ↑{branchAhead}
            </b>
          )}
        </Button>

        <Button
          size="sm"
          variant="default"
          title="Палитра команд (Ctrl+K)"
          onClick={() => setCommandPaletteOpen(true)}
        >
          ⌘K
        </Button>

        <IconButton
          size="sm"
          aria-label="Настройки"
          title="Настройки (Ctrl+,)"
          icon={<span>⚙</span>}
          onClick={() => setSettingsOpen(true)}
        />

        <IconButton
          size="sm"
          aria-label={t.header.themeToggle}
          title={`${t.header.themeToggle} (${theme})`}
          icon={<span>◐</span>}
          onClick={toggleTheme}
        />

        <Button
          size="sm"
          variant="ghost"
          title="Закрыть репозиторий"
          onClick={closeRepo}
        >
          Закрыть
        </Button>
      </header>

      {/* Push Rejected / Force Push Confirmation Modal */}
      <Modal
        isOpen={showPushRejectedModal}
        onClose={() => setShowPushRejectedModal(false)}
        title="Отправка отклонена сервером (Push Rejected)"
        confirmLabel="Force Push (--force-with-lease)"
        isDanger={true}
        onConfirm={() => {
          if (isProtectedBranch && !confirmForcePush) return;
          handlePush(true);
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <p style={{ margin: 0, lineHeight: 1.5, color: "var(--tx)" }}>
            Удалённая ветка содержит коммиты, которых нет в вашей локальной копии.
          </p>
          <p style={{ margin: 0, lineHeight: 1.5, color: "var(--mut)", fontSize: "var(--font-size-sm)" }}>
            Рекомендуется сначала нажать <b>«Получить (Pull)»</b>, чтобы объединить изменения.
            Использование <b>Force Push</b> перезапишет удалённую ветку вашей историей с безопасной проверкой <code>--force-with-lease</code>.
          </p>

          {isProtectedBranch && (
            <div
              style={{
                marginTop: "4px",
                padding: "10px 12px",
                backgroundColor: "rgba(255, 107, 102, 0.1)",
                border: "1px solid var(--del)",
                borderRadius: "var(--radius-base)",
              }}
            >
              <Checkbox
                label={`Я понимаю, что перезаписываю основную ветку (${currentBranch})`}
                checked={confirmForcePush}
                onChange={(e) => setConfirmForcePush(e.target.checked)}
              />
            </div>
          )}
        </div>
      </Modal>

      {/* Command Palette (Ctrl+K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenStash={() => setStashModalOpen(true)}
        onOpenRemotes={() => setRemoteModalOpen(true)}
        onOpenNewBranch={() => {}}
        onOpenNewTag={() => {}}
      />

      {/* Settings Modal (Ctrl+,) */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </>
  );
};
