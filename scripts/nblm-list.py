# בדיקת תקינות חיבור NotebookLM: שליפת המחברות האחרונות
import asyncio

from notebooklm import NotebookLMClient


async def main() -> None:
    async with NotebookLMClient.from_storage() as client:
        notebooks = await client.notebooks.list()
        print(f"total notebooks: {len(notebooks)}")
        for nb in notebooks[:3]:
            title = getattr(nb, "title", "") or "(ללא שם)"
            print(f"- {nb.id} | {title}")


asyncio.run(main())
