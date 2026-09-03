import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { AI_MODEL, getGateway } from "./ai-gateway.server";


function extractJson(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = (fenced ? fenced[1] : text).trim();
  const start = raw.search(/[[{]/);
  const end = Math.max(raw.lastIndexOf("}"), raw.lastIndexOf("]"));
  return JSON.parse(start >= 0 && end > start ? raw.slice(start, end + 1) : raw);
}

async function generateJson<T>(opts: {
  schema: z.ZodType<T>;
  shape: string;
  system: string;
  prompt: string;
}): Promise<T> {
  const gateway = getGateway();
  const { text } = await generateText({
    model: gateway(AI_MODEL),
    system: `${opts.system}\n\nReply with JSON only, no prose and no code fences, matching exactly this shape:\n${opts.shape}`,
    prompt: opts.prompt,
  });
  return opts.schema.parse(extractJson(text));
}

const EmailInput = z.object({
  tone: z.enum(["Formal", "Informal", "Persuasive"]),
  audience: z.enum(["Client", "Manager", "Team"]),
  keyPoints: z.string().min(3).max(4000),
  senderName: z.string().max(80).optional(),
});

export const generateEmail = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => EmailInput.parse(input))
  .handler(async ({ data }) => {
    const gateway = getGateway();
    const result = await generateText({
      model: gateway(AI_MODEL),
      output: Output.object({
        schema: z.object({
          subject: z.string(),
          greeting: z.string(),
          body: z.array(z.string()).min(1).max(5),
          signOff: z.string(),
        }),
      }),
      system:
        "You write workplace emails. Match the requested tone and audience exactly. " +
        "Formal = precise and courteous. Informal = warm and conversational. Persuasive = confident with a clear ask. " +
        "Client = polished and outcome-focused. Manager = concise, status and impact first. Team = direct and collaborative. " +
        "Never invent facts beyond the key points; keep the body to 2-4 short paragraphs.",
      prompt: `Tone: ${data.tone}\nAudience: ${data.audience}\nSender name: ${data.senderName || "the sender"}\nKey points:\n${data.keyPoints}`,
    });
    return result.output;
  });

const NotesInput = z.object({ notes: z.string().min(10).max(20000) });

export const summarizeNotes = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => NotesInput.parse(input))
  .handler(async ({ data }) => {
    const gateway = getGateway();
    const result = await generateText({
      model: gateway(AI_MODEL),
      output: Output.object({
        schema: z.object({
          keyPoints: z.array(z.string()),
          decisions: z.array(z.string()),
          actionItems: z.array(
            z.object({
              task: z.string(),
              owner: z.string().describe("Responsible person, or 'Unassigned'"),
              due: z.string().describe("Deadline if mentioned, else 'No date'"),
            }),
          ),
          deadlines: z.array(z.string()),
        }),
      }),
      system:
        "You summarize meeting notes and transcripts. Extract only what the notes support; never invent owners or dates. " +
        "Use short, scannable phrasing. Leave an array empty if nothing applies.",
      prompt: data.notes,
    });
    return result.output;
  });

const PlanInput = z.object({
  range: z.enum(["Daily", "Weekly", "Custom"]),
  customDays: z.number().int().min(1).max(14).optional(),
  tasks: z
    .array(
      z.object({
        title: z.string().min(1).max(200),
        deadline: z.string().max(40).optional(),
        importance: z.enum(["High", "Medium", "Low"]),
        estimate: z.string().max(40).optional(),
      }),
    )
    .min(1)
    .max(40),
});

export const buildPlan = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => PlanInput.parse(input))
  .handler(async ({ data }) => {
    const gateway = getGateway();
    const today = new Date().toISOString().slice(0, 10);
    const span =
      data.range === "Daily" ? 1 : data.range === "Weekly" ? 7 : (data.customDays ?? 3);
    const result = await generateText({
      model: gateway(AI_MODEL),
      output: Output.object({
        schema: z.object({
          days: z
            .array(
              z.object({
                label: z.string().describe("e.g. 'Mon 8 Sep · Today'"),
                items: z.array(
                  z.object({
                    priority: z.enum(["P1", "P2", "P3"]),
                    title: z.string(),
                    time: z.string().describe("Suggested slot, e.g. '09:00'"),
                    note: z.string().describe("Short reason for the placement"),
                  }),
                ),
              }),
            )
            .min(1),
          rationale: z.string(),
        }),
      }),
      system:
        "You are a scheduling planner. Distribute tasks across the requested number of days starting today. " +
        "Prioritize by deadline proximity first, then importance, then effort. P1 = urgent+important. " +
        "Front-load anything due soonest. Keep each day realistic (max 5 items). Give one short rationale sentence.",
      prompt: `Today: ${today}\nPlan span: ${span} day(s) (${data.range})\nTasks:\n${data.tasks
        .map(
          (t) =>
            `- ${t.title} | deadline: ${t.deadline || "none"} | importance: ${t.importance} | estimate: ${t.estimate || "unknown"}`,
        )
        .join("\n")}`,
    });
    return result.output;
  });
