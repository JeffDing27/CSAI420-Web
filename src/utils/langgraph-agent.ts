import {
  AIMessage,
  type BaseMessage,
  HumanMessage,
  SystemMessage,
} from "@langchain/core/messages";
import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";

// RAG Repo imported but unused currently due to fake RAG removal
import { RepositoryFactory } from "@/repositories/provider-factory";

const StateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
  }),
  context: Annotation<string>(),
  sessionId: Annotation<string>(),
});

async function callModel(state: typeof StateAnnotation.State) {
  const systemPrompt = new SystemMessage(
    "You are a Mobility Coach providing general mobility and exercise education. " +
      "You do not diagnose conditions, and you do not replace a healthcare professional. " +
      "You must not invent personal test scores or medical records. " +
      "Recommend professional help when appropriate. Do not claim that a human coach or clinician has been contacted.",
  );

  const messages = [systemPrompt, ...state.messages];

  if (
    process.env.OPENAI_ENABLED !== "true" ||
    !process.env.OPENAI_API_KEY ||
    process.env.OPENAI_API_KEY.startsWith("sk-dummy")
  ) {
    // Mock Response
    const lastMessage = state.messages[state.messages.length - 1];
    let mockReply = `Mocked AI: I see you said "${lastMessage.content}". How can I assist you further?`;

    if (state.context) {
      mockReply = `Mocked AI using context [${state.context}]: I see you asked about "${lastMessage.content}".`;
    }

    return { messages: [new AIMessage(mockReply)] };
  }

  const model = new ChatOpenAI({
    modelName: process.env.OPENAI_MODEL || "gpt-4o-mini",
  });
  const response = await model.invoke(messages);
  return { messages: [response] };
}

async function retrieveContext(state: typeof StateAnnotation.State) {
  const lastMessage = state.messages[state.messages.length - 1];

  // Explicit development fallback: Dummy similarity search is disabled to prevent fake context
  // Real vector embeddings will be implemented in a future ticket.

  if (lastMessage.content.toString().toLowerCase().includes("stedi")) {
    return { context: "STEDI is a platform for fall risk assessment." };
  }

  return { context: "" };
}

const graphBuilder = new StateGraph(StateAnnotation)
  .addNode("retrieve", retrieveContext)
  .addNode("agent", callModel)
  .addEdge(START, "retrieve")
  .addEdge("retrieve", "agent")
  .addEdge("agent", END);

export const stediAgentApp = graphBuilder.compile();
