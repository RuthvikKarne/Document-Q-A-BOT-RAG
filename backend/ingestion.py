import pymupdf


def ingest_pdf(file_path):
    """
    Extract text from a PDF file.

    Args:
        file_path: Path to the PDF uploaded through FastAPI.

    Returns:
        A list of dictionaries containing page numbers and text.
    """
    pages = []

    with pymupdf.open(file_path) as pdf:
        for page_number, page in enumerate(pdf, start=1):
            text = page.get_text().strip()

            pages.append({
                "page_number": page_number,
                "text": text
            })

    if not any(page["text"] for page in pages):
        raise ValueError(
            "No extractable text found in this PDF. "
            "The document may contain scanned images."
        )

    return pages