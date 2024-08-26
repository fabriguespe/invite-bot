import { run, HandlerContext, CommandHandlers } from "@xmtp/message-kit";
import { Client } from "@notionhq/client";
import { commands } from "./commands.js";
import { getRedisClient } from "./lib/redis.js";
import { handler as admin } from "./handler/admin.js";

// Tracks conversation steps and user data
const inMemoryCacheStep = new Map<string, number>();
const userData = new Map<
  string,
  { name?: string; company?: string; role?: string; preference?: string }
>();
const redisClient = await getRedisClient();
// Initialize Notion client
const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});
const pageId = process.env.NOTION_DATABASE_ID;

const commandHandlers: CommandHandlers = {
  "/reset": admin,
};

const appConfig = {
  commands: commands,
  commandHandlers: commandHandlers,
};

run(async (context: HandlerContext) => {
  const {
    client,
    message: {
      content: { content: text, params },
      typeId,
      sender,
    },
  } = context;

  // Check for stop word to reset steps
  if (text.toLowerCase() === "stop" || text.toLowerCase() === "reset") {
    inMemoryCacheStep.delete(sender.address);
    userData.delete(sender.address);
    await context.send(
      "Your progress has been reset. You can start over whenever you're ready."
    );
    return;
  }

  if (typeId !== "text") {
    /* If the input is not text do nothing */
    return;
  } else if (text.startsWith("/")) {
    await context.intent(text);
    return;
  }
  const step = inMemoryCacheStep.get(sender.address) || 0;
  const user = userData.get(sender.address) || {};

  const isSubscribed = await redisClient.get(sender.address);

  if (isSubscribed && text.toLowerCase() === "yes") {
    const pageId = await redisClient.get(`${sender.address}_pageId`);
    await notion.pages.update({
      page_id: pageId as string,
      properties: {
        RSVP: {
          type: "select",
          select: {
            name: "Confirmed",
          },
        },
      },
    });
    await context.send("Thank you for confirming your attendance!");
  } else if (isSubscribed) {
    await context.send(
      "You're already in the waitlist! We'll let you know soon."
    );
    await context.send(
      "Be sure to turn on notifications so you don't miss out on any updates."
    );
    await context.send(
      "Had questions or issues with the bot? Message fabri.converse.xyz"
    );
    return;
  }
  switch (step) {
    case 0:
      await context.send(
        "Welcome to X Marks The Spot! Ready for a private, meaningful experience? Let's get you set up."
      );
      await context.send("What’s your full name?");
      inMemoryCacheStep.set(sender.address, 1);
      break;
    case 1:
      user.name = text;
      userData.set(sender.address, user);
      await context.send("What project or company are you with?");
      inMemoryCacheStep.set(sender.address, 2);
      break;
    case 2:
      user.company = text;
      userData.set(sender.address, user);
      await context.send(
        "Tell us a bit more about what you do at " + user.company + "."
      );
      inMemoryCacheStep.set(sender.address, 3);
      break;
    case 3:
      user.role = text;
      userData.set(sender.address, user);
      await context.send(
        "Who would you like to see at the event from the space? You can mention their name or company."
      );
      inMemoryCacheStep.set(sender.address, 4);
      break;
    case 4:
      user.preference = text;
      userData.set(sender.address, user);
      await notion.pages.create({
        parent: {
          database_id: pageId as string,
        },
        properties: {
          Name: {
            type: "title",
            title: [
              {
                type: "text",
                text: { content: user.name as string },
              },
            ],
          },
          Company: {
            type: "rich_text",
            rich_text: [
              {
                type: "text",
                text: { content: user.company as string },
              },
            ],
          },
          Role: {
            type: "rich_text",
            rich_text: [
              {
                type: "text",
                text: { content: user.role as string },
              },
            ],
          },
          Preference: {
            type: "rich_text",
            rich_text: [
              {
                type: "text",
                text: { content: user.preference as string },
              },
            ],
          },
          Status: {
            type: "select",
            select: {
              name: "Waitlist",
            },
          },
          Address: {
            type: "rich_text",
            rich_text: [
              {
                type: "text",
                text: { content: sender.address as string },
              },
            ],
          },
        },
      });
      console.log(user);
      await redisClient.set(sender.address, "subscribed");
      await context.send(
        `Done. You are on the waitlist, ${user.name}! Since this is a small, private event, space is limited - but we are working hard to get you in.`
      );
      await context.send(
        "Be sure to turn on notifications so you don't miss out on any updates."
      );
      await context.send(
        "Had questions or issues with the bot? Message fabri.converse.xyz"
      );
      inMemoryCacheStep.delete(sender.address);
      userData.delete(sender.address);
      break;
  }
}, appConfig);
