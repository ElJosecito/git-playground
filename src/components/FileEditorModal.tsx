// Inline file editor modal, opened for commands whose `accion.tipo` is
// `'editar'` (e.g. an empty `git commit` with no `-m`) and for the conflict
// resolver's "Editar…" button. 1:1 port of the DC template's editor modal
// (design-handoff/Git Playground.dc.html, lines 169-182): Ctrl+Enter (or
// Cmd+Enter) saves via `escribir`, Esc cancels.
import { useEffect, useRef } from 'react';
import type { ChangeEvent, KeyboardEvent } from 'react';
import styles from './FileEditorModal.module.css';

export interface FileEditorModalProps {
  file: string;
  text: string;
  onChange(text: string): void;
  onSave(): void;
  onCancel(): void;
}

export function FileEditorModal({ file, text, onChange, onSave, onCancel }: FileEditorModalProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  function handleChange(e: ChangeEvent<HTMLTextAreaElement>): void {
    onChange(e.target.value);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>): void {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      onSave();
    } else if (e.key === 'Escape') {
      e.stopPropagation();
      onCancel();
    }
  }

  return (
    <div className={styles.modal}>
      <div className={styles.header}>
        <div className={styles.headerLabel}>Editando</div>
        <div className={styles.fileName}>{file}</div>
        <div className={styles.hint}>Ctrl+Enter guarda · Esc cancela</div>
      </div>
      <textarea
        ref={textareaRef}
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        spellCheck={false}
        className={styles.textarea}
      />
      <div className={styles.footer}>
        <button type="button" onClick={onCancel} className={styles.cancel}>
          Cancelar
        </button>
        <button type="button" onClick={onSave} className={styles.save}>
          Guardar
        </button>
      </div>
    </div>
  );
}
