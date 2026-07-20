import { PermissionsBitField, PermissionFlagsBits } from 'discord.js';
import { isAdmin } from '../../src/bot/utils/permissions.js';

function fakeInteraction({ inGuild = true, permissions = 0n }) {
  return {
    inGuild: () => inGuild,
    memberPermissions: new PermissionsBitField(permissions),
  };
}

describe('isAdmin', () => {
  it('is true with Manage Server', () => {
    expect(
      isAdmin(fakeInteraction({ permissions: PermissionFlagsBits.ManageGuild })),
    ).toBe(true);
  });

  it('is false without Manage Server', () => {
    expect(
      isAdmin(fakeInteraction({ permissions: PermissionFlagsBits.SendMessages })),
    ).toBe(false);
  });

  it('is false outside a guild (fail-closed)', () => {
    expect(isAdmin(fakeInteraction({ inGuild: false }))).toBe(false);
  });

  it('is false when memberPermissions is missing', () => {
    expect(isAdmin({ inGuild: () => true, memberPermissions: null })).toBe(false);
  });
});
