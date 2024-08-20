import type { CommandGroup } from "@xmtp/message-kit";

export const commands: CommandGroup[] = [
  {
    name: "Admin",
    icon: "�",
    description: "Commands for users.",
    commands: [
      {
        command: "/reset [address]",
        description: "Reset the waitlist.",
        params: {
          address: {
            default: "",
            type: "address",
          },
        },
      },
    ],
  },
];
