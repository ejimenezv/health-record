"""Unit tests for src/rag/vector_store.py."""
from unittest.mock import MagicMock

import pytest

from src.rag.vector_store import VectorStoreClient


@pytest.fixture
def fake_client():
    client = MagicMock()
    collection = MagicMock()
    collection.query.return_value = {"documents": [["doc"]], "distances": [[0.1]]}
    collection.count.return_value = 42
    client.get_or_create_collection.return_value = collection
    return client, collection


@pytest.fixture
def store(fake_client):
    client, _ = fake_client
    return VectorStoreClient(client=client, collection_name="test_collection")


def test_collection_lazy_creation(store, fake_client):
    client, collection = fake_client
    # First access creates
    assert store.collection is collection
    # Second access uses cached
    assert store.collection is collection
    client.get_or_create_collection.assert_called_once()


def test_add_documents(store, fake_client):
    _, collection = fake_client
    store.add_documents(
        ids=["1", "2"],
        embeddings=[[0.1] * 3, [0.2] * 3],
        documents=["doc1", "doc2"],
        metadatas=[{}, {}],
    )
    collection.add.assert_called_once()


def test_query_sync(store, fake_client):
    _, collection = fake_client
    result = store.query(query_embedding=[0.1, 0.2, 0.3], n_results=3)
    assert "documents" in result
    collection.query.assert_called_once()


@pytest.mark.asyncio
async def test_query_async(store, fake_client):
    _, collection = fake_client
    result = await store.query_async(
        query_embedding=[0.1, 0.2, 0.3],
        n_results=5,
        where={"type": "med"},
    )
    assert "documents" in result
    collection.query.assert_called_once()


def test_count(store, fake_client):
    _, collection = fake_client
    assert store.count() == 42


def test_delete(store, fake_client):
    _, collection = fake_client
    store.delete(["id1", "id2"])
    collection.delete.assert_called_once_with(ids=["id1", "id2"])


def test_reset(store, fake_client):
    client, _ = fake_client
    # Trigger collection creation
    _ = store.collection
    store.reset()
    client.delete_collection.assert_called_once_with("test_collection")
    assert store._collection is None
