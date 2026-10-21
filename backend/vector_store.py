import chromadb

client=chromadb.PersistentClient(path="./chroma_db")

collection=client.get_or_create_collection(
    name="document_chunks_gemini_embedding_001_768",
    metadata={"hnsw:space": "cosine"}
)
def store_embeddings(embedded_chunks,filename):
    if not embedded_chunks:
        return 0
    ids=[]
    documents=[]
    embeddings=[]
    metadatas=[]
    for index,chunk in enumerate(embedded_chunks):
        ids.append(f"{filename}_chunk_{index}")
        documents.append(chunk["text"])
        embeddings.append(chunk["embedding"])
        metadatas.append({
            "filename":filename,
            "page_number":chunk["page_number"],
            "chunk_index":index
        })
    collection.upsert(
        ids=ids,
        documents=documents,
        embeddings=embeddings,
        metadatas=metadatas
    )
    return len(embedded_chunks)
