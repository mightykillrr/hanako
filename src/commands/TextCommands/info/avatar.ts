import { APIEmbed } from "discord.js";
import dayjs from "dayjs";
import { CommandCategory, TextCommandType } from "../../../typings/command";

const command: TextCommandType = {
  name: "avatar",
  aliases: ["av", "pfp"],
  category: CommandCategory.INFO,
  async run({ message, args, client }) {
    let query = args[0]?.match(/\d{17,19}/)?.[0];
    if (!query) {
      return client.helpers.replyMessageWithError(
        message,
        client.constants.error_messages.INVALID_USER_ID,
      );
    }
    const user = await client.users.fetch(query, { force: true });

    if (!user && args[0]) {
      return client.helpers.replyMessageWithError(
        message,
        client.constants.error_messages.NO_USER_FOUND,
      );
    }
    query = message.author.id;

    const embed: APIEmbed = {
      title: `${user.username}'s avatar`,
      image: { url: user.displayAvatarURL({ size: 4096 }) },
      footer: {
        text: `Requested By: ${message.author.username}`,
        icon_url: message.author.displayAvatarURL(),
      },
      timestamp: dayjs().toISOString(),
    };

    const msg = await message.reply({ embeds: [embed] });
    return client.helpers.deleteReactionCollector(msg, message.author.id);
  },
};

export default command;
