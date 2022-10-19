import { APIEmbed, Message } from "discord.js";
import { ActionCount } from "../../../db/schemas/ActionCounts";
import { client } from "../../../index";
import {
  DetailedAction,
  DetailedActionNames,
  SimpleActionNames,
} from "../../../typings/client";
import { ActionCommandType } from "../../../typings/Command";

const commaFormatter = new Intl.ListFormat("en", {
  style: "long",
  type: "conjunction",
});

export const prepareSimpleEmbed = async (
  message: Message,
  action: SimpleActionNames,
  gifs?: Array<string>
): Promise<APIEmbed> => {
  const { embed_details } = client.constants.action_embeds[action];
  const { color, title } = embed_details;
  const gif = gifs?.length
    ? gifs[Math.floor(Math.random() * gifs.length)]
    : await client.helpers.getActionGIF(action);
  return {
    title: title.replace("{author}", message.author.username),
    color: parseInt(color, 16),
    image: {
      url: gif,
    },
  };
};

const getUsers = async (
  message: Message,
  args: Array<string>
): Promise<Array<{ id: string; name: string }> | null> => {
  let users: Array<{ id: string; name: string }>;
  if (message.mentions.users.size) {
    users = message.mentions.members.map((u) => ({
      id: u.id,
      name: u.nickname || u.user.username,
    }));
  } else {
    const query = args.join(" ");
    if (query) {
      const queriedUser = (
        await client.helpers.findUsersFromGuild({
          query,
          guild: message.guild,
        })
      ).first();
      if (queriedUser) {
        users = [
          {
            id: queriedUser.id,
            name: queriedUser.nickname || queriedUser.user.username,
          },
        ];
      }
    }
  }
  if (!users) {
    const user = args[0];
    if (user && user.length === 18) {
      const fetchedUser = await client.users.fetch(user);
      if (fetchedUser) {
        users = [
          {
            id: fetchedUser.id,
            name: fetchedUser.username,
          },
        ];
      }
    }
  }
  return users;
};

export const prepareDetailedEmbed = async (
  message: Message,
  action: DetailedActionNames,
  args: Array<string>,
  gifs?: string[]
): Promise<APIEmbed | false> => {
  const mentions = await getUsers(message, args);
  if (!mentions) return false;

  const data = client.constants.action_embeds[action];
  if (!data) return;

  const { embed_details } = data;

  const gif = gifs?.length
    ? gifs[Math.floor(Math.random() * gifs.length)]
    : await client.helpers.getActionGIF(action);
  const authorUsername = message.member.nickname || message.author.username;

  let embed: APIEmbed;
  const { title, footer } = embed_details;

  if (mentions.length === 1) {
    const isAuthor = mentions[0].id === message.author.id;
    let user = await ActionCount.findOne({ userID: message.author.id });
    if (!user)
      user = await ActionCount.initialiseActionCountInDB(message.author.id);
    const currentActionCount = await user.increaseActionCountByOne(
      action,
      mentions[0].id
    );
    const victimUsername = mentions[0].name;
    const embed_title = isAuthor
      ? title.self.replace("{author}", authorUsername)
      : title.normal
          .replace("{author}", authorUsername)
          .replace("{victim}", victimUsername);
    embed = {
      title: embed_title,
      color: parseInt(embed_details.color, 16),
      image: {
        url: gif,
      },
      footer: {
        text: footer
          .replace("{victim}", !isAuthor ? victimUsername : "yourself")
          .replace("{count}", String(currentActionCount))
          .replace("{t}", currentActionCount !== 1 ? "times" : "time"),
      },
    };
  } else {
    const allMentionsCombined = commaFormatter.format(
      mentions.map((user) => {
        if (user.id === message.author.id) return "themselves";
        return user.name;
      })
    );

    embed = {
      title: title.normal
        .replace("{author}", authorUsername)
        .replace("{victim}", allMentionsCombined),
      color: parseInt(embed_details.color, 16),
      image: {
        url: gif,
      },
    };

    if (message.mentions.users.has(message.author.id)) {
      embed.footer = {
        text: "themselves as well.. somehow..",
      };
    }
  }
  return embed;
};

export const constructAllActions = () => {
  const detailedActions: Record<DetailedActionNames, string[]> = {
    bite: [],
    cuddle: [],
    dance: [],
    feed: [],
    hug: [],
    kiss: [],
    pat: [],
    poke: [],
    slap: [],
    tickle: [],
    fluff: [],
    lick: [],
    kick: [],
    shoot: [],
    stare: [],
    yeet: [],
    punch: [],
  };

  const simpleActions: { [key: string]: Array<string> } = {
    blush: [],
    cry: [],
    smile: [],
    pout: [],
    sleep: [],
    think: [],
    wave: [],
  };

  const actions: Array<ActionCommandType> = [];

  for (const a in detailedActions) {
    const action = a as DetailedActionNames;
    const cmd: ActionCommandType = {
      name: action,
      aliases: [],
      async run({ client, message, args }) {
        const embed = await prepareDetailedEmbed(
          message,
          action,
          args,
          this.gifs
        );

        const { error_messages } = client.constants.action_embeds[
          this.name
        ] as DetailedAction;

        if (!embed) return message.reply(error_messages.NO_USER);

        return message.reply({ embeds: [embed] });
      },
    };
    if (detailedActions[action].length)
      cmd["gifs"] = [...detailedActions[action]];

    actions.push(cmd);
  }

  for (const a in simpleActions) {
    const action = a as SimpleActionNames;
    actions.push({
      name: action,
      aliases: [],
      run: async ({ message }) => {
        const embed = await prepareSimpleEmbed(message, action);
        return message.reply({ embeds: [embed] });
      },
    });
  }

  return actions;
};
