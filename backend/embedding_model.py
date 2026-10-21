from threading import Lock

from sentence_transformers import SentenceTransformer


_model = None
_model_lock = Lock()


def get_embedding_model():
    """Return the process-wide embedding model, loading it on first use."""
    global _model

    if _model is None:
        with _model_lock:
            if _model is None:
                _model = SentenceTransformer("all-MiniLM-L6-v2")

    return _model
