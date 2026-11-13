"""
Converts text policy documents into official Enterprise PDF documents using PyMuPDF.
"""
import os
import fitz  # PyMuPDF

DOCS_DIR = os.path.dirname(os.path.abspath(__file__))

def create_pdf_from_text(txt_path, pdf_path, title):
    with open(txt_path, "r", encoding="utf-8") as f:
        text = f.read()

    doc = fitz.open()
    # A4 standard size: 595 x 842 pt
    page = doc.new_page(width=595, height=842)
    rect = fitz.Rect(50, 50, 545, 792)
    
    # Write styled text
    page.insert_textbox(
        rect,
        text,
        fontsize=10.5,
        fontname="helv",
        color=(0.1, 0.1, 0.1),
        align=fitz.TEXT_ALIGN_LEFT
    )
    doc.save(pdf_path)
    doc.close()
    print(f"Generated PDF: {pdf_path}")

if __name__ == "__main__":
    files = [
        ("HR_Leave_and_Attendance_Policy_2026.txt", "HR_Leave_and_Attendance_Policy_2026.pdf", "HR Policy"),
        ("Remote_Work_and_Reimbursement_Policy_2026.txt", "Remote_Work_and_Reimbursement_Policy_2026.pdf", "Remote Work Policy"),
        ("IT_Support_and_Security_Policy_2026.txt", "IT_Support_and_Security_Policy_2026.pdf", "IT Support Policy")
    ]
    for txt, pdf, t in files:
        t_path = os.path.join(DOCS_DIR, txt)
        p_path = os.path.join(DOCS_DIR, pdf)
        if os.path.exists(t_path):
            create_pdf_from_text(t_path, p_path, t)
