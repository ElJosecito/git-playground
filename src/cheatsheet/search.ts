// Pure filtering for the cheatsheet. No React, no DOM: given the categories
// and a free-text query, returns the categories that still have matching
// commands (each trimmed to just those commands), in their original order.
import type { CheatCategory, CheatCommand } from './commands';

/** Lowercases and strips diacritics so "Configuración" matches "configuracion". */
export function normalizeText(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function haystackOf(category: CheatCategory, entry: CheatCommand): string {
  return normalizeText([entry.command, entry.summary, entry.explanation, ...entry.shortcuts, category.title].join('\n'));
}

/** Every whitespace-separated word of the query must appear somewhere in
 * the command, its summary, explanation, shortcuts, or its category title.
 * A blank query returns the input as-is. */
export function searchCheatsheet(categories: readonly CheatCategory[], query: string): CheatCategory[] {
  const terms = normalizeText(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [...categories];
  const result: CheatCategory[] = [];
  for (const category of categories) {
    const commands = category.commands.filter((entry) => {
      const haystack = haystackOf(category, entry);
      return terms.every((term) => haystack.includes(term));
    });
    if (commands.length > 0) result.push({ ...category, commands });
  }
  return result;
}

export function countCommands(categories: readonly CheatCategory[]): number {
  return categories.reduce((total, category) => total + category.commands.length, 0);
}
