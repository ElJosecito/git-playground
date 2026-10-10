import { describe, it, expect } from 'vitest';
import { lighten } from '../color';

// Ported 1:1 from the DC template's `lighten(hex,amt)` helper
// (design-handoff/Git Playground.dc.html, line 226). Used to compute the
// commit node's stroke color (a lightened version of its fill).
describe('lighten', () => {
  it('returns the same color unchanged at amt=0', () => {
    expect(lighten('#60A5FA', 0)).toBe('#60a5fa');
  });

  it('returns white at amt=1', () => {
    expect(lighten('#60A5FA', 1)).toBe('#ffffff');
  });

  it('blends toward white proportionally to amt', () => {
    // #000000 lightened by .35 -> round(0 + 255*.35) = 89 = 0x59 per channel
    expect(lighten('#000000', 0.35)).toBe('#595959');
  });

  it('matches the oracle for the palette blue at .35', () => {
    // n=0x60A5FA -> r=0x60=96,g=0xA5=165,b=0xFA=250
    // r'=round(96+(255-96)*.35)=152=0x98 g'=round(165+(255-165)*.35)=197=0xc5 b'=round(250+(255-250)*.35)=252=0xfc
    expect(lighten('#60A5FA', 0.35)).toBe('#98c5fc');
  });
});
