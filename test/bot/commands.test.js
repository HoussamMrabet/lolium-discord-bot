import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCommands } from '../../src/bot/handlers/commandLoader.js';

const commandsDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../src/bot/commands',
);

describe('slash command modules', () => {
  let commands;

  beforeAll(async () => {
    commands = await loadCommands(commandsDir);
  });

  it('loads every command module', () => {
    expect(commands.size).toBeGreaterThanOrEqual(14);
    for (const name of [
      'ping',
      'help',
      'setup',
      'channel',
      'settings',
      'unlink',
      'admin',
      'link',
      'profile',
      'rank',
      'stats',
      'history',
      'leaderboard',
      'betting',
    ]) {
      expect(commands.has(name)).toBe(true);
    }
  });

  it('produces valid, serializable command data with an execute handler', () => {
    for (const command of commands.values()) {
      expect(typeof command.execute).toBe('function');
      const json = command.data.toJSON();
      expect(json.name).toMatch(/^[\w-]{1,32}$/);
      expect(json.name).toBe(json.name.toLowerCase());
      expect(typeof json.description).toBe('string');
      expect(json.description.length).toBeGreaterThan(0);
    }
  });

  it('keys the map by the command name', () => {
    for (const [name, command] of commands) {
      expect(command.data.name).toBe(name);
    }
  });

  it('gives autocomplete commands an autocomplete handler', () => {
    const unlink = commands.get('unlink');
    expect(typeof unlink.autocomplete).toBe('function');
  });
});
