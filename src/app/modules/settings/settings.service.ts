import { prisma } from "../../lib/prisma";

const getSettings = async () => {
  let settings = await prisma.adminSettings.findUnique({
    where: { id: "singleton" },
  });

  if (!settings) {
    settings = await prisma.adminSettings.create({
      data: {
        id: "singleton",
        platformFeePercent: 10,
        maintenanceMode: false,
        supportEmail: "support@tutorkhujo.com",
        smsGatewayActive: true,
        autoApproveTutors: false,
      },
    });
  }

  return settings;
};

const updateSettings = async (payload: any) => {
  let settings = await prisma.adminSettings.findUnique({
    where: { id: "singleton" },
  });

  if (!settings) {
    settings = await prisma.adminSettings.create({
      data: {
        id: "singleton",
        ...payload,
      },
    });
  } else {
    settings = await prisma.adminSettings.update({
      where: { id: "singleton" },
      data: payload,
    });
  }

  return settings;
};

export const SettingsService = {
  getSettings,
  updateSettings,
};
