import io
import os
import uvicorn
from fastapi import FastAPI, File, UploadFile, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from google.genai import types
from pydantic import BaseModel
from PIL import Image

app = FastAPI(title="Book Scanner")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class BookInfo(BaseModel):
    book_found: bool          # False if no book/cover is visible in the image
    title: str
    author: str
    subject_area: str         # e.g. "Electrical Engineering / Communication Systems"
    summary: str               # ~3-5 sentences on what the book covers
    key_topics: list[str]      # 4-8 short topic bullets
    useful_for: str            # who should read it (students, level, professionals, etc.)
    prerequisites: str         # what background helps before reading it


@app.post("/identify-book")
async def identify_book(
    file: UploadFile = File(...),
    x_api_key: str = Header(None, alias="X-API-Key"),
):
    try:
        api_key = x_api_key or os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise HTTPException(
                status_code=401,
                detail="Gemini API key is missing. Set the GEMINI_API_KEY environment variable or enter one in the app."
            )

        client = genai.Client(api_key=api_key)

        contents = await file.read()
        try:
            image = Image.open(io.BytesIO(contents)).convert("RGB")
        except Exception:
            raise HTTPException(
                status_code=400,
                detail="Couldn't read that as an image. Try capturing the photo again."
            )

        prompt = """
        Look at the photo. It should show a book cover or spine held in someone's hand.

        1. Read the title and author from the cover/spine text as accurately as possible.
        2. If no book is clearly visible or the text can't be read, set book_found to false and
           leave the other fields as your best guess or empty.
        3. If a book IS identified, use your knowledge of that book (or, if it's an unfamiliar/
           niche title, reason from the subject area and title alone) to describe:
           - what field/subject it belongs to
           - a clear summary of what the book covers
           - 4-8 key topics it likely includes
           - who it's useful for (e.g. undergrad EE students, self-taught engineers, exam prep)
           - what background/prerequisites help before reading it
        Be concise and factual. Do not invent an author or edition if you can't tell.
        """

        response = client.models.generate_content(
            model='gemini-3.5-flash',
            contents=[image, prompt],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=BookInfo,
            ),
        )

        if response.parsed is None:
            raise HTTPException(
                status_code=502,
                detail="Couldn't make sense of that photo. Try again with better lighting and the cover facing the camera."
            )

        return response.parsed

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
