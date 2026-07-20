/**
 * Helpers for resolving which linked account a lookup command targets.
 * A user may link several accounts; commands accept an optional `user` (whose
 * accounts to view) and an optional `account` (autocomplete, self only).
 */

/** All {player, summoner} pairs a user has linked in a guild. */
export async function listAccounts(ctx, guildId, discordUserId) {
  const players = await ctx.repositories.players.listByUser(guildId, discordUserId);
  const accounts = [];
  for (const player of players) {
    const summoner = await ctx.repositories.summoners.findByPuuid(player.puuid);
    if (summoner) accounts.push({ player, summoner });
  }
  return accounts;
}

export function pickPrimary(accounts) {
  return accounts.find((a) => a.player.primary) ?? accounts[0] ?? null;
}

/**
 * Resolves the target user and account for a lookup command.
 * @returns {{ targetUser, account: {player, summoner}|null, accounts: Array }}
 */
export async function resolveTarget(ctx, interaction) {
  const targetUser = interaction.options.getUser('user') ?? interaction.user;
  const accountValue = interaction.options.getString('account');
  const accounts = await listAccounts(ctx, interaction.guildId, targetUser.id);

  let account = pickPrimary(accounts);
  // The `account` picker only applies when viewing your own accounts.
  if (accountValue && targetUser.id === interaction.user.id) {
    const chosen = accounts.find(
      (a) => String(a.player.summonerId) === accountValue,
    );
    if (chosen) account = chosen;
  }

  return { targetUser, account, accounts };
}

/** Autocomplete responder for the self-scoped `account` option. */
export async function respondAccountAutocomplete(interaction, ctx) {
  const focused = interaction.options.getFocused().toLowerCase();
  const accounts = await listAccounts(
    ctx,
    interaction.guildId,
    interaction.user.id,
  );
  const choices = accounts.map(({ player, summoner }) => ({
    name: (
      player.nickname ||
      `${summoner.riotId.gameName}#${summoner.riotId.tagLine} (${summoner.platform})`
    ).slice(0, 100),
    value: String(player.summonerId),
  }));
  await interaction.respond(
    choices.filter((c) => c.name.toLowerCase().includes(focused)).slice(0, 25),
  );
}
