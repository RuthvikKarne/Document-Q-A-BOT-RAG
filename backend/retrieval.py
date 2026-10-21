from sentence_transformers import SentenceTransformer
from vector_store import collection

# Load the embedding model
model = SentenceTransformer("all-MiniLM-L6-v2")


def search_documents(question, top_k=3):

    if not question.strip():
        raise ValueError("Question cannot be empty.")

    # Count records BEFORE checking whether the database is empty.
    total_records = collection.count()

    if total_records == 0:
        return []

    # Convert the question into an embedding.
    question_embedding = model.encode(question).tolist()

    # Do not request more results than available records.
    result_count = min(top_k, total_records)

    # Search ChromaDB for similar document chunks.
    results = collection.query(
        query_embeddings=[question_embedding],
        n_results=result_count,
        include=["documents", "metadatas", "distances"]
    )

    matches = []

    for i, text in enumerate(results["documents"][0]):
        matches.append({
            "text": text,
            "filename": results["metadatas"][0][i]["filename"],
            "page_number": results["metadatas"][0][i]["page_number"],
            "distance": results["distances"][0][i]
        })

    return matches