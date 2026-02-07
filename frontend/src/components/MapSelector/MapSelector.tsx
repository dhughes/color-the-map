import { useState, useRef, useEffect } from "react";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { ConfirmDialog } from "../ConfirmDialog";
import type { MapData } from "../../types/map";

interface MapSelectorProps {
  maps: MapData[];
  currentMapId: number;
  onSelectMap: (mapId: number) => void;
  onCreateMap: (name: string) => void;
  onRenameMap: (mapId: number, name: string) => void;
  onDeleteMap: (mapId: number) => void;
}

export function MapSelector({
  maps,
  currentMapId,
  onSelectMap,
  onCreateMap,
  onRenameMap,
  onDeleteMap,
}: MapSelectorProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentMap = maps.find((m) => m.id === currentMapId);
  const canDelete = maps.length > 1;

  useEffect(() => {
    if ((isCreating || isRenaming) && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isCreating, isRenaming]);

  const handleStartCreate = () => {
    setNewName("");
    setIsCreating(true);
    setIsRenaming(false);
  };

  const handleStartRename = () => {
    setNewName(currentMap?.name ?? "");
    setIsRenaming(true);
    setIsCreating(false);
  };

  const handleSubmitCreate = () => {
    const trimmed = newName.trim();
    if (trimmed) {
      onCreateMap(trimmed);
    }
    setIsCreating(false);
    setNewName("");
  };

  const handleSubmitRename = () => {
    const trimmed = newName.trim();
    if (trimmed && trimmed !== currentMap?.name) {
      onRenameMap(currentMapId, trimmed);
    }
    setIsRenaming(false);
    setNewName("");
  };

  const handleCancel = () => {
    setIsCreating(false);
    setIsRenaming(false);
    setNewName("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (isCreating) handleSubmitCreate();
      else if (isRenaming) handleSubmitRename();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    }
  };

  const handleDeleteClick = () => {
    if (canDelete) {
      setConfirmDeleteId(currentMapId);
    }
  };

  const handleConfirmDelete = () => {
    if (confirmDeleteId !== null) {
      onDeleteMap(confirmDeleteId);
    }
    setConfirmDeleteId(null);
  };

  const mapToDelete = maps.find((m) => m.id === confirmDeleteId);

  return (
    <>
      <div className="map-selector">
        <div className="map-selector-bar" />
        {isCreating || isRenaming ? (
          <div className="map-selector-input-row">
            <input
              ref={inputRef}
              className="map-selector-input"
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isCreating ? "New map name" : "Rename map"}
              maxLength={100}
            />
            <button
              className="map-selector-icon-btn"
              onClick={isCreating ? handleSubmitCreate : handleSubmitRename}
              aria-label="Confirm"
              title="Confirm"
            >
              <Check size={14} />
            </button>
            <button
              className="map-selector-icon-btn"
              onClick={handleCancel}
              aria-label="Cancel"
              title="Cancel"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <>
            <select
              className="map-selector-select"
              value={currentMapId}
              onChange={(e) => onSelectMap(Number(e.target.value))}
            >
              {maps.map((map) => (
                <option key={map.id} value={map.id}>
                  {map.name}
                </option>
              ))}
            </select>
            <div className="map-selector-actions">
              <button
                className="map-selector-icon-btn"
                onClick={handleStartCreate}
                aria-label="Create new map"
                title="New map"
              >
                <Plus size={14} />
              </button>
              <button
                className="map-selector-icon-btn"
                onClick={handleStartRename}
                aria-label="Rename map"
                title="Rename map"
              >
                <Pencil size={14} />
              </button>
              <button
                className={`map-selector-icon-btn${!canDelete ? " disabled" : ""}`}
                onClick={handleDeleteClick}
                disabled={!canDelete}
                aria-label="Delete map"
                title={canDelete ? "Delete map" : "Cannot delete last map"}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </>
        )}
      </div>

      <ConfirmDialog
        isOpen={confirmDeleteId !== null}
        title="Delete Map"
        message={`Delete "${mapToDelete?.name ?? ""}" and all its tracks?`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </>
  );
}
