from embedding_model import get_embedding_model


def generate_embeddings(chunks):
    if not chunks:
        return []

    model = get_embedding_model()
    texts = [chunk["text"] for chunk in chunks]
    vectors = model.encode(
        texts,
        batch_size=8,
        show_progress_bar=False,
        convert_to_numpy=True,
    )

    results = []
    for chunk, vector in zip(chunks, vectors):
        results.append({
            "text": chunk["text"],
            "page_number": chunk["page_number"],
            "embedding": vector.tolist(),
        })

    return results
