import type { RoleType } from '@prisma/client';

/**
 * Role colours (designer handoff): strictly non-hierarchical. Text on them is always forest,
 * and the role name is always written out.
 */
export const ROLE_COLOR: Record<RoleType, { solid: string; tint: string; solidClass: string; tintClass: string; borderClass: string; peerCheckedClass: string }> = {
  FOUNDER: { solid: '#F4B8C8', tint: '#FBE3EA', solidClass: 'bg-founder', tintClass: 'bg-founder-tint', borderClass: 'border-founder', peerCheckedClass: 'peer-checked:bg-founder' },
  OPERATOR: { solid: '#D9CCF5', tint: '#EFE9FB', solidClass: 'bg-operator', tintClass: 'bg-operator-tint', borderClass: 'border-operator', peerCheckedClass: 'peer-checked:bg-operator' },
  INVESTOR: { solid: '#F2D774', tint: '#F9EDBE', solidClass: 'bg-investor', tintClass: 'bg-investor-tint', borderClass: 'border-investor', peerCheckedClass: 'peer-checked:bg-investor' },
  BUILDER: { solid: '#C9D9A8', tint: '#E6EED6', solidClass: 'bg-builder', tintClass: 'bg-builder-tint', borderClass: 'border-builder', peerCheckedClass: 'peer-checked:bg-builder' },
};
