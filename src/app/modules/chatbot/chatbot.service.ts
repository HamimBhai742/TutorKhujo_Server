import { prisma } from "../../lib/prisma";
import { IChatMessage } from "./chatbot.interface";

const askChatbot = async (message: string, history: IChatMessage[] = []) => {
  // 1. Fetch some live platform statistics to seed chatbot knowledge
  const [totalTutors, activePosts, adminSettings] = await Promise.all([
    prisma.user.count({ where: { role: "tutor", deletedAt: null } }),
    prisma.tuitionPost.count({ where: { status: "Active" } }),
    prisma.adminSettings.findUnique({ where: { id: "singleton" } }),
  ]);

  const supportEmail = adminSettings?.supportEmail || "support@tutorkhujo.com";
  const platformFee = adminSettings?.platformFeePercent ?? 10;

  // 2. Define the comprehensive TutorKhujo system context
  const systemPrompt = `
You are the official Support Assistant for TutorKhujo (টউটর খুঁজুন), the leading online and home tutor matching platform.
Your purpose is to guide users (Students, Parents, and Tutors) and answer questions about how the platform works.

Here is essential information about TutorKhujo:
- **Tutor Onboarding & Profile**: Tutors can register, fill out details (Institutions, Department, study details, expected salary, availability, curriculums, specializations, certificates, NID/Student ID card). Admin reviews profiles. Tutors apply to posts once approved.
- **Tuition Posting**: Students/Parents post tuition requirements (Class level, subjects, budget, frequency, location, extra notes, gender preference).
- **Matching & Hiring**: Tutors submit proposals with salary bids. Students can shortlist or hire them directly.
- **Trial Bookings**: Students can request free/paid trial bookings specifying date, time slot, and subjects.
- **Class Logs**: Tutors log completed classes (duration, topics covered, date).
- **Messaging**: Direct chat is available between students and tutors once a connection/application is active.
- **Fees**: The platform fee is ${platformFee}% of the tuition value for secured tutoring.
- **Referrals**: Users can share referral links to earn points and rewards.
- **Support**: Users can reach support at ${supportEmail}.
- **Live Platform Stats**: Currently, we have ${totalTutors} registered tutors and ${activePosts} active tuition posts available on the platform!

Rules:
- Be extremely polite, professional, and helpful.
- Assist visitors in navigating the website.
- Respond in the language the user asks (Bengali or English).
- Do not make up facts or statistics not mentioned in this prompt or database stats.
`;

  // 3. Construct messages payload
  const messages: IChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...history,
    { role: "user", content: message },
  ];

  // 4. Send request to AgentRouter
  const apiKey = process.env.AGENTROUTER_API_KEY;
  const model = process.env.AGENTROUTER_MODEL || "claude-opus-4-8";

  if (!apiKey) {
    throw new Error("AGENTROUTER_API_KEY is not defined in environment variables");
  }

  const response = await fetch("https://agentrouter.org/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "User-Agent": "claude-cli/0.2.2 (external, cli)",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      messages,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `AgentRouter API request failed with status ${response.status}: ${JSON.stringify(errorData)}`
    );
  }

  const data = (await response.json()) as any;
  const reply = data?.choices?.[0]?.message?.content;

  if (!reply) {
    throw new Error("Invalid response received from AgentRouter API");
  }

  return { reply };
};

export const ChatbotService = {
  askChatbot,
};
