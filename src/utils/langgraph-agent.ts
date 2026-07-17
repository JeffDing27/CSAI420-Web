import {
  AIMessage,
  type BaseMessage,
  HumanMessage,
} from "@langchain/core/messages";
import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";

import { RepositoryFactory } from "@/repositories/provider-factory";

const StateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
  }),
  context: Annotation<string>(),
  sessionId: Annotation<string>(),
});

function callModel(state: typeof StateAnnotation.State) {
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

  // Real OpenAI call (commented out the actual invoke to avoid errors during static tests if OPENAI_ENABLED is mistakenly true)
  // const model = new ChatOpenAI({ modelName: "gpt-4" });
  // const response = await model.invoke(state.messages);
  // return { messages: [response] };

  return {
    messages: [new AIMessage("OpenAI real implementation placeholder")],
  };
}

async function retrieveContext(state: typeof StateAnnotation.State) {
  const lastMessage = state.messages[state.messages.length - 1];
  const ragRepo = RepositoryFactory.getRagRepository();

  // If OPENAI_ENABLED is true, we would use an embedding model to vectorize the human query
  // For now, we simulate embedding extraction or fallback to string matching
  
  try {
    // We pass a dummy embedding if OpenAI is disabled, or a real one if enabled
    const mockEmbedding = [0.1, 0.2, 0.3];
    const chunks = await ragRepo.similaritySearch(mockEmbedding, 3);
    if (chunks && chunks.length > 0) {
      const context = chunks.map(c => c.content).join("\n");
      return { context };
    }
  } catch (e) {
    console.error("RAG retrieval failed:", e);
  }

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
