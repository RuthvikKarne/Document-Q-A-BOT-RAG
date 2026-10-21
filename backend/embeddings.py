from sentence_transformers import SentenceTransformer

model=SentenceTransformer("all-MiniLM-L6-v2")

def generate_embeddings(chunks):
    texts = [chunk["text"] for chunk in chunks]

    vectors=model.encode(texts)
    results=[]

    for chunk,vector in zip(chunks,vectors):
        results.append({
            "text":chunk["text"],
            "page_number":chunk["page_number"],
            "embedding":vector.tolist()
        })
    return results