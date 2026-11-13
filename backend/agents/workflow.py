import re
import logging
from typing import TypedDict, List, Dict, Any, Optional
from langgraph.graph import StateGraph, END
from backend.ai.rag import execute_rag, retrieve_relevant_chunks
from backend.agents.tools import (
    create_support_ticket,
    submit_remote_work_request,
    check_leave_balance
)
from backend.ai.llm import get_llm
from langchain_core.messages import SystemMessage, HumanMessage

logger = logging.getLogger("enterprise_ai.workflow")

class AgentWorkflowState(TypedDict):
    query: str
    user_email: str
    intent: str  # "KNOWLEDGE_QUERY", "BUSINESS_ACTION", "HYBRID"
    rag_context: List[Dict[str, Any]]
    rag_answer: Optional[str]
    citations: List[Dict[str, Any]]
    tool_results: List[Dict[str, Any]]
    final_response: str

# -------------------------------------------------------------
# LangGraph Node 1: Request Router
# -------------------------------------------------------------
def router_node(state: AgentWorkflowState) -> Dict[str, Any]:
    query = state["query"].lower()

    action_triggers = ["create", "raise", "open", "submit", "request", "file", "book", "apply", "ticket", "wfh"]
    knowledge_triggers = ["policy", "how many", "what is", "can i", "rules", "guideline", "entitled", "allowance", "explain", "summarize"]

    has_action = any(t in query for t in action_triggers)
    has_knowledge = any(t in query for t in knowledge_triggers)

    if has_action and has_knowledge:
        intent = "HYBRID"
    elif has_action:
        intent = "BUSINESS_ACTION"
    else:
        intent = "KNOWLEDGE_QUERY"

    logger.info(f"Router Node classified query '{state['query'][:50]}...' as: {intent}")
    return {"intent": intent}

# -------------------------------------------------------------
# LangGraph Node 2: RAG Pipeline Node
# -------------------------------------------------------------
def rag_pipeline_node(state: AgentWorkflowState) -> Dict[str, Any]:
    query = state["query"]
    logger.info(f"RAG Pipeline Node executing retrieval for: {query}")
    rag_output = execute_rag(query)
    return {
        "rag_answer": rag_output["answer"],
        "citations": rag_output["citations"],
        "rag_context": rag_output["citations"]
    }

# -------------------------------------------------------------
# LangGraph Node 3: AI Agent Predefined Tools Node
# -------------------------------------------------------------
def agent_tools_node(state: AgentWorkflowState) -> Dict[str, Any]:
    query = state["query"]
    user_email = state.get("user_email", "alex.smith@enterprise.ai")
    q_lower = query.lower()
    tool_results = []

    logger.info(f"Agent Tools Node evaluating action for: {query}")

    # Check for Support Ticket Creation
    if "ticket" in q_lower or ("cannot access" in q_lower) or ("account" in q_lower and "locked" in q_lower):
        title = "IT Support Request"
        if "access" in q_lower:
            title = "Company Account Access Locked"
            category = "Account Access"
            priority = "High"
        elif "laptop" in q_lower or "hardware" in q_lower:
            title = "Hardware Support"
            category = "Hardware"
            priority = "Medium"
        else:
            title = "General IT Support Request"
            category = "IT Support"
            priority = "Medium"

        res = create_support_ticket.invoke({
            "title": title,
            "description": query,
            "category": category,
            "priority": priority,
            "user_email": user_email
        })
        tool_results.append(res)

    # Check for Remote Work / WFH / Leave Request
    if "remote" in q_lower or "work from home" in q_lower or "wfh" in q_lower or "leave request" in q_lower:
        # Extract target date or default to Next Monday
        target_date = "Next Monday"
        if "next monday" in q_lower:
            target_date = "Next Monday"
        elif "tomorrow" in q_lower:
            target_date = "Tomorrow"
        elif "friday" in q_lower:
            target_date = "This Friday"
        elif re.search(r"\b\d{4}-\d{2}-\d{2}\b", query):
            target_date = re.search(r"\b\d{4}-\d{2}-\d{2}\b", query).group(0)

        res = submit_remote_work_request.invoke({
            "target_date": target_date,
            "reason": query,
            "user_email": user_email
        })
        tool_results.append(res)

    # Check for Leave Balance inquiry
    if ("how many" in q_lower and "leave" in q_lower) or "balance" in q_lower:
        res = check_leave_balance.invoke({"user_email": user_email})
        tool_results.append(res)

    return {"tool_results": tool_results}

# -------------------------------------------------------------
# LangGraph Node 4: Response Generation / Synthesizer Node
# -------------------------------------------------------------
def response_generation_node(state: AgentWorkflowState) -> Dict[str, Any]:
    intent = state.get("intent", "KNOWLEDGE_QUERY")
    rag_ans = state.get("rag_answer", "")
    tool_results = state.get("tool_results", [])
    query = state.get("query", "")

    parts = []

    # If RAG answered, include it
    if rag_ans:
        parts.append(rag_ans)

    # If tools executed, format their output cleanly
    if tool_results:
        action_summaries = []
        for r in tool_results:
            if isinstance(r, dict) and "message" in r:
                action_summaries.append(f"✅ **Action Executed:** {r['message']}")
            elif isinstance(r, dict) and "error" in r:
                action_summaries.append(f"❌ **Action Error:** {r['error']}")
        
        if action_summaries:
            parts.append("\n\n---\n### ⚡ Automated Business Tasks\n" + "\n".join(action_summaries))

    if not parts:
        final_text = "I received your request. Could you please specify whether you would like to search company documents or perform an action like opening a support ticket?"
    else:
        final_text = "\n\n".join(parts)

    return {"final_response": final_text}

# -------------------------------------------------------------
# Conditional Routing Function
# -------------------------------------------------------------
def route_step(state: AgentWorkflowState) -> str:
    intent = state.get("intent", "KNOWLEDGE_QUERY")
    if intent == "KNOWLEDGE_QUERY":
        return "rag_pipeline_node"
    elif intent == "BUSINESS_ACTION":
        return "agent_tools_node"
    elif intent == "HYBRID":
        return "hybrid_pipeline"
    return "rag_pipeline_node"

# -------------------------------------------------------------
# Build and Compile LangGraph Workflow
# -------------------------------------------------------------
def build_agent_graph():
    builder = StateGraph(AgentWorkflowState)

    # Add Nodes
    builder.add_node("router_node", router_node)
    builder.add_node("rag_pipeline_node", rag_pipeline_node)
    builder.add_node("agent_tools_node", agent_tools_node)
    builder.add_node("response_generation_node", response_generation_node)

    # Define Workflow Flow
    builder.set_entry_point("router_node")

    # Conditional Branching from Router
    builder.add_conditional_edges(
        "router_node",
        route_step,
        {
            "rag_pipeline_node": "rag_pipeline_node",
            "agent_tools_node": "agent_tools_node",
            "hybrid_pipeline": "rag_pipeline_node"
        }
    )

    # In hybrid mode: rag_pipeline_node leads to agent_tools_node
    # In pure knowledge mode: rag_pipeline_node leads to response_generation_node
    def after_rag_step(state: AgentWorkflowState) -> str:
        if state.get("intent") == "HYBRID":
            return "agent_tools_node"
        return "response_generation_node"

    builder.add_conditional_edges(
        "rag_pipeline_node",
        after_rag_step,
        {
            "agent_tools_node": "agent_tools_node",
            "response_generation_node": "response_generation_node"
        }
    )

    builder.add_edge("agent_tools_node", "response_generation_node")
    builder.add_edge("response_generation_node", END)

    app = builder.compile()
    return app

# Singleton compiled workflow
agent_workflow = build_agent_graph()

def run_agent_workflow(query: str, user_email: str = "alex.smith@enterprise.ai") -> Dict[str, Any]:
    """
    Executes the compiled LangGraph workflow.
    """
    initial_state: AgentWorkflowState = {
        "query": query,
        "user_email": user_email,
        "intent": "",
        "rag_context": [],
        "rag_answer": None,
        "citations": [],
        "tool_results": [],
        "final_response": ""
    }

    result = agent_workflow.invoke(initial_state)
    return {
        "response": result["final_response"],
        "intent": result["intent"],
        "citations": result.get("citations", []),
        "tool_results": result.get("tool_results", [])
    }
