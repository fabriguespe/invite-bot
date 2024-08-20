import { HandlerContext, User } from "@xmtp/message-kit";

import { getRedisClient } from "../lib/redis.js";
const redisClient = await getRedisClient();

export async function handler(context: HandlerContext) {
  const {
    message: {
      sender,
      content: { content: text, params },
    },
  } = context;

  const admins = [
    "0xDce2b51e3FAb3373081a03B6B36e1091e9fE427D",
    "0x277C0dd35520dB4aaDDB45d4690aB79353D3368b",
    "0x93E2fc3e99dFb1238eB9e0eF2580EFC5809C7204",
    "0x632dd787696585f656d0cba5a052f2276cc98252",
    "0x6a03c07f9cb413ce77f398b00c2053bd794eca1a",
    "0xdeb70b622b32cc3a781bc00910c385cb00574a8a",
  ];
  if (!admins.includes(sender.address)) {
    await context.send("You are not authorized to use this command");
    return;
  }
  if (params.address) {
    await redisClient.del(params.address);
    await context.send("Waitlist reset for " + params.address);
  }
}
