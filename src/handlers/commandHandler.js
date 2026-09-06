// src/handlers/commandHandler.js
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { Collection } from "discord.js";

export async function loadModularCommands(client) {
  client.commands = new Collection();
  const modularCommandsData = [];

 
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const commandsPath = path.join(__dirname, "../commands");

  if (!fs.existsSync(commandsPath)) return [];


  const commandFolders = fs.readdirSync(commandsPath);

  for (const folder of commandFolders) {
    const folderPath = path.join(commandsPath, folder);
    if (!fs.statSync(folderPath).isDirectory()) continue;

  
    const commandFiles = fs
      .readdirSync(folderPath)
      .filter((file) => file.endsWith(".js"));

    for (const file of commandFiles) {
      const filePath = path.join(folderPath, file);
  
      const fileUrl = pathToFileURL(filePath).href;

      const command = await import(fileUrl);

      if ("data" in command && "execute" in command) {
        client.commands.set(command.data.name, command);
        modularCommandsData.push(command.data.toJSON());
        console.log(`[COMMAND LOADED] 🟢 /${command.data.name}`);
      } else {
        console.log(
          `[COMMAND SKIPPED] 🟡 File ${file} bukan format modular yang valid.`,
        );
      }
    }
  }

  return modularCommandsData; 
}
