import {
  APIEmbed,
  CommandInteraction,
  CommandInteractionOption,
  ComponentType,
  EmbedBuilder,
  Message,
} from "discord.js";
import moment from "moment";
import { Schema } from "mongoose";
import { client } from "../../../../index";
import { MovieNight, MovieNights } from "../../../../db/schemas/MovieNights";
import { MovieVote, MovieVotes } from "../../../../db/schemas/MovieVotes";
import { ExtendedClient } from "../../../../structures/Client";
import { Logger } from "../../../../structures/Logger";

const updateCollectorTimings = async () => {
  const currentTime = moment();
  const aliveNights = await MovieNights.find({
    timeEnds: { $gte: currentTime.unix() },
  });
  if (!aliveNights.length) return;
  aliveNights.forEach((movieNight) => {
    const remainingTime = moment
      .unix(movieNight.timeEnds)
      .diff(currentTime, "milliseconds");

    void addMovieNightCollector(
      movieNight.messageID,
      client,
      remainingTime,
      movieNight.channelID
    );
  });
};

const addMovieNightCollector = async (
  messageData: string | Message,
  client: ExtendedClient,
  time: number,
  channelID?: string
): Promise<void> => {
  try {
    let message: Message;
    if (typeof messageData === "string") {
      message = await client.getMessage(messageData, channelID);
      if (!message) return;
    } else {
      message = messageData;
    }
    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time,
    });
    const [movieData] = await MovieNights.find({ messageID: message.id });

    collector.on("collect", async (i) => {
      await i.deferReply({ ephemeral: true });

      const vote = await addMovieVote({
        messageID: message.id,
        user: {
          userID: i.user.id,
          username: i.user.username,
          hash: i.user.discriminator,
        },
        movieID: i.customId,
      } as MovieVote);

      if (vote === null) {
        await i.followUp({
          content: `Your vote was added! Thank you for voting!`,
        });
      } else {
        await i.followUp({
          content: "Your vote was updated!",
        });
      }
    });

    collector.on("end", async () => {
      //Edit old movie night message
      const row = {
        type: 1,
        components: movieData.movies.map((i) => ({
          type: 2,
          style: 1,
          label: i.name,
          custom_id: i.movieID,
          disabled: true,
        })),
      };
      const embed = new EmbedBuilder(message.embeds[0].data).setFooter({
        text: client.constants.movienight.embed_texts.footer_since,
      });
      await message.edit({
        content: client.constants.movienight.messages.message_on_finish,
        components: [row],
        embeds: [embed],
      });
      // Send message to owners
      await sendMessageToOwners(await prepareVotesEmbed(message.id));
    });
  } catch (e) {
    Logger.error(e as Error);
  }
};

type MovieVoteFromDB = Promise<
  Array<
    Array<
      MovieVote & {
        _id: Schema.Types.ObjectId;
      }
    >
  >
>;
const getVotes = async (messageID: string): MovieVoteFromDB => {
  const [movie1Votes, movie2Votes, movie3Votes] = await Promise.all([
    MovieVotes.find({ messageID, movieID: "first_movie" }).exec(),
    MovieVotes.find({ messageID, movieID: "second_movie" }).exec(),
    MovieVotes.find({ messageID, movieID: "third_movie" }).exec(),
  ]);
  return [movie1Votes, movie2Votes, movie3Votes];
};

const sendMessageToOwners = async (embed: APIEmbed) => {
  try {
    const owners = process.env.botOwners
      .split(",")
      .map((owner) => client.users.fetch(owner));
    await Promise.all(
      owners.map(
        async (owner) =>
          await (
            await owner
          ).send({
            content:
              client.constants.movienight.messages.owner_message_on_finish,
            embeds: [embed],
          })
      )
    );
  } catch (e) {
    Logger.error(e as Error);
  }
};

const prepareVotesEmbed = async (messageID: string): Promise<APIEmbed> => {
  const movieNight = await MovieNights.findOne({ messageID }).exec();
  if (!movieNight)
    return { description: "The requested movie night was not found!" };

  const { movies } = movieNight;
  const movieVotes = await getVotes(messageID);

  const movieDataMessage: string = movies
    .map((movie, i) => {
      const voters = movieVotes[i].length
        ? movieVotes[i]
            .map((vote) => {
              const { user } = vote;
              return `${user.username}#${user.hash}`;
            })
            .join(", ")
        : "No votes yet!";
      let text = "";
      text += `**${movie.name}\n**`;
      text += `Votes: \`${movieVotes[i].length}\`\n`;
      text += `Voters: ||\`${voters}\`||`;
      return text;
    })
    .join("\n\n");

  const { embed_texts } = client.constants.movie_votes;

  return {
    title: embed_texts.title,
    description: embed_texts.description + movieDataMessage,
  };
};

const sendMovieNightEmbed = async (
  interaction: CommandInteraction,
  embedData: APIEmbed,
  movies: readonly CommandInteractionOption[]
): Promise<Message> =>
  await interaction.channel.send({
    embeds: [embedData],
    components: [
      {
        type: 1,
        components: movies.map((i) => ({
          type: 2,
          style: 1,
          label: String(i.value),
          custom_id: i.name,
        })),
      },
    ],
  });

const addMovieVote = async (movieVote: MovieVote) => {
  return MovieVotes.findOneAndUpdate(
    {
      user: {
        userID: movieVote.user.userID,
        username: movieVote.user.username,
        hash: movieVote.user.hash,
      },
      messageID: movieVote.messageID,
    },
    movieVote,
    {
      upsert: true,
    }
  );
};

const addMovieNightToDB = async (movieNight: MovieNight) => {
  try {
    const mnight = new MovieNights(movieNight);
    return mnight.save();
  } catch (e) {
    Logger.error(e as Error);
  }
};

export {
  addMovieNightCollector,
  updateCollectorTimings,
  sendMovieNightEmbed,
  addMovieNightToDB,
  getVotes,
  prepareVotesEmbed,
};