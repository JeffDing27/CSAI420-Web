import { describe, it, expect, beforeEach } from 'vitest';
import { stediAgentApp } from '@/utils/langgraph-agent';
import { HumanMessage } from '@langchain/core/messages';

describe('Week 6: LangGraph Agent Integration', () => {
  beforeEach(() => {
    process.env.OPENAI_ENABLED = 'false';
  });

  it('compiles and executes the graph with mock model', async () => {
    const initialState = { messages: [new HumanMessage("Hello")] };
    const finalState = await stediAgentApp.invoke(initialState);
    
    expect(finalState.messages.length).toBe(2);
    expect(finalState.messages[1].content).toContain('Mocked AI');
  });

  it('retrieves context for STEDI related queries', async () => {
    const initialState = { messages: [new HumanMessage("What is STEDI?")] };
    const finalState = await stediAgentApp.invoke(initialState);
    
    expect(finalState.context).toBe('STEDI is a platform for fall risk assessment.');
    expect(finalState.messages[1].content).toContain('Mocked AI using context');
  });
});
