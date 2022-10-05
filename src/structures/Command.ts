import {
  ActionCommandType,
  SlashCommandType,
  TextCommandType,
} from "../typings/Command";

export class SlashCommand {
  constructor(commandOptions: SlashCommandType) {
    Object.assign(this, commandOptions);
  }
}

export class TextCommand {
  constructor(commandOptions: TextCommandType) {
    Object.assign(this, commandOptions);
  }
}

export class ActionTextCommand {
  constructor(commandOptions: ActionTextCommand) {
    Object.assign(this, commandOptions);
  }
}
