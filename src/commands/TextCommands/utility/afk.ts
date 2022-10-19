import { TextCommand } from "../../../structures/Command";
import { AFK } from "../../../db/schemas/AFK";
import dayjs from "dayjs";
import { APIEmbed } from "discord.js";
import { client } from "../../../index";

export default new TextCommand({
  name: "afk",
  aliases: ["setafk"],
  run: async ({ message, args }) => {
    const afk = await AFK.findOne({
      userID: message.author.id,
      guildID: message.guildId,
    });

    const embed: APIEmbed = {
      color: parseInt(client.constants.embed_colours.default, 16),
    };

    if (!afk) {
      const nAfk = await new AFK({
        userID: message.author.id,
        guildID: message.guildId,
        message: args.join(" "),
        timestampSince: dayjs().unix(),
      }).save();
      embed.description = `<@${nAfk.userID}> is going AFK!\n`;
      embed.description += nAfk.message;
    } else {
      afk.timestampSince = dayjs().unix();
      afk.message = args.join(" ");
      embed.description = `Updated <@${afk.userID}>'s AFK message\n`;
      embed.description += afk.message;
      await afk.save();
    }

    return message.reply({ embeds: [embed] });
  },
});
