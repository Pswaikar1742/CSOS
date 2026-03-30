import asyncio
import os

import asyncpg
from dotenv import load_dotenv

load_dotenv()


KRANTI_CHOWK_LAT = float(os.getenv("KRANTI_CHOWK_LAT", "19.8737"))
KRANTI_CHOWK_LNG = float(os.getenv("KRANTI_CHOWK_LNG", "75.3250"))
CIDCO_N6_LAT = float(os.getenv("CIDCO_N6_LAT", "19.8884"))
CIDCO_N6_LNG = float(os.getenv("CIDCO_N6_LNG", "75.3571"))


CSN_HOTSPOTS = [
    {
        "name": "Kranti Chowk",
        "lat": KRANTI_CHOWK_LAT,
        "lng": KRANTI_CHOWK_LNG,
        "zone": "Zone 1",
    },
    {
        "name": "CIDCO N-6",
        "lat": CIDCO_N6_LAT,
        "lng": CIDCO_N6_LNG,
        "zone": "Zone 4",
    },
    {"name": "Cannaught Place", "lat": 19.8932, "lng": 75.3621, "zone": "Zone 4"},
    {"name": "Nirala Bazar", "lat": 19.8789, "lng": 75.3330, "zone": "Zone 2"},
]


async def seed() -> None:
    conn = await asyncpg.connect(
        os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/csos")
    )

    await conn.execute(
        """
        CREATE TABLE IF NOT EXISTS verified_incidents (
            id SERIAL PRIMARY KEY,
            camera_id TEXT,
            threat_type TEXT,
            severity TEXT,
            lat FLOAT,
            lng FLOAT,
            timestamp TIMESTAMPTZ DEFAULT NOW(),
            department TEXT,
            agent_action TEXT,
            fine_amount TEXT
        );
        """
    )

    print("🚀 SEEDING CHHATRAPATI SAMBHAJINAGAR SPATIAL NODES...")
    for hotspot in CSN_HOTSPOTS:
        print(
            f"- {hotspot['name']} ({hotspot['zone']}) @ {hotspot['lat']}, {hotspot['lng']}"
        )

    print("✅ DATABASE INITIALIZED.")
    await conn.close()


if __name__ == "__main__":
    asyncio.run(seed())
