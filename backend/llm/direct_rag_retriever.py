"""
Fast Document Vector Store & Context Retriever for RAGFlow PDFs.
Ingests text from all PDFs in ragflow/data, indexes all 5 subjects in syllabus.pdf cleanly,
and returns exact relevant subject chunks.
"""
import os
import glob
import re
from typing import List, Dict, Any
from pypdf import PdfReader

DATA_DIR = os.getenv("RAGFLOW_DATA_DIR", "c:\\SHO\\RAG FLOW\\ragflow\\data")

# Hardcoded extraction for 2026-HOLIDAYS-LIST.pdf since it is image-scanned
HOLIDAY_PDF_CONTENT = """
VNR VIGNANA JYOTHI INSTITUTE OF ENGINEERING & TECHNOLOGY
LIST OF HOLIDAYS FOR THE CALENDAR YEAR-2026:
1. New Year Day: 01-01-2026 (Thursday)
2. Bhogi / Sankranti / Pongal: 14-01-2026 to 16-01-2026 (Wed to Fri)
3. Republic Day: 26-01-2026 (Monday)
4. Maha Shivaratri: 15-02-2026 (Sunday)
5. Holi: 03-03-2026 (Tuesday)
6. Ugadi: 19-03-2026 (Thursday)
7. Eidul-Fitr (Ramzan): 21-03-2026 (Saturday)
8. Sri Rama Navami: 27-03-2026 (Friday)
9. Good Friday: 03-04-2026 (Friday)
10. Dr. B.R. Ambedkar's Birthday: 14-04-2026 (Tuesday)
11. Eidul-Azha (Bakrid): 27-05-2026 (Wednesday)
12. Independence Day: 15-08-2026 (Saturday)
13. Varalakshmi Vratham: 21-08-2026 (Friday)
14. Milad-un-Nabi: 26-08-2026 (Wednesday)
15. Vinayaka Chavithi: 14-09-2026 (Monday)
16. Mahatma Gandhi Jayanthi: 02-10-2026 (Friday)
17. Mahanavami: 19-10-2026 (Monday)
18. Vijayadasami / Dussehra: 20-10-2026 (Tuesday)
19. Deepavali: 08-11-2026 (Sunday)
20. Christmas: 25-12-2026 (Friday)
Note: Every 2nd and 4th Saturday of the month is observed as a holiday.
"""


class DirectDocumentStore:
    def __init__(self, data_dir: str = DATA_DIR):
        self.data_dir = data_dir
        self.chunks: List[Dict[str, Any]] = []
        self._index_documents()

    def _index_documents(self):
        raw_chunks = []

        # 1. Index 2026-HOLIDAYS-LIST.pdf
        holiday_words = HOLIDAY_PDF_CONTENT.split()
        for i in range(0, len(holiday_words), 120):
            chunk_text = " ".join(holiday_words[i:i + 120])
            raw_chunks.append({
                "doc_name": "2026-HOLIDAYS-LIST.pdf",
                "page": 1,
                "subject": "Holidays & Calendar 2026",
                "content": chunk_text
            })

        # 2. Index all other PDFs in ragflow/data
        pdf_paths = glob.glob(os.path.join(self.data_dir, "*.pdf"))

        for path in pdf_paths:
            filename = os.path.basename(path)
            if filename == "2026-HOLIDAYS-LIST.pdf":
                continue
            try:
                reader = PdfReader(path)
                current_subject = "General Syllabus / Academic"
                for page_idx, page in enumerate(reader.pages):
                    text = (page.extract_text() or "").strip()
                    if len(text) > 20:
                        # Detect subject headers in syllabus.pdf
                        if "MATRICES AND CALCULUS" in text.upper():
                            current_subject = "MATRICES AND CALCULUS"
                        elif "APPLIED PHYSICS" in text.upper():
                            current_subject = "APPLIED PHYSICS"
                        elif "PROGRAMMING FOR PROBLEM SOLVING" in text.upper():
                            current_subject = "PROGRAMMING FOR PROBLEM SOLVING"
                        elif "ENGLISH FOR SKILL ENHANCEMENT" in text.upper():
                            current_subject = "ENGLISH FOR SKILL ENHANCEMENT"
                        elif "ELECTRICAL CIRCUITS" in text.upper():
                            current_subject = "ELECTRICAL CIRCUITS"

                        raw_chunks.append({
                            "doc_name": filename,
                            "page": page_idx + 1,
                            "subject": current_subject,
                            "content": text
                        })
            except Exception as e:
                print(f"Error reading {filename}: {e}")

        self.chunks = raw_chunks

    def search(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        if not self.chunks:
            return []

        query_lower = query.lower()
        # Clean user query terms
        query_words = [w for w in re.findall(r'\w+', query_lower) if len(w) >= 2]
        
        # Stopwords to ignore
        stopwords = {"what", "is", "the", "for", "and", "in", "of", "to", "a", "an", "tell", "me", "about", "give", "show", "details"}
        subject_keywords = [w for w in query_words if w not in stopwords]

        scored_results = []
        for chunk in self.chunks:
            text_lower = chunk["content"].lower()
            doc_lower = chunk["doc_name"].lower()
            subject_lower = chunk.get("subject", "").lower()

            score = 0

            # 1. Subject Header / Title Match (High Priority)
            for kw in subject_keywords:
                if kw in subject_lower:
                    score += 40
                if kw in text_lower:
                    score += text_lower.count(kw) * 5
                if kw in doc_lower:
                    score += 10

            # 2. Specific Subject Phrase Boosts
            if "physics" in query_lower and "physics" in subject_lower:
                score += 100
            elif "programming" in query_lower and "programming" in subject_lower:
                score += 100
            elif "english" in query_lower and "english" in subject_lower:
                score += 100
            elif "circuit" in query_lower and "circuit" in subject_lower:
                score += 100
            elif ("matrix" in query_lower or "matrices" in query_lower or "calculus" in query_lower) and "matrices" in subject_lower:
                score += 100
            elif "holiday" in query_lower or "vacation" in query_lower:
                if "holiday" in doc_lower or "holidays" in subject_lower:
                    score += 100
            elif "calendar" in query_lower or "academic schedule" in query_lower:
                if "calendar" in doc_lower or "events" in doc_lower:
                    score += 80

            if score > 0:
                c = chunk.copy()
                c["score"] = score
                scored_results.append(c)

        scored_results.sort(key=lambda x: x["score"], reverse=True)

        if not scored_results:
            return self.chunks[:top_k]

        return scored_results[:top_k]


doc_store = DirectDocumentStore()


def retrieve_ragflow_context(query: str, top_k: int = 4) -> str:
    """Retrieve top-k relevant text chunks directly from RAGFlow data PDFs."""
    results = doc_store.search(query, top_k=top_k)
    if not results:
        return ""

    formatted = []
    total_chars = 0
    for r in results:
        chunk_str = f"📄 [Document: {r['doc_name']} | Subject: {r.get('subject', 'General')} | Page: {r['page']}]\n{r['content']}"
        if total_chars + len(chunk_str) > 4000:
            break
        formatted.append(chunk_str)
        total_chars += len(chunk_str)

    return "\n\n---\n".join(formatted)
