"""
FRIDAY Backend — Multi-Pass Visual OCR & Interactive Vision Chatbot Router.
Uses multi-pass OpenCV OCR + Groq multimodal vision LLM (image + text).
Exposes:
- POST /vision/scan
- POST /vision/ask
- POST /identify-book
"""
import os
import io
import json
import base64
import cv2
import numpy as np
from fastapi import APIRouter, HTTPException, Header, UploadFile, File
from pydantic import BaseModel
from PIL import Image

router = APIRouter()

VISION_MODEL = "qwen/qwen3.6-27b"
CHAT_MODEL = "llama-3.3-70b-versatile"
TEXT_FALLBACK_MODEL = "llama-3.3-70b-versatile"
MAX_IMAGE_BYTES = 18 * 1024 * 1024  # Groq limit is 20MB

_ocr_reader = None


def get_ocr_reader():
    global _ocr_reader
    if _ocr_reader is None:
        try:
            import easyocr
            _ocr_reader = easyocr.Reader(['en'], gpu=False)
        except Exception as e:
            print(f"[OCR INIT WARNING] {e}")
            _ocr_reader = False
    return _ocr_reader


def extract_text_multipass(image: Image.Image) -> str:
    """
    Multi-pass visual OCR pipeline:
    Pass 1: Original RGB image
    Pass 2: Inverted Grayscale (White text on dark poster background)
    Pass 3: CLAHE contrast-enhanced grayscale
    Pass 4: Otsu binary thresholding & 2x upscaling
    """
    extracted_words = []

    img_np = np.array(image)
    bgr = cv2.cvtColor(img_np, cv2.COLOR_RGB2BGR)
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    inv_gray = cv2.bitwise_not(gray)

    # Pass 1: EasyOCR on RGB
    reader = get_ocr_reader()
    if reader and reader is not False:
        try:
            # Pass 1: RGB
            res1 = reader.readtext(img_np)
            for r in res1:
                if r[2] > 0.05:
                    extracted_words.append(r[1])

            # Pass 2: Inverted Grayscale (white text on dark poster e.g. BLEACH)
            res2 = reader.readtext(inv_gray)
            for r in res2:
                if r[2] > 0.05:
                    if r[1] not in extracted_words:
                        extracted_words.append(r[1])

            # Pass 3: CLAHE Contrast Enhancement
            clahe = cv2.createCLAHE(clipLimit=3.5, tileGridSize=(8, 8))
            enhanced = clahe.apply(gray)
            res3 = reader.readtext(enhanced)
            for r in res3:
                if r[2] > 0.05:
                    if r[1] not in extracted_words:
                        extracted_words.append(r[1])

            # Pass 4: 2x Scaled Otsu Binary Thresholding
            h, w = gray.shape
            resized = cv2.resize(enhanced, (w * 2, h * 2), interpolation=cv2.INTER_CUBIC)
            _, thresh = cv2.threshold(resized, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            res4 = reader.readtext(thresh)
            for r in res4:
                if r[2] > 0.05:
                    if r[1] not in extracted_words:
                        extracted_words.append(r[1])

        except Exception as e:
            print(f"[OCR EasyOCR Error] {e}")

    # Supplemental Pytesseract check if installed on system PATH
    try:
        import pytesseract
        tess_text = pytesseract.image_to_string(gray).strip()
        if tess_text:
            extracted_words.extend(tess_text.split())
    except Exception:
        pass


    # Clean and filter duplicates while preserving order
    seen = set()
    cleaned_words = []
    for word in extracted_words:
        w_clean = word.strip()
        if len(w_clean) >= 2 and w_clean.lower() not in seen:
            seen.add(w_clean.lower())
            cleaned_words.append(w_clean)

    return " ".join(cleaned_words)


def prepare_image_data_uri(image_bytes: bytes) -> str:
    """Resize/compress image if needed and return a JPEG base64 data URI for Groq vision."""
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")

    # Downscale large frames so vision requests stay fast and under size limits
    max_dim = 1280
    w, h = image.size
    if max(w, h) > max_dim:
        scale = max_dim / max(w, h)
        image = image.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)

    quality = 88
    while quality >= 55:
        buf = io.BytesIO()
        image.save(buf, format="JPEG", quality=quality, optimize=True)
        encoded = base64.b64encode(buf.getvalue()).decode("utf-8")
        if len(encoded) <= MAX_IMAGE_BYTES:
            return f"data:image/jpeg;base64,{encoded}"
        quality -= 10

    # Last resort: smaller resize
    image = image.resize((640, int(640 * h / w)), Image.Resampling.LANCZOS)
    buf = io.BytesIO()
    image.save(buf, format="JPEG", quality=75, optimize=True)
    encoded = base64.b64encode(buf.getvalue()).decode("utf-8")
    return f"data:image/jpeg;base64,{encoded}"


def _normalize_analysis(data: dict, ocr_text: str, manual_title: str, combined_context_text: str) -> dict:
    """Normalize LLM JSON and avoid generic Unknown titles when we have real context."""
    title = (data.get("title") or "").strip()
    if not title or title.lower() in {"unknown", "unknown item", "unknown object", "unidentified"}:
        if manual_title.strip():
            title = manual_title.strip()
        elif ocr_text.strip():
            title = ocr_text.strip()[:120]
        else:
            title = combined_context_text or "Identified Item"

    summary = data.get("summary") or "Analyzed by FRIDAY Vision System."
    useful_for_data = data.get("useful_for")
    useful_for_str = ", ".join(useful_for_data) if isinstance(useful_for_data, list) else str(useful_for_data or "")
    prereq_data = data.get("prerequisites")
    prereq_str = ", ".join(prereq_data) if isinstance(prereq_data, list) else str(prereq_data or "")

    full_text = data.get("full_text_output") or (
        f"📖 IDENTIFIED ITEM: {title}\n\n"
        f"OCR TEXT READ: {ocr_text or '(none — identified visually)'}\n\n"
        f"OVERVIEW:\n{summary}\n\n"
        f"CATEGORY: {data.get('category')}\n\n"
        f"USEFUL FOR: {useful_for_str}"
    )

    return {
        "object_found": data.get("object_found", True),
        "title": title,
        "category": data.get("category", "General Media / Technology"),
        "summary": summary,
        "key_topics": data.get("key_topics", ["Visual Recognition", "Visual AI Analysis"]),
        "useful_for": useful_for_str or "General Readers & Viewers",
        "prerequisites": prereq_str or "None",
        "full_text_output": full_text,
    }


class DetectionRequest(BaseModel):
    image: str  # Base64 image frame
    manual_title: str = ""  # Optional manual title verification


class DetectionItem(BaseModel):
    label: str
    confidence: float
    bbox: list[float]  # [x, y, width, height]


class ScanAnalysisResponse(BaseModel):
    object_found: bool
    title: str
    category: str
    summary: str
    key_topics: list[str]
    useful_for: str
    prerequisites: str
    full_text_output: str
    detections: list[DetectionItem]


class VisionChatRequest(BaseModel):
    question: str
    title: str = ""
    image_context: str = ""


class VisionChatResponse(BaseModel):
    answer: str
    model_used: str


def _build_analysis_prompt(ocr_text: str, manual_title: str) -> str:
    return f"""You are FRIDAY Visual Lens — an expert at identifying books, manga/anime posters, novels, textbooks, and everyday objects from photos.

Look at the attached camera image carefully. Also use this supplemental OCR text (may be incomplete): "{ocr_text or 'none'}"
Optional user title hint: "{manual_title or 'none'}"

Identify the EXACT item shown (cover art, poster, book spine, product, etc.).
Examples:
- BLEACH manga/anime poster → title "BLEACH", creator Tite Kubo, category Manga/Anime
- Engineering textbook → full title + author if visible
- Novel cover → title + genre + plot themes

Rules:
- NEVER return title "Unknown". If unsure, describe the most likely item from visual cues.
- Read visible text on the cover/poster and use it in your answer.
- Be specific about characters, authors, subjects, and themes you can see or infer.

Return ONLY valid JSON with this shape:
{{
  "object_found": true,
  "title": "Exact title or object name",
  "category": "Genre or field",
  "summary": "4-5 sentence overview of what this item is and why it matters",
  "key_topics": ["topic1", "topic2", "topic3", "topic4"],
  "useful_for": "Who would enjoy or need this item",
  "prerequisites": "Background needed, or None",
  "full_text_output": "Detailed report: title, creator/author, visible text, plot/subject overview, key highlights"
}}"""


def perform_ai_analysis(image_bytes: bytes, env_api_key: str, manual_title: str = "") -> dict:
    """
    Perform visual AI analysis using Groq multimodal vision + supplemental OCR text.
    """
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    ocr_text = extract_text_multipass(image)
    combined_context_text = f"{manual_title} {ocr_text}".strip()
    image_data_uri = prepare_image_data_uri(image_bytes)
    analysis_prompt = _build_analysis_prompt(ocr_text, manual_title)

    from groq import Groq
    groq_client = Groq(api_key=env_api_key)

    # Primary: multimodal vision model (sees the actual image)
    try:
        response = groq_client.chat.completions.create(
            model=VISION_MODEL,
            messages=[{
                "role": "user",
                "content": [
                    {"type": "text", "text": analysis_prompt},
                    {"type": "image_url", "image_url": {"url": image_data_uri}},
                ],
            }],
            response_format={"type": "json_object"},
            temperature=0.2,
            max_completion_tokens=1200,
        )
        data = json.loads(response.choices[0].message.content)
        return _normalize_analysis(data, ocr_text, manual_title, combined_context_text)
    except Exception as vision_err:
        print(f"[Vision model fallback] {vision_err}")

    # Fallback: text-only LLM using OCR + manual hint
    try:
        text_prompt = analysis_prompt + "\n\nNote: image could not be processed; rely on OCR text and hints above."
        response = groq_client.chat.completions.create(
            model=TEXT_FALLBACK_MODEL,
            messages=[{"role": "user", "content": text_prompt}],
            response_format={"type": "json_object"},
            temperature=0.2,
            max_tokens=900,
        )
        data = json.loads(response.choices[0].message.content)
        return _normalize_analysis(data, ocr_text, manual_title, combined_context_text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Visual AI analysis error: {str(e)}")


@router.post("/scan", response_model=ScanAnalysisResponse)
async def scan_and_analyze(
    request: DetectionRequest,
    x_api_key: str = Header(None, alias="X-API-Key")
):
    """
    POST /vision/scan endpoint.
    Invoked ONLY on button click. Performs visual AI analysis of the captured image frame.
    """
    env_api_key = os.environ.get("MY_API_KEY") or os.environ.get("NEXT_PUBLIC_MY_API_KEY")
    if not env_api_key:
        raise HTTPException(status_code=401, detail="API key not found")

    if not request.image:
        raise HTTPException(status_code=400, detail="No image frame provided")

    try:
        image_data = request.image
        if "," in image_data:
            image_data = image_data.split(",", 1)[1]

        image_bytes = base64.b64decode(image_data)
        analysis = perform_ai_analysis(image_bytes, env_api_key, request.manual_title)

        return ScanAnalysisResponse(
            object_found=analysis["object_found"],
            title=analysis["title"],
            category=analysis["category"],
            summary=analysis["summary"],
            key_topics=analysis["key_topics"],
            useful_for=analysis["useful_for"],
            prerequisites=analysis["prerequisites"],
            full_text_output=analysis["full_text_output"],
            detections=[],
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Vision scan error: {str(e)}")


@router.post("/ask", response_model=VisionChatResponse)
async def vision_chat(
    request: VisionChatRequest,
    x_api_key: str = Header(None, alias="X-API-Key")
):
    """
    POST /vision/ask endpoint.
    Interactive Vision Chatbot endpoint allowing users to ask follow-up questions about the analyzed image/book/poster.
    """
    env_api_key = os.environ.get("MY_API_KEY") or os.environ.get("NEXT_PUBLIC_MY_API_KEY")
    if not env_api_key:
        raise HTTPException(status_code=401, detail="API key not found")

    try:
        from groq import Groq
        groq_client = Groq(api_key=env_api_key)

        prompt = f"""
        You are FRIDAY AI Vision Assistant. The user scanned an item and wants a follow-up answer.

        Scanned item title: "{request.title or 'Analyzed Item'}"
        Category & full analysis context:
        {request.image_context or 'No prior image context provided.'}

        User question: "{request.question}"

        Answer using the analysis context above. Be specific to this exact item (not generic).
        Use bullet points where helpful. If the question is about characters, plot, or concepts, draw on your knowledge of the identified title.
        """

        response = groq_client.chat.completions.create(
            model=CHAT_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=1000,
        )

        answer = response.choices[0].message.content
        return VisionChatResponse(
            answer=answer,
            model_used=CHAT_MODEL,
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Vision chatbot error: {str(e)}")


@router.post("/identify-book")
async def identify_book_alias(
    file: UploadFile = File(None),
    request: DetectionRequest = None,
    x_api_key: str = Header(None, alias="X-API-Key")
):
    """
    POST /identify-book endpoint alias.
    """
    env_api_key = os.environ.get("MY_API_KEY") or os.environ.get("NEXT_PUBLIC_MY_API_KEY")
    if not env_api_key:
        raise HTTPException(status_code=401, detail="API key not found")

    image_bytes = b""
    manual_title = ""
    if file:
        image_bytes = await file.read()
    elif request and request.image:
        image_data = request.image
        if "," in image_data:
            image_data = image_data.split(",", 1)[1]
        image_bytes = base64.b64decode(image_data)
        manual_title = request.manual_title

    if not image_bytes:
        raise HTTPException(status_code=400, detail="No image file or base64 data provided")

    analysis = perform_ai_analysis(image_bytes, env_api_key, manual_title)
    return {
        "book_found": analysis["object_found"],
        "title": analysis["title"],
        "author": "Identified Author / Creator",
        "subject_area": analysis["category"],
        "summary": analysis["summary"],
        "key_topics": analysis["key_topics"],
        "useful_for": analysis["useful_for"],
        "prerequisites": analysis["prerequisites"],
        "full_text_output": analysis["full_text_output"],
    }
