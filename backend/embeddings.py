import math

from google import genai
from google.genai import types


EMBEDDING_MODEL = "gemini-embedding-001"
EMBEDDING_DIMENSIONS = 768
EMBEDDING_BATCH_SIZE = 8


def _embed_texts(texts, api_key, task_type):
    if not texts:
        return []

    clean_key = api_key.strip()
    if not clean_key:
        raise ValueError("Please enter your Gemini API key.")

    client = genai.Client(api_key=clean_key)
    vectors = []

    for start in range(0, len(texts), EMBEDDING_BATCH_SIZE):
        batch = texts[start : start + EMBEDDING_BATCH_SIZE]
        response = client.models.embed_content(
            model=EMBEDDING_MODEL,
            contents=batch,
            config=types.EmbedContentConfig(
                task_type=task_type,
                output_dimensionality=EMBEDDING_DIMENSIONS,
            ),
        )

        for embedding in response.embeddings or []:
            values = list(embedding.values or [])
            magnitude = math.sqrt(sum(value * value for value in values))
            if not values or magnitude == 0:
                raise RuntimeError("Gemini returned an empty embedding.")
            vectors.append([value / magnitude for value in values])

    if len(vectors) != len(texts):
        raise RuntimeError("Gemini returned an unexpected number of embeddings.")

    return vectors


def generate_embeddings(chunks, api_key):
    if not chunks:
        return []

    texts = [chunk["text"] for chunk in chunks]
    vectors = _embed_texts(texts, api_key, "RETRIEVAL_DOCUMENT")

    return [
        {
            "text": chunk["text"],
            "page_number": chunk["page_number"],
            "embedding": vector,
        }
        for chunk, vector in zip(chunks, vectors)
    ]


def embed_query(question, api_key):
    return _embed_texts([question], api_key, "RETRIEVAL_QUERY")[0]
