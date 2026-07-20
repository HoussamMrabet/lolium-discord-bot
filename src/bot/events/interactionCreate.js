import { Events } from 'discord.js';
import {
  handleCommand,
  handleAutocomplete,
  handleComponent,
} from '../handlers/interactionRouter.js';

/** Single entrypoint for all interactions; dispatches by interaction type. */
export default {
  name: Events.InteractionCreate,
  execute(interaction, ctx) {
    if (interaction.isChatInputCommand()) {
      return handleCommand(interaction, ctx);
    }
    if (interaction.isAutocomplete()) {
      return handleAutocomplete(interaction, ctx);
    }
    if (interaction.isMessageComponent() || interaction.isModalSubmit()) {
      return handleComponent(interaction, ctx);
    }
  },
};
