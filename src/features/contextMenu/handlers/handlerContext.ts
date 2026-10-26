import type { RepoContext } from "@/menus";
import type { ContextMenuDialogSetters } from "../ContextMenuModals";
import type { RepoDetails } from "@/api/types/repo_details";

export interface MenuHandlerContext {
  currentRepo: RepoDetails;
  repoContext: RepoContext;
  dialogs: ContextMenuDialogSetters;
  refreshAll: () => Promise<void>;
  showToast: (message: string, type?: "error" | "info" | "success") => void;
}
