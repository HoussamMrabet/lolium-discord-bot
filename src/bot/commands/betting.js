import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { isAdmin } from '../utils/permissions.js';
import { listAccounts, pickPrimary } from '../utils/accounts.js';
import { errorReply, successReply, replyEphemeral } from '../utils/reply.js';
import { isAppError } from '../../core/errors.js';
import {
  MARKET_QUESTIONS,
  bettingLeaderboardEmbed,
  liveGameEmbed,
} from '../../embeds/builders/bettingEmbeds.js';

const MARKET_CHOICES = [
  { name: 'Win the game', value: 'winner' },
  { name: 'Int / feed', value: 'inter' },
  { name: 'Most damage on team', value: 'topDamage' },
  { name: 'Most deaths on team', value: 'mostDeaths' },
];

async function bettingEnabled(ctx, guildId) {
  const settings = await ctx.repositories.guildSettings.getByGuild(guildId);
  return Boolean(settings?.features?.betting);
}

export default {
  guildOnly: true,

  data: new SlashCommandBuilder()
    .setName('betting')
    .setDescription('Bet fake gold on tracked players’ live games.')
    .addSubcommand((s) =>
      s
        .setName('place')
        .setDescription('Place a bet on a player’s current live game.')
        .addUserOption((o) =>
          o.setName('player').setDescription('The player to bet on').setRequired(true),
        )
        .addStringOption((o) =>
          o
            .setName('market')
            .setDescription('What to bet on')
            .setRequired(true)
            .addChoices(...MARKET_CHOICES),
        )
        .addStringOption((o) =>
          o
            .setName('prediction')
            .setDescription('Will it happen?')
            .setRequired(true)
            .addChoices({ name: 'Yes', value: 'yes' }, { name: 'No', value: 'no' }),
        )
        .addIntegerOption((o) =>
          o
            .setName('amount')
            .setDescription('Gold to stake')
            .setRequired(true)
            .setMinValue(1),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName('live')
        .setDescription('Check a player’s live game and open markets.')
        .addUserOption((o) =>
          o.setName('player').setDescription('Player (defaults to you)'),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName('balance')
        .setDescription('Show a betting balance.')
        .addUserOption((o) => o.setName('user').setDescription('Whose balance (defaults to you)')),
    )
    .addSubcommand((s) =>
      s.setName('leaderboard').setDescription('Show the betting leaderboard.'),
    )
    .addSubcommandGroup((g) =>
      g
        .setName('season')
        .setDescription('Manage the betting season.')
        .addSubcommand((s) =>
          s.setName('reset').setDescription('Reset balances and start a new season (admin).'),
        ),
    ),

  async execute(interaction, ctx) {
    const group = interaction.options.getSubcommandGroup(false);
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId;
    const { betting } = ctx.services;

    if (group === 'season' && sub === 'reset') {
      if (!isAdmin(interaction)) {
        return errorReply(interaction, 'You need **Manage Server** to reset the season.');
      }
      const { previous, current } = await betting.resetSeason(guildId);
      return successReply(
        interaction,
        `Betting season reset: **${previous} → ${current}**. Everyone starts fresh.`,
      );
    }

    if (sub === 'balance') {
      const user = interaction.options.getUser('user') ?? interaction.user;
      const wallet = await betting.getWallet(guildId, user.id);
      const who = user.id === interaction.user.id ? 'You have' : `${user.username} has`;
      return replyEphemeral(
        interaction,
        `💰 ${who} **${wallet.balance}** gold (season ${wallet.seasonId}).`,
      );
    }

    if (sub === 'leaderboard') {
      const [entries, seasonId] = await Promise.all([
        betting.leaderboard(guildId),
        betting.getSeasonId(guildId),
      ]);
      return interaction.reply({ embeds: [bettingLeaderboardEmbed({ entries, seasonId })] });
    }

    // place / live both need betting enabled + a live game lookup.
    if (!(await bettingEnabled(ctx, guildId))) {
      return errorReply(
        interaction,
        'Betting is disabled here. An admin can enable it with `/settings feature betting on`.',
      );
    }

    const player = interaction.options.getUser('player') ?? interaction.user;
    const account = pickPrimary(await listAccounts(ctx, guildId, player.id));
    if (!account) {
      return errorReply(interaction, `${player.username} has no linked accounts in this server.`);
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const game = await ctx.riot.getActiveGame({
      puuid: account.summoner.puuid,
      platform: account.summoner.platform,
    });
    if (!game) {
      return interaction.editReply(`${player.username} isn’t in a live game right now.`);
    }

    if (sub === 'live') {
      const open = betting.isWindowOpen(game.gameStartTime ?? 0);
      return interaction.editReply({
        embeds: [liveGameEmbed({ targetUser: player, summoner: account.summoner, open })],
      });
    }

    // place
    try {
      const market = interaction.options.getString('market', true);
      const prediction = interaction.options.getString('prediction', true) === 'yes';
      const amount = interaction.options.getInteger('amount', true);

      const { wallet } = await betting.placeBet({
        guildId,
        discordUserId: interaction.user.id,
        subjectSummonerId: account.summoner._id,
        gameId: String(game.gameId),
        gameStartTime: game.gameStartTime ?? 0,
        market,
        prediction,
        stake: amount,
      });

      return interaction.editReply(
        `✅ Bet placed: **${amount}** gold on *${MARKET_QUESTIONS[market]}* → **${prediction ? 'Yes' : 'No'}** for ${player.username}. Balance: **${wallet.balance}**.`,
      );
    } catch (err) {
      if (isAppError(err)) return interaction.editReply(`⚠️ ${err.message}`);
      ctx.log?.error({ err }, 'bet failed');
      return interaction.editReply('⚠️ Could not place that bet right now.');
    }
  },
};
