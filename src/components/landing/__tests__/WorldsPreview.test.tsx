// @vitest-environment jsdom
// landing-page spec "Core Sections": Worlds preview, driven by
// `worldsMeta.ts` — catalog-free (design.md UI: "WorldsPreview from
// worldsMeta.ts (no catalog import)").
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WorldsPreview } from '../WorldsPreview';
import { WORLDS_META } from '../../../lessons/worldsMeta';

describe('WorldsPreview', () => {
  it('renders all 6 worlds with their display names', () => {
    render(<WorldsPreview />);
    for (const world of WORLDS_META) {
      expect(screen.getByText(world.name)).toBeInTheDocument();
    }
  });

  it('renders every level title across all worlds', () => {
    render(<WorldsPreview />);
    const totalLevels = WORLDS_META.reduce((n, w) => n + w.levels.length, 0);
    expect(totalLevels).toBe(30);
    for (const world of WORLDS_META) {
      for (const level of world.levels) {
        expect(screen.getByText(level.title)).toBeInTheDocument();
      }
    }
  });
});
