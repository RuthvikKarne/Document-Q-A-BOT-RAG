from embedding_model import get_embedding_model
from vector_store import collection


def search_documents(question, top_k=3):
    if not question.strip():
        raise ValueError("Question cannot be empty.")

    total_records = collection.count()
    if total_records == 0:
        return []

    model = get_embedding_model()
    question_embedding = model.encode(
        question,
        convert_to_numpy=True,
    ).tolist()

    result_count = min(top_k, total_records)
    results = collection.query(
        query_embeddings=[question_embedding],
        n_results=result_count,
        include=["documents", "metadatas", "distances"],
    )

    matches = []
    for i, text in enumerate(results["documents"][0]):
        matches.append({
            "text": text,
            "filename": results["metadatas"][0][i]["filename"],
            "page_number": results["metadatas"][0][i]["page_number"],
            "distance": results["distances"][0][i],
        })

    return matches
