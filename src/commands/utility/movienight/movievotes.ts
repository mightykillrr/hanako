import { ApplicationCommandOptionType } from "discord.js";
import { Command } from "../../../structures/Command";
import { prepareVotesEmbed } from "./collectors";

export default new Command({
  name: "checkmovievotes",
  description: "Get votes for a movie night",
  ephemeral: true,
  options: [
    {
      name: "message_id",
      description: "Enter the message ID of the Movie Night",
      required: true,
      type: ApplicationCommandOptionType.String,
    },
  ],
  run: async ({ client, interaction }) => {
    const { movienight } = client.constants;
    const { user } = interaction;

    if (!movienight.allowed_mnight_users_id.includes(user.id))
      throw new Error("You're not allowed to use this command!");

    const messageID = interaction.options.get("message_id")?.value as string;

    const embed = await prepareVotesEmbed(messageID);
    if (typeof embed === "string") {
      await interaction.followUp({
        content: embed,
      });
    } else {
      await interaction.followUp({
        embeds: [embed],
      });
    }
  },
});
