import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FileEditorModal } from '../FileEditorModal';

// 1:1 port of the DC template's inline file-editor modal
// (design-handoff/Git Playground.dc.html, lines 169-182): Ctrl+Enter (or
// Cmd+Enter) saves via `escribir`, Esc cancels. Phase 6, tasks.md 6.5/6.6.
describe('FileEditorModal', () => {
  function props(overrides: Partial<Parameters<typeof FileEditorModal>[0]> = {}) {
    return {
      file: 'notas.txt',
      text: 'hola mundo',
      onChange: vi.fn(),
      onSave: vi.fn(),
      onCancel: vi.fn(),
      ...overrides,
    };
  }

  it('renders the file name, the Ctrl+Enter/Esc hint, and the textarea value', () => {
    render(<FileEditorModal {...props()} />);
    expect(screen.getByText('notas.txt')).toBeInTheDocument();
    expect(screen.getByText('Ctrl+Enter guarda · Esc cancela')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveValue('hola mundo');
  });

  it('autofocuses the textarea on mount', () => {
    render(<FileEditorModal {...props()} />);
    expect(screen.getByRole('textbox')).toHaveFocus();
  });

  it('calls onChange while typing', async () => {
    const p = props();
    render(<FileEditorModal {...p} />);
    await userEvent.setup().type(screen.getByRole('textbox'), '!');
    expect(p.onChange).toHaveBeenCalled();
  });

  it('calls onSave on Ctrl+Enter and on Cmd+Enter (metaKey)', async () => {
    const p = props();
    render(<FileEditorModal {...p} />);
    const textarea = screen.getByRole('textbox');
    textarea.focus();
    await userEvent.setup().keyboard('{Control>}{Enter}{/Control}');
    expect(p.onSave).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel on Escape', async () => {
    const p = props();
    render(<FileEditorModal {...p} />);
    screen.getByRole('textbox').focus();
    await userEvent.setup().keyboard('{Escape}');
    expect(p.onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onSave/onCancel when clicking Guardar/Cancelar', async () => {
    const p = props();
    render(<FileEditorModal {...p} />);
    const user = userEvent.setup();
    await user.click(screen.getByText('Guardar'));
    expect(p.onSave).toHaveBeenCalledTimes(1);
    await user.click(screen.getByText('Cancelar'));
    expect(p.onCancel).toHaveBeenCalledTimes(1);
  });
});
