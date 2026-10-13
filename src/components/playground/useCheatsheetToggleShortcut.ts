// Ctrl+K / Cmd+K toggles the sandbox cheatsheet panel. It works from the
// terminal input too: the terminal only binds Ctrl+L, Enter, Tab and the
// arrows, and plain typing never carries a Ctrl/Cmd modifier.
import { useEffect, useRef } from 'react';

export function isCheatsheetToggle(event: KeyboardEvent): boolean {
  return (event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 'k';
}

export function useCheatsheetToggleShortcut(onToggle: () => void): void {
  const toggleRef = useRef(onToggle);
  toggleRef.current = onToggle;

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.repeat || !isCheatsheetToggle(event)) return;
      event.preventDefault();
      toggleRef.current();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);
}
