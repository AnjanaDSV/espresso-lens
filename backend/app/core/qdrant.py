from qdrant_client import QdrantClient
from qdrant_client.http import models as qmodels
from qdrant_client.http.exceptions import UnexpectedResponse
from app.core.config import settings

# Initialize Qdrant Client
qdrant_client = QdrantClient(host=settings.QDRANT_HOST, port=settings.QDRANT_PORT)


def init_qdrant_collections() -> None:
    """Initialize Qdrant collections for indexing video frame embeddings if they do not exist.

    We set a vector size of 512, which is standard for modern visual models
    (such as CLIP ViT-B/32) frequently used in frame-by-frame analysis.
    """
    collection_name = settings.QDRANT_COLLECTION

    try:
        # Check if collection already exists
        qdrant_client.get_collection(collection_name=collection_name)
    except (UnexpectedResponse, ValueError):
        # Create collection if it doesn't exist
        qdrant_client.recreate_collection(
            collection_name=collection_name,
            vectors_config=qmodels.VectorParams(
                size=512,  # 512 dimensions for CLIP vision embeddings
                distance=qmodels.Distance.COSINE,
            ),
        )
        print(f"Created Qdrant collection: {collection_name}")
