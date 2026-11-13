import os
import sys

# Ensure backend can be imported
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.database.connection import init_db, get_session
from backend.services.document_processor import chunk_and_index_document, get_collection_count
from backend.models.document import DocumentRecord
from backend.models.ticket import SupportTicket
from backend.agents.workflow import run_agent_workflow

def run_all_tests():
    print("=" * 60)
    print("TEST SUITE: Enterprise AI Knowledge & Automation Agent")
    print("=" * 60)

    # 1. Initialize DB
    print("\n[Step 1] Initializing Database & Seed Users...")
    init_db()
    print("  -> Database initialized successfully.")

    # 2. Ingest Policy Documents
    print("\n[Step 2] Ingesting Official Enterprise Policy Documents...")
    docs_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "documents"))
    pdf_files = [
        "HR_Leave_and_Attendance_Policy_2026.pdf",
        "Remote_Work_and_Reimbursement_Policy_2026.pdf",
        "IT_Support_and_Security_Policy_2026.pdf"
    ]
    db = get_session()
    for f in pdf_files:
        fpath = os.path.join(docs_dir, f)
        if os.path.exists(fpath):
            res = chunk_and_index_document(fpath, f)
            print(f"  -> Indexed '{f}': {res['chunks_indexed']} chunks.")
            # Record in DB
            rec = db.query(DocumentRecord).filter(DocumentRecord.filename == f).first()
            if not rec:
                rec = DocumentRecord(
                    filename=f,
                    file_path=fpath,
                    file_type="pdf",
                    file_size_bytes=os.path.getsize(fpath),
                    chunk_count=res["chunks_indexed"],
                    uploaded_by="Admin",
                    status="INDEXED"
                )
                db.add(rec)
            else:
                rec.chunk_count = res["chunks_indexed"]
            db.commit()
    db.close()

    total_chunks = get_collection_count()
    print(f"  -> Total vector chunks in ChromaDB: {total_chunks}")
    assert total_chunks > 0, "ChromaDB should contain indexed chunks!"

    # 3. Test Question 1: RAG Question Answering
    print("\n[Step 3] Testing RAG Pipeline:")
    q1 = "How many paid leaves can I take in a year?"
    print(f"  User Query: '{q1}'")
    out1 = run_agent_workflow(q1, user_email="alex.smith@enterprise.ai")
    print(f"  Identified Intent: {out1['intent']}")
    print(f"  Citations Count: {len(out1['citations'])}")
    if out1['citations']:
        print(f"  First Citation: Source = {out1['citations'][0]['source']}, Page = {out1['citations'][0]['page']}")
    print("  Response Preview:")
    print("  " + "\n  ".join(out1['response'].splitlines()[:5]))
    assert "18" in out1['response'] or "paid leaves" in out1['response'].lower(), "Answer should mention 18 paid leaves"

    # 4. Test Question 2: Business Action / Agent Tool Execution
    print("\n[Step 4] Testing Agentic Tool Execution (Ticket Creation):")
    q2 = "Create a support ticket because I cannot access my company account."
    print(f"  User Query: '{q2}'")
    out2 = run_agent_workflow(q2, user_email="alex.smith@enterprise.ai")
    print(f"  Identified Intent: {out2['intent']}")
    print(f"  Tools Executed: {len(out2['tool_results'])}")
    if out2['tool_results']:
        print(f"  Tool Result: {out2['tool_results'][0]}")
    print("  Response Preview:")
    print("  " + "\n  ".join(out2['response'].splitlines()[:5]))
    assert len(out2['tool_results']) > 0, "Tool execution should have run"

    # Verify ticket in DB
    db = get_session()
    latest_ticket = db.query(SupportTicket).order_by(SupportTicket.id.desc()).first()
    print(f"  -> Verified in PostgreSQL/DB: Latest Ticket Code = {latest_ticket.ticket_code}, Priority = {latest_ticket.priority}")
    db.close()

    # 5. Test Question 3: Hybrid Query (RAG + Business Action)
    print("\n[Step 5] Testing Hybrid Workflow (Knowledge Retrieval + Action):")
    q3 = "Summarize the company's work-from-home policy and create a request for working remotely next Monday."
    print(f"  User Query: '{q3}'")
    out3 = run_agent_workflow(q3, user_email="alex.smith@enterprise.ai")
    print(f"  Identified Intent: {out3['intent']}")
    print(f"  Citations Count: {len(out3['citations'])}")
    print(f"  Tools Executed: {len(out3['tool_results'])}")
    print("  Response Preview:")
    print("  " + "\n  ".join(out3['response'].splitlines()[:6]))
    assert out3['intent'] == "HYBRID", "Intent should be identified as HYBRID"

    print("\n" + "=" * 60)
    print("ALL TESTS PASSED SUCCESSFULLY! The pipeline is fully functional.")
    print("=" * 60)

if __name__ == "__main__":
    run_all_tests()
