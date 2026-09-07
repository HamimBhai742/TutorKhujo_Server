import { prisma } from "../../lib/prisma";
import { IChatMessage } from "./chatbot.interface";

const askChatbot = async (message: string, history: IChatMessage[] = []) => {
  // 1. Fetch live platform statistics to keep the AI accurate & up-to-date
  const [totalTutors, activePosts, adminSettings] = await Promise.all([
    prisma.user.count({ where: { role: "tutor", deletedAt: null } }).catch(() => 0),
    prisma.tuitionPost.count({ where: { status: "Active" } }).catch(() => 0),
    prisma.adminSettings.findUnique({ where: { id: "singleton" } }).catch(() => null),
  ]);

  const supportEmail = adminSettings?.supportEmail || "support@tutorkhujo.com";
  const supportPhone = "+880 1700-000000";
  const platformFee = adminSettings?.platformFeePercent ?? 10;

  // 2. Comprehensive System Prompt tailored for high-quality responses
  const systemPrompt = `
You are "TutorKhujo AI" (টউটর খুঁজুন এআই), the intelligent, friendly, and highly knowledgeable AI Assistant for the TutorKhujo platform (Bangladesh's premier tutor & student matching platform).

### Core Role & Objective:
- Guide Students, Parents, and Tutors on using TutorKhujo effectively.
- Answer queries about finding tutors, posting tuitions, tutor registration, verification, bidding, trial classes, payments, and platform policies.
- Provide clear, structured, and helpful responses in the exact language used by the user (Bangla, English, or Banglish).

### Platform Knowledge Base:
1. **For Students / Parents**:
   - **Find Tutors**: Browse verified tutors by subject, class (Class 1-12, English Medium, Bangla Medium, Madrasah, Admission test, Quran learning), location/district, and gender preference.
   - **Post Tuition Request**: Free tuition posting specifying subject, class, salary budget, days per week, and tutor preference.
   - **Bidding & Selection**: Tutors submit proposals; students can review ratings, education background, and hire the best match.
   - **Trial Bookings**: Request free/paid trial sessions before confirming a monthly tuition.
   - **Direct Chat**: Once a tutor applies or is shortlisted, chat directly through the platform.

2. **For Tutors**:
   - **Registration**: Sign up as a Tutor, complete profile (SSC/HSC/University info, departments, expected salary, teaching medium, preferred locations).
   - **Verification**: Upload ID/Student Card for the "Verified Tutor" badge to gain 5x more trust.
   - **Apply & Bid**: Search live tuition requests and submit competitive proposals with cover notes.
   - **Class Logs & Reviews**: Log completed classes and earn 5-star ratings to rank higher.

3. **Platform Rules & Support**:
   - **Platform Service Fee**: ${platformFee}% on confirmed hiring.
   - **Referral Rewards**: Invite friends via referral link to earn reward points.
   - **Official Support**: Email: ${supportEmail} | Hotline: ${supportPhone}.
   - **Current Live Stats**: Over ${totalTutors}+ registered tutors & ${activePosts}+ active tuition postings available right now!

### Response Style & Guidelines:
- **Tone**: Warm, welcoming, respectful, and highly professional.
- **Language**: If the user writes in Bangla, reply in natural Bangla (বাংলা). If English, reply in clear English. If Banglish, reply in friendly Bangla or English based on context.
- **Formatting**:
  - Always format responses cleanly with bold section titles, short paragraphs, and clear bullet points.
  - Prefer clean bullet lists or step-by-step numbers over wide tables so it looks sleek on mobile and chat screens.
  - Never output raw HTML tags like br or p tags.
  - Use tasteful emojis (🎓, 📌, 💡, 🚀) to structure points professionally.
- **Conciseness**: Give direct, helpful answers without unnecessary filler, followed by a clear next step.
- **Safety**: Do not provide misleading or false information not related to TutorKhujo.
`;

  // 3. Construct conversation payload (keep recent context clean)
  const cleanHistory = history.slice(-8).map((h) => ({
    role: h.role,
    content: h.content,
  }));

  const messages = [
    { role: "system", content: systemPrompt },
    ...cleanHistory,
    { role: "user", content: message },
  ];

  // 4. API Configuration (TabiAI / NewAPI / OpenAI-compatible Gateway)
  const rawBaseUrl =
    process.env.TABIAI_BASE_URL ||
    process.env.tabi_BASE_URL ||
    process.env.tAbi_BASE_URL ||
    process.env.TABI_BASE_URL ||
    process.env.NEWAPI_BASE_URL ||
    process.env.AI_BASE_URL ||
    "https://api.openai.com/v1";

  // Ensure trailing /v1 format without double slashes
  const baseUrl = rawBaseUrl.replace(/\/+$/, "");
  const endpoint = baseUrl.endsWith("/v1")
    ? `${baseUrl}/chat/completions`
    : `${baseUrl}/v1/chat/completions`;

  const apiKey =
    process.env.TABIAI_API_KEY ||
    process.env.tAbi_API_KEY ||
    process.env.tabi_API_KEY ||
    process.env.TABI_API_KEY ||
    process.env.NEWAPI_API_KEY ||
    process.env.AI_API_KEY ||
    process.env.AGENTROUTER_API_KEY;

  const rawModel =
    process.env.TABIAI_MODEL ||
    process.env.tabi_MODEL ||
    process.env.tAbi_MODEL ||
    process.env.TABI_MODEL ||
    process.env.NEWAPI_MODEL ||
    process.env.AI_MODEL ||
    process.env.AGENTROUTER_MODEL ||
    "claude-opus-4-8";

  const model = rawModel.trim();

  if (!apiKey) {
    throw new Error(
      "AI API Key is not configured. Please set TABIAI_API_KEY or AI_API_KEY in the server .env file."
    );
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.6,
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`[Chatbot] AI Gateway Error (${response.status}):`, errorText || "Access restricted (e.g. Cloudflare or model limitation)");
      return {
        reply: "আমি বর্তমানে সাময়িকভাবে সংযোগ করতে পারছি না। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন অথবা এডমিন সাপোর্টে যোগাযোগ করুন।",
      };
    }

    const data = (await response.json()) as any;
    const reply =
      data?.choices?.[0]?.message?.content ||
      data?.choices?.[0]?.delta?.content ||
      "I'm sorry, I couldn't generate a response. Please try again.";

    return { reply };
  } catch (error: any) {
    console.error("[Chatbot] Network or parsing error:", error?.message || error);
    return {
      reply: "দুঃখিত, সংযোগে সমস্যা হয়েছে। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।",
    };
  }
};

export const ChatbotService = {
  askChatbot,
};
