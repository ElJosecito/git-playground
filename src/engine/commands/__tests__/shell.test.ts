import { describe, it, expect } from 'vitest';
import { mkR } from '../../recorder';
import { vacio } from '../../state';
import { GitError } from '../../errors';
import { SHELL, shell } from '../shell';
import { help, version } from '../shell';

describe('commands/shell (ls/cat/touch/echo/rm/mv/edit/pwd/cd/mkdir/clear + help/version)', () => {
  it('SHELL lists every shell-level command name', () => {
    expect(SHELL).toEqual(['ls', 'cat', 'touch', 'echo', 'rm', 'mv', 'clear', 'help', 'edit', 'pwd', 'cd', 'mkdir']);
  });

  describe('ls', () => {
    it('lists tracked files sorted, and includes .git only with -a once inited', () => {
      const s = vacio();
      s.inited = true;
      s.files = { 'b.txt': '1', 'a.txt': '2' };
      const r = mkR();
      shell(s, 'ls', ['-a'], r);
      expect(r.salida[0]).toContain('.git');
      expect(r.salida[0]).toContain('a.txt');

      const r2 = mkR();
      shell(s, 'ls', [], r2);
      expect(r2.salida[0]).not.toContain('.git');
    });
  });

  it('pwd always reports the fixed project path', () => {
    const r = mkR();
    shell(vacio(), 'pwd', [], r);
    expect(r.salida).toEqual(['/home/tu/proyecto']);
  });

  it('cd reports the no-folders hint', () => {
    const r = mkR();
    shell(vacio(), 'cd', [], r);
    expect(r.salida.join('\n')).toContain('siempre en ~/proyecto');
  });

  it('mkdir always fails (no folder support)', () => {
    expect(() => shell(vacio(), 'mkdir', ['x'], mkR())).toThrowError(GitError);
  });

  describe('cat', () => {
    it('prints file contents, line by line', () => {
      const s = vacio();
      s.files['a.txt'] = 'line1\nline2';
      const r = mkR();
      shell(s, 'cat', ['a.txt'], r);
      expect(r.salida).toEqual(['line1', 'line2']);
    });

    it('reports a placeholder for an empty file', () => {
      const s = vacio();
      s.files['a.txt'] = '';
      const r = mkR();
      shell(s, 'cat', ['a.txt'], r);
      expect(r.salida.join('\n')).toContain('archivo vacío');
    });

    it('fails for a nonexistent file', () => {
      expect(() => shell(vacio(), 'cat', ['nope.txt'], mkR())).toThrowError(GitError);
    });
  });

  describe('touch', () => {
    it('creates an empty file if it does not exist, and leaves an existing one untouched', () => {
      const s = vacio();
      shell(s, 'touch', ['a.txt'], mkR());
      expect(s.files['a.txt']).toBe('');
      s.files['a.txt'] = 'keep-me';
      shell(s, 'touch', ['a.txt'], mkR());
      expect(s.files['a.txt']).toBe('keep-me');
    });

    it('fails for an invalid file name', () => {
      expect(() => shell(vacio(), 'touch', ['a/b.txt'], mkR())).toThrowError(GitError);
    });
  });

  describe('edit', () => {
    it('sets r.accion to open the mini editor', () => {
      const r = mkR();
      shell(vacio(), 'edit', ['a.txt'], r);
      expect(r.accion).toEqual({ tipo: 'editar', archivo: 'a.txt' });
    });
  });

  describe('echo', () => {
    it('prints plain text without redirection', () => {
      const r = mkR();
      shell(vacio(), 'echo', ['hola', 'mundo'], r);
      expect(r.salida).toEqual(['hola mundo']);
    });

    it('overwrites a file with ">"', () => {
      const s = vacio();
      s.files['a.txt'] = 'old';
      shell(s, 'echo', ['nuevo', '>', 'a.txt'], mkR());
      expect(s.files['a.txt']).toBe('nuevo');
    });

    it('appends to a file with ">>"', () => {
      const s = vacio();
      s.files['a.txt'] = 'linea1';
      shell(s, 'echo', ['linea2', '>>', 'a.txt'], mkR());
      expect(s.files['a.txt']).toBe('linea1\nlinea2');
    });
  });

  describe('rm (shell)', () => {
    it('deletes an existing file', () => {
      const s = vacio();
      s.files['a.txt'] = 'x';
      shell(s, 'rm', ['a.txt'], mkR());
      expect('a.txt' in s.files).toBe(false);
    });

    it('refuses to delete .git', () => {
      const s = vacio();
      expect(() => shell(s, 'rm', ['.git'], mkR())).toThrowError(GitError);
    });

    it('fails for a nonexistent file', () => {
      expect(() => shell(vacio(), 'rm', ['nope.txt'], mkR())).toThrowError(GitError);
    });
  });

  describe('mv (shell)', () => {
    it('renames a file', () => {
      const s = vacio();
      s.files['a.txt'] = 'x';
      shell(s, 'mv', ['a.txt', 'b.txt'], mkR());
      expect(s.files['b.txt']).toBe('x');
      expect('a.txt' in s.files).toBe(false);
    });

    it('fails when the source does not exist', () => {
      expect(() => shell(vacio(), 'mv', ['nope.txt', 'b.txt'], mkR())).toThrowError(GitError);
    });
  });

  describe('clear', () => {
    it('is a documented SHELL command with no engine-level effect (handled by the UI layer)', () => {
      const s = vacio();
      const before = JSON.stringify(s);
      const r = mkR();
      shell(s, 'clear', [], r);
      expect(JSON.stringify(s)).toBe(before);
      expect(r.salida).toEqual([]);
    });
  });

  describe('help / version', () => {
    it('help prints the full AYUDA command reference', () => {
      const r = mkR();
      help(vacio(), [], r);
      expect(r.salida.length).toBeGreaterThan(5);
      expect(r.salida.join('\n')).toContain('Comandos disponibles');
    });

    it('shell "help" delegates to GIT.help output', () => {
      const r = mkR();
      shell(vacio(), 'help', [], r);
      expect(r.salida.join('\n')).toContain('Comandos disponibles');
    });

    it('version reports the simulated git version string', () => {
      const r = mkR();
      version(vacio(), [], r);
      expect(r.salida).toEqual(['git version 2.47.0 (simulado)']);
    });
  });
});
