import os
import tempfile
from pathlib import Path

import pymupdf

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from ingestion import ingest_pdf
from chunking import chunk_pages
from embeddings import generate_embeddings
from vector_store import collection, store_embeddings
from qa import answer_question


# --------------------------------------------------
# APPLICATION
# --------------------------------------------------

app = FastAPI(
    title="PaperMind - Document Q&A Bot",
    description="Upload PDFs and ask questions using RAG.",
    version="1.0.0"
)


# --------------------------------------------------
# CORS
# --------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"]
)


# --------------------------------------------------
# REQUEST MODELS
# --------------------------------------------------

class QuestionRequest(BaseModel):
    question: str = Field(
        min_length=1,
        max_length=2000
    )

    api_key: str = Field(
        min_length=1,
        max_length=500
    )

    top_k: int = Field(
        default=3,
        ge=1,
        le=10
    )


# --------------------------------------------------
# ROOT ENDPOINT
# --------------------------------------------------

@app.get("/")
def home():
    return {
        "message": "PaperMind API is running",
        "documents_stored": collection.count()
    }


# --------------------------------------------------
# PDF UPLOAD ENDPOINT
# --------------------------------------------------

@app.post("/upload-pdf")
async def upload_pdf(file: UploadFile = File(...)):
    """
    Upload a PDF and store its embedded chunks in ChromaDB.
    """

    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="Please select a PDF file."
        )

    if Path(file.filename).suffix.lower() != ".pdf":
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are supported."
        )

    temp_path = None

    try:
        # Read the uploaded file.
        contents = await file.read()

        if not contents:
            raise HTTPException(
                status_code=400,
                detail="The uploaded file is empty."
            )

        # Create a temporary PDF file.
        with tempfile.NamedTemporaryFile(
            suffix=".pdf",
            delete=False
        ) as temp_file:
            temp_file.write(contents)
            temp_path = temp_file.name

        # Validate that the uploaded file is a readable PDF.
        try:
            with pymupdf.open(temp_path) as pdf:
                pages_count = len(pdf)

        except Exception as exc:
            raise HTTPException(
                status_code=400,
                detail="The uploaded file is not a readable PDF."
            ) from exc

        if pages_count == 0:
            raise HTTPException(
                status_code=400,
                detail="The PDF contains no pages."
            )

        # 1. Extract text from PDF.
        pages = ingest_pdf(temp_path)

        # 2. Split extracted text into chunks.
        chunks = chunk_pages(pages)

        if not chunks:
            raise HTTPException(
                status_code=400,
                detail=(
                    "No readable text was extracted from this PDF. "
                    "It may be a scanned document."
                )
            )

        # 3. Generate embeddings.
        embedded_chunks = generate_embeddings(chunks)

        # 4. Store embeddings in ChromaDB.
        stored_count = store_embeddings(
            embedded_chunks,
            file.filename
        )

        return {
            "message": "PDF processed successfully.",
            "filename": file.filename,
            "pages_extracted": len(pages),
            "chunks_created": len(chunks),
            "chunks_stored": stored_count,
            "total_database_records": collection.count()
        }

    except HTTPException:
        raise

    except Exception as exc:
        # Keep detailed diagnostics in the backend terminal.
        print(
            f"PDF upload error for {file.filename}: "
            f"{type(exc).__name__}: {exc}"
        )

        raise HTTPException(
            status_code=500,
            detail="PDF processing failed. Check the backend terminal."
        ) from exc

    finally:
        # Remove the temporary PDF.
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except OSError:
                pass

        await file.close()


# --------------------------------------------------
# QUESTION ANSWERING ENDPOINT
# --------------------------------------------------

@app.post("/ask")
def ask_question(request: QuestionRequest):
    """
    Answer a question using the user's Gemini API key.
    The key is supplied in the request and is not saved to disk.
    """

    try:
        answer = answer_question(
            question=request.question,
            api_key=request.api_key,
            top_k=request.top_k
        )

        return {
            "question": request.question,
            "answer": answer
        }

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc)
        ) from exc

    except Exception as exc:
        # Never print or return the API key.
        print(
            f"Question answering error: "
            f"{type(exc).__name__}: {exc}"
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Question answering failed. Check the backend "
                "terminal for the underlying error."
            )
        ) from exc