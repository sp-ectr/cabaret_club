import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

GUEST_ID = "11111111-1111-4111-8111-111111111111"
TAB_ID = "22222222-2222-4222-8222-222222222222"

HEADERS = {
    "X-Guest-ID": GUEST_ID,
    "X-Tab-ID": TAB_ID,
}

@pytest.mark.asyncio
async def test_invalid_guest_id_returns_401():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/game/init", headers={"X-Guest-ID": "invalid-uuid"})
    assert response.status_code == 401
    data = response.json()
    assert data["error"]["code"] == "INVALID_GUEST_ID"

@pytest.mark.asyncio
async def test_health_check():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"