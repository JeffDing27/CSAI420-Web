# 4. LangGraph Agent Design

## AI Agent Capabilities
The project utilizes `LangGraph` to create stateful agents.

### Graph Nodes
- **Retrieve Context:** Analyzes the user's intent and fetches relevant STEDI knowledge (e.g., fall risk protocols).
- **Call Model:** Executes the LLM chain to generate a human-like response.

### State Management
State is managed across turns using `StateGraph` and `StateAnnotation`, storing message history and retrieved context, allowing the agent to answer follow-up questions accurately.
