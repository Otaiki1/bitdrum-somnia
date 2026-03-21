import os
from dotenv import load_dotenv
from typing import TypedDict, Annotated, List, Union
from langgraph.graph import StateGraph, END
from langchain_openai import ChatOpenAI
from langchain_core.messages import BaseMessage, HumanMessage, ToolMessage
from tools import bitdrum_tools
from memory import get_episodic_memory

load_dotenv()

# Define the state for our agent
class AgentState(TypedDict):
    messages: Annotated[List[BaseMessage], lambda x, y: x + y]

# Initialize the LLM (GPT-4o or Claude 3.5 Sonnet recommended)
llm = ChatOpenAI(model="gpt-4o", temperature=0)

# Bind tools to the LLM
llm_with_tools = llm.bind_tools(bitdrum_tools)

# Define the nodes for the LangGraph
def call_model(state: AgentState):
    messages = state['messages']
    response = llm_with_tools.invoke(messages)
    return {"messages": [response]}

def call_tools(state: AgentState):
    messages = state['messages']
    last_message = messages[-1]
    
    tool_calls = last_message.tool_calls
    results = []
    
    for t in tool_calls:
        tool_name = t['name']
        tool_args = t['args']
        
        # Find the tool in our list
        selected_tool = next(tl for tl in bitdrum_tools if tl.name == tool_name)
        tool_result = selected_tool.invoke(tool_args)
        
        results.append(ToolMessage(
            tool_call_id=t['id'],
            content=str(tool_result)
        ))
        
    return {"messages": results}

# Define the routing logic (should we continue or end?)
def should_continue(state: AgentState):
    messages = state['messages']
    last_message = messages[-1]
    
    if hasattr(last_message, "tool_calls") and last_message.tool_calls:
        return "tools"
    return END

# Build the Graph
workflow = StateGraph(AgentState)

workflow.add_node("agent", call_model)
workflow.add_node("tools", call_tools)

workflow.set_entry_point("agent")

workflow.add_conditional_edges(
    "agent",
    should_continue,
    {
        "tools": "tools",
        END: END
    }
)

workflow.add_edge("tools", "agent")

# Compile the graph
agent_executor = workflow.compile()

async def generate_signal(market_id: str):
    """
    Runs the ReAct loop to generate a signal for a specific market.
    """
    memory = get_episodic_memory()
    memory_context = ""
    if memory:
        memory_context = "\nYour past performance history (Episodic Memory):\n"
        for entry in memory[-5:]: # Last 5 outcomes
            memory_context += f"- Market {entry['market_id']}: Predicted {entry['predicted_direction']}, Outcome {entry['actual_outcome']} (Accurate: {entry['was_accurate']})\n"

    prompt = f"""
    Analyze the current market conditions for BitDrum Market ID: {market_id}.
    {memory_context}
    
    You must:
    1. Check the current BTC price.
    2. Analyze the UP/DOWN pool ratio.
    3. Check the positioning of top traders.
    4. Provide a Bullish, Bearish, or Neutral signal with a confidence score (0-100) and rationale.
    
    IMPORTANT: Reflect on your past performance history if available. If you have been inaccurate on similar pool ratios, adjust your reasoning.
    """
    
    inputs = {"messages": [HumanMessage(content=prompt)]}
    result = await agent_executor.ainvoke(inputs)
    
    # Return the final message content
    return result['messages'][-1].content
