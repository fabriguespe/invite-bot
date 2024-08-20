import { HandlerContext, User } from "@xmtp/message-kit";

import { getRedisClient } from "../lib/redis.js";
const redisClient = await getRedisClient();

export async function handler(context: HandlerContext) {
  const {
    message: {
      content,
      content: { content: text, params },
    },
  } = context;
  console.log(content);
  if (params.address) {
    await redisClient.del(params.address);
    await context.send("Waitlist reset for " + params.address);
  }
}
