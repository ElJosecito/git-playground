// The files-strip panel: working directory / staging / last-commit
// columns. 1:1 port of the DC template's files-strip block
// (design-handoff/Git Playground.dc.html, lines 37-86), including the
// mobile floating-button variant (lines 84-86). Every `data-zone`/
// `data-chip` attribute is kept verbatim (design D15) — Phase 5's
// choreography measures and flies these exact elements, which is why this
// component ships before Phase 5.
//
// File-management buttons ("+ Nuevo archivo" / "Editar" / "Renombrar" /
// "Borrar" — students shouldn't need touch/mv/rm/edit in the terminal):
// the per-file action buttons and every inline input/confirm step are
// rendered as SIBLINGS of the `data-chip` element, never children of it, so
// the chip's own measured box (what the fly-animation choreography reads
// via `getBoundingClientRect()`) never changes shape because of them.
import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import type { FileChip, FilesModel } from '../ui/selectors';
import styles from './FilesStrip.module.css';

/** Returned by the file-button handlers (same shape as `useGitPlayground`'s
 * `HostingOutcome`, but decoded to plain Spanish text — this component
 * never needs to know about the engine's markup wire format). */
export interface FileActionResult {
  ok: boolean;
  error?: string;
}

export interface FilesStripProps {
  model: FilesModel;
  summary: string;
  mobile: boolean;
  /** Desktop only: whether the panel body is expanded (the chevron state).
   * Always rendered expanded on mobile once shown (oracle:
   * `stripOpen:mob?true:s.stripOpen`). */
  open: boolean;
  /** Mobile only: whether the floating panel is shown over the "Archivos"
   * button (oracle's `stripMobile`). Ignored on desktop. */
  mobileShown: boolean;
  onToggle(): void;
  onShowMobile(): void;
  /** "+ Nuevo archivo". */
  onCreateFile(name: string): FileActionResult;
  /** Per-file "Renombrar". */
  onRenameFile(from: string, to: string): FileActionResult;
  /** Per-file "Borrar" (called only after the inline confirm step). */
  onDeleteFile(name: string): FileActionResult;
  /** Per-file "Editar" — opens the shared FileEditorModal. */
  onEditFile(name: string): void;
}

/** A working-directory chip is actionable (Editar/Renombrar/Borrar) only
 * when the file still exists in the working tree and isn't mid-conflict —
 * a staged-for-deletion chip (`deco: 'line-through'`) has nothing left to
 * edit/rename, and a conflict chip (`letter: '!'`) is handled by the
 * ConflictResolver panel instead. */
function isActionable(f: FileChip): boolean {
  return f.deco !== 'line-through' && f.letter !== '!';
}

export function FilesStrip({
  model,
  summary,
  mobile,
  open,
  mobileShown,
  onToggle,
  onShowMobile,
  onCreateFile,
  onRenameFile,
  onDeleteFile,
  onEditFile,
}: FilesStripProps) {
  const [newFileOpen, setNewFileOpen] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFileError, setNewFileError] = useState<string | null>(null);
  const newFileInputRef = useRef<HTMLInputElement>(null);

  const [renameTarget, setRenameTarget] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renameError, setRenameError] = useState<string | null>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // Focus management: the Renombrar/Borrar trigger button for a given file
  // is a DIFFERENT DOM node each time its row toggles between the normal
  // action row and the inline form/confirm step (React mounts/unmounts
  // across that conditional), so a plain ref captured on click would go
  // stale the moment the row swaps. Each button instead registers itself
  // into a name-keyed map via a callback ref, and a `useEffect` keyed on
  // the closing state re-reads that map AFTER the row has swapped back —
  // by then the new button instance has already registered itself — and
  // focuses it. The new-file button needs no map (there's only ever one).
  const renameButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const deleteButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const newFileButtonRef = useRef<HTMLButtonElement | null>(null);
  // On cancel, the target row survives unchanged, so focusing it back by
  // its own (unchanged) name always works. On a SUCCESSFUL rename the row
  // survives but under the NEW name, so `name` is the destination, not the
  // source. On a SUCCESSFUL delete the row is gone entirely — `next`/`prev`
  // are the neighboring working-dir file names (captured at click time,
  // before the row disappears) to fall back to, in that order, before
  // finally falling back to the "+ Nuevo archivo" button.
  const pendingRenameFocusRef = useRef<string | null>(null);
  const pendingDeleteFocusRef = useRef<{ name: string; next: string | null; prev: string | null } | null>(null);
  const pendingNewFileFocusRef = useRef(false);

  useEffect(() => {
    if (newFileOpen) {
      newFileInputRef.current?.focus();
    } else if (pendingNewFileFocusRef.current) {
      pendingNewFileFocusRef.current = false;
      newFileButtonRef.current?.focus();
    }
  }, [newFileOpen]);

  useEffect(() => {
    if (renameTarget != null) {
      renameInputRef.current?.focus();
    } else if (pendingRenameFocusRef.current != null) {
      const name = pendingRenameFocusRef.current;
      pendingRenameFocusRef.current = null;
      renameButtonRefs.current.get(name)?.focus();
    }
  }, [renameTarget]);

  useEffect(() => {
    if (deleteTarget == null && pendingDeleteFocusRef.current != null) {
      const { name, next, prev } = pendingDeleteFocusRef.current;
      pendingDeleteFocusRef.current = null;
      const target =
        deleteButtonRefs.current.get(name) ??
        (next != null ? deleteButtonRefs.current.get(next) : undefined) ??
        (prev != null ? deleteButtonRefs.current.get(prev) : undefined) ??
        newFileButtonRef.current;
      target?.focus();
    }
  }, [deleteTarget]);

  function openNewFile(): void {
    setNewFileOpen(true);
    setNewFileName('');
    setNewFileError(null);
  }

  function cancelNewFile(): void {
    pendingNewFileFocusRef.current = true;
    setNewFileOpen(false);
    setNewFileName('');
    setNewFileError(null);
  }

  function submitNewFile(): void {
    const res = onCreateFile(newFileName.trim());
    if (res.ok) {
      pendingNewFileFocusRef.current = true;
      setNewFileOpen(false);
      setNewFileName('');
      setNewFileError(null);
    } else {
      setNewFileError(res.error ?? 'No se pudo crear el archivo.');
    }
  }

  function handleNewFileKeyDown(e: KeyboardEvent<HTMLInputElement>): void {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitNewFile();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelNewFile();
    }
  }

  function startRename(name: string): void {
    setRenameTarget(name);
    setRenameValue(name);
    setRenameError(null);
  }

  function cancelRename(name: string): void {
    pendingRenameFocusRef.current = name;
    setRenameTarget(null);
    setRenameValue('');
    setRenameError(null);
  }

  function submitRename(from: string): void {
    const to = renameValue.trim();
    const res = onRenameFile(from, to);
    if (res.ok) {
      // The row survives the rename, but re-mounts under the NEW name
      // (model.wd's entry for `from` becomes one for `to`) — focus that.
      pendingRenameFocusRef.current = to;
      setRenameTarget(null);
      setRenameValue('');
      setRenameError(null);
    } else {
      setRenameError(res.error ?? 'No se pudo renombrar el archivo.');
    }
  }

  function handleRenameKeyDown(e: KeyboardEvent<HTMLInputElement>, from: string): void {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitRename(from);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelRename(from);
    }
  }

  function startDelete(name: string): void {
    setDeleteTarget(name);
  }

  function cancelDelete(name: string): void {
    // The row survives a cancel unchanged, so `name` alone is enough —
    // no neighbor fallback needed.
    pendingDeleteFocusRef.current = { name, next: null, prev: null };
    setDeleteTarget(null);
  }

  function confirmDelete(name: string): void {
    // Capture neighbors from the CURRENT (pre-delete) model, at click time
    // — once `onDeleteFile` succeeds the row for `name` is gone for good.
    const names = model.wd.map((f) => f.name);
    const idx = names.indexOf(name);
    pendingDeleteFocusRef.current = { name, next: names[idx + 1] ?? null, prev: names[idx - 1] ?? null };
    onDeleteFile(name);
    setDeleteTarget(null);
  }

  if (mobile && !mobileShown) {
    return (
      <button type="button" onClick={onShowMobile} className={styles.mobileButton}>
        Archivos <span className={styles.mobileButtonCount}>{model.stripCount}</span>
      </button>
    );
  }

  const expanded = mobile || open;

  return (
    <div className={`${styles.panel} ${mobile ? styles.panelMobile : ''}`}>
      <div onClick={onToggle} className={styles.header}>
        <div className={styles.headerTitle}>Archivos</div>
        <div className={styles.headerSummary}>{summary}</div>
        <div className={`${styles.chevron} ${expanded ? '' : styles.chevronClosed}`}>▾</div>
      </div>
      {expanded && (
        <div className={styles.body}>
          <div data-zone="w" className={styles.zone}>
            <div title="Los archivos de tu carpeta, tal como están ahora" className={styles.zoneHeader}>
              Working directory
            </div>
            {model.wd.map((f) => {
              const actionable = isActionable(f);
              const isRenaming = renameTarget === f.name;
              const isConfirmingDelete = deleteTarget === f.name;
              return (
                <div key={f.name} className={styles.wdRow}>
                  <div data-chip={`w:${f.name}`} title={f.title} className={styles.chip} style={{ background: f.bg }}>
                    <div className={styles.chipDot} style={{ background: f.dot }} />
                    <div className={styles.chipName} style={{ color: f.color, textDecoration: f.deco }}>
                      {f.name}
                    </div>
                    <div className={styles.chipLetter} style={{ color: f.dot }}>
                      {f.letter}
                    </div>
                  </div>
                  {actionable && !isRenaming && !isConfirmingDelete && (
                    <div className={styles.fileActions}>
                      <button
                        type="button"
                        aria-label={`Editar ${f.name}`}
                        className={styles.fileActionButton}
                        onClick={() => onEditFile(f.name)}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        ref={(el) => {
                          if (el) renameButtonRefs.current.set(f.name, el);
                          else renameButtonRefs.current.delete(f.name);
                        }}
                        aria-label={`Renombrar ${f.name}`}
                        className={styles.fileActionButton}
                        onClick={() => startRename(f.name)}
                      >
                        Renombrar
                      </button>
                      <button
                        type="button"
                        ref={(el) => {
                          if (el) deleteButtonRefs.current.set(f.name, el);
                          else deleteButtonRefs.current.delete(f.name);
                        }}
                        aria-label={`Borrar ${f.name}`}
                        className={styles.fileActionButtonDanger}
                        onClick={() => startDelete(f.name)}
                      >
                        Borrar
                      </button>
                    </div>
                  )}
                  {isRenaming && (
                    <div className={styles.inlineForm}>
                      <input
                        ref={renameInputRef}
                        value={renameValue}
                        onChange={(e) => {
                          setRenameValue(e.target.value);
                          setRenameError(null);
                        }}
                        onKeyDown={(e) => handleRenameKeyDown(e, f.name)}
                        aria-label={`Nuevo nombre para ${f.name}`}
                        className={styles.inlineInput}
                        spellCheck={false}
                      />
                      <button
                        type="button"
                        aria-label={`Confirmar nuevo nombre para ${f.name}`}
                        className={styles.inlineConfirm}
                        onClick={() => submitRename(f.name)}
                      >
                        ✓
                      </button>
                      <button type="button" aria-label="Cancelar" className={styles.inlineCancel} onClick={() => cancelRename(f.name)}>
                        ✕
                      </button>
                      {renameError && (
                        <div role="alert" className={styles.inlineError}>
                          {renameError}
                        </div>
                      )}
                    </div>
                  )}
                  {isConfirmingDelete && (
                    <div className={styles.confirmRow}>
                      <span className={styles.confirmText}>¿Borrar {f.name}?</span>
                      <button
                        type="button"
                        aria-label={`Confirmar borrado de ${f.name}`}
                        className={styles.confirmYes}
                        onClick={() => confirmDelete(f.name)}
                      >
                        Sí
                      </button>
                      <button type="button" aria-label="Cancelar borrado" className={styles.confirmNo} onClick={() => cancelDelete(f.name)}>
                        No
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
            {model.wdEmpty && <div className={styles.empty}>vacío</div>}
            <div className={styles.newFileRow}>
              {newFileOpen ? (
                <div className={styles.inlineForm}>
                  <input
                    ref={newFileInputRef}
                    value={newFileName}
                    onChange={(e) => {
                      setNewFileName(e.target.value);
                      setNewFileError(null);
                    }}
                    onKeyDown={handleNewFileKeyDown}
                    aria-label="Nombre del nuevo archivo"
                    placeholder="archivo.txt"
                    className={styles.inlineInput}
                    spellCheck={false}
                  />
                  <button type="button" aria-label="Crear archivo" className={styles.inlineConfirm} onClick={submitNewFile}>
                    ✓
                  </button>
                  <button type="button" aria-label="Cancelar" className={styles.inlineCancel} onClick={cancelNewFile}>
                    ✕
                  </button>
                  {newFileError && (
                    <div role="alert" className={styles.inlineError}>
                      {newFileError}
                    </div>
                  )}
                </div>
              ) : (
                <button type="button" ref={newFileButtonRef} className={styles.newFileButton} onClick={openNewFile}>
                  + Nuevo archivo
                </button>
              )}
            </div>
          </div>
          <div className={styles.arrow}>→</div>
          <div data-zone="s" className={styles.zone}>
            <div title="Lo que entrará en el próximo commit" className={styles.zoneHeader}>
              Staging
            </div>
            {model.stg.map((f) => (
              <div key={f.name} data-chip={`s:${f.name}`} title={f.title} className={styles.chip} style={{ background: 'rgba(74,222,128,0.08)' }}>
                <div className={styles.chipDot} style={{ background: 'var(--success)' }} />
                <div className={styles.chipName} style={{ color: 'var(--text-primary)', textDecoration: f.deco }}>
                  {f.name}
                </div>
                <div className={styles.chipLetter} style={{ color: 'var(--success)' }}>
                  {f.letter}
                </div>
              </div>
            ))}
            {model.stgEmpty && <div className={styles.empty}>vacío</div>}
          </div>
          <div className={styles.arrow}>→</div>
          <div data-zone="c" className={styles.zone}>
            <div data-chip="c:__head" title="Los archivos guardados en el commit al que apunta HEAD" className={styles.commitZoneHeader}>
              <span>Último commit</span>
              <span className={styles.commitHeaderHash}>{model.headShort}</span>
            </div>
            {model.cm.map((f) => (
              <div key={f.name} data-chip={`c:${f.name}`} className={styles.chip}>
                <div className={styles.chipDotOutline} />
                <div className={styles.chipCommitName}>{f.name}</div>
              </div>
            ))}
            {model.cmEmpty && <div className={styles.empty}>{model.cmEmptyText}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
