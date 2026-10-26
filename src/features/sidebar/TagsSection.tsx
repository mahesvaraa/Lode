import React from "react";
import { Button, PlusIcon, CloseIcon, TagIcon } from "@/ui";
import { useI18n } from "@/lib/i18n";
import type { GitRef } from "@/api/types/git_ref";
import type { RepoRefs } from "@/api/types/repo_refs";

interface TagsSectionProps {
  refs: RepoRefs | null;
  onOpenCreateTag: () => void;
  onSelectTagToDelete: (tag: GitRef) => void;
}

export const TagsSection: React.FC<TagsSectionProps> = ({
  refs,
  onOpenCreateTag,
  onSelectTagToDelete,
}) => {
  const { t } = useI18n();

  return (
    <>
      <div
        data-ctx="sidebar-section"
        data-id="tags"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          margin: "16px 8px 6px",
        }}
      >
        <h6
          style={{
            margin: 0,
            fontSize: "var(--font-size-xs)",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            color: "var(--mut)",
          }}
        >
          {t.sidebar.tags}
        </h6>
        <Button
          size="sm"
          variant="ghost"
          onClick={onOpenCreateTag}
          style={{ padding: "1px 6px" }}
          title="Создать тег"
        >
          <PlusIcon size={12} />
        </Button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        {refs?.tags.length === 0 ? (
          <div style={{ padding: "4px 8px", fontSize: "var(--font-size-xs)", color: "var(--mut)" }}>
            (нет тегов)
          </div>
        ) : (
          refs?.tags.map((tag) => (
            <div
              key={tag.name}
              data-ctx="tag"
              data-id={tag.name}
              className="row"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "3px 8px",
                borderRadius: "var(--radius-base)",
                fontSize: "var(--font-size-sm)",
                color: "var(--tx)",
              }}
            >
              <TagIcon size={12} style={{ color: "var(--mut)", flexShrink: 0 }} />
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {tag.name}
              </span>
              <Button
                size="sm"
                variant="ghost"
                title="Удалить тег"
                onClick={() => onSelectTagToDelete(tag)}
                style={{ padding: "0 4px" }}
              >
                <CloseIcon size={12} />
              </Button>
            </div>
          ))
        )}
      </div>
    </>
  );
};
