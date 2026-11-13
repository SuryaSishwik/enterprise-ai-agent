import logging
from typing import Dict, Any, List
from backend.services.document_processor import get_chroma_collection
from backend.ai.embeddings import get_embedding_model
from backend.ai.llm import get_llm
from backend.ai.prompts import RAG_SYSTEM_PROMPT
from langchain_core.messages import SystemMessage, HumanMessage

logger = logging.getLogger("enterprise_ai.rag")

def retrieve_relevant_chunks(query: str, n_results: int = 4) -> List[Dict[str, Any]]:
    """
    Step 3 & 4 in Question Answering Workflow:
    Embeds user query and performs cosine similarity search on ChromaDB.
    """
    collection = get_chroma_collection()
    embedding_model = get_embedding_model()

    if collection.count() == 0:
        logger.warning("ChromaDB collection is empty! No documents have been indexed yet.")
        return []

    # Embed query
    query_vector = embedding_model.embed_query(query)

    # Search in ChromaDB
    results = collection.query(
        query_embeddings=[query_vector],
        n_results=min(n_results, collection.count())
    )

    retrieved_items = []
    if results and "documents" in results and results["documents"]:
        docs = results["documents"][0]
        metas = results["metadatas"][0] if "metadatas" in results else [{}] * len(docs)
        distances = results["distances"][0] if "distances" in results else [0.0] * len(docs)

        for doc_text, meta, dist in zip(docs, metas, distances):
            retrieved_items.append({
                "text": doc_text,
                "source": meta.get("source", "Unknown Document"),
                "page": meta.get("page", 1),
                "chunk_id": meta.get("chunk_id", ""),
                "distance": dist
            })

    return retrieved_items

def execute_rag(query: str) -> Dict[str, Any]:
    """
    Step 5, 6, 7 in Question Answering Workflow:
    Combines retrieved chunks + system prompt + query -> LLM generation -> returns answer + citations.
    """
    retrieved_chunks = retrieve_relevant_chunks(query, n_results=4)

    # Build context string
    context_parts = []
    citations = []

    for idx, item in enumerate(retrieved_chunks, 1):
        context_parts.append(
            f"--- Document Source: {item['source']} (Page {item['page']}) ---\n{item['text']}\n"
        )
        citations.append({
            "source": item["source"],
            "page": item["page"],
            "snippet": item["text"][:160] + "..." if len(item["text"]) > 160 else item["text"]
        })

    context_str = "\n".join(context_parts) if context_parts else "No relevant documents found."
    formatted_prompt = RAG_SYSTEM_PROMPT.format(context=context_str, question=query)

    # Send to LLM
    llm = get_llm()
    messages = [
        SystemMessage(content=formatted_prompt),
        HumanMessage(content=query)
    ]
    response = llm.invoke(messages)
    answer_text = response.content if hasattr(response, "content") else str(response)

    return {
        "answer": answer_text,
        "citations": citations,
        "chunks_used": len(retrieved_chunks)
    }
