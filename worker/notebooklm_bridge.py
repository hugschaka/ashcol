# גשר בין ה-worker (Node) ל-notebooklm-py:
# קורא פקודת JSON מ-stdin, מדפיס תוצאת JSON ל-stdout (לוגים ל-stderr בלבד)
import asyncio
import json
import os
import sys
import uuid

from notebooklm import NotebookLMClient

SOURCE_READY_TIMEOUT = 240.0
ARTIFACT_TIMEOUT = 600.0  # עד 10 דקות לתוצר


def log(msg: str) -> None:
    print(msg, file=sys.stderr, flush=True)


async def find_or_create_notebook(client: NotebookLMClient, title: str):
    notebooks = await client.notebooks.list()
    for nb in notebooks:
        if (getattr(nb, "title", "") or "").strip() == title:
            log(f"notebook קיים: {nb.id}")
            return nb
    nb = await client.notebooks.create(title)
    log(f"notebook חדש: {nb.id}")
    return nb


async def generate_one(client: NotebookLMClient, nb_id: str, kind: str, instructions: str, files_dir: str) -> dict:
    art = client.artifacts

    if kind == "PRESENTATION":
        status = await art.generate_slide_deck(nb_id, language="he", instructions=instructions)
    elif kind == "QUIZ":
        status = await art.generate_quiz(nb_id, instructions=instructions)
    elif kind == "FLASHCARDS":
        status = await art.generate_flashcards(nb_id, instructions=instructions)
    elif kind == "INFOGRAPHIC":
        status = await art.generate_infographic(nb_id, language="he", instructions=instructions)
    else:
        raise ValueError(f"unknown kind: {kind}")

    task_id = getattr(status, "task_id", None)
    log(f"{kind}: התחיל (task={task_id})")
    done = await art.wait_for_completion(nb_id, task_id, timeout=ARTIFACT_TIMEOUT)
    artifact_id = getattr(done, "artifact_id", None) or getattr(done, "id", None)
    log(f"{kind}: הושלם (artifact={artifact_id})")

    if kind == "QUIZ":
        path = os.path.join(files_dir, f"quiz-{uuid.uuid4().hex}.json")
        await art.download_quiz(nb_id, path, artifact_id, output_format="json")
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        os.remove(path)
        return {"type": kind, "content": {"notebooklm": data, "promptUsed": instructions}}

    if kind == "FLASHCARDS":
        path = os.path.join(files_dir, f"flashcards-{uuid.uuid4().hex}.json")
        await art.download_flashcards(nb_id, path, artifact_id, output_format="json")
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        os.remove(path)
        return {"type": kind, "content": {"notebooklm": data, "promptUsed": instructions}}

    if kind == "PRESENTATION":
        token = uuid.uuid4().hex
        saved = await art.download_slide_deck(nb_id, os.path.join(files_dir, f"slides-{token}.pdf"), artifact_id, output_format="pdf")
        content = {"format": "pdf", "promptUsed": instructions}
        # PPTX בנוסף — נפתח ב-PowerPoint וב-Google Slides
        try:
            pptx = await art.download_slide_deck(nb_id, os.path.join(files_dir, f"slides-{token}.pptx"), artifact_id, output_format="pptx")
            content["pptxFile"] = os.path.basename(pptx)
        except Exception as e:  # noqa: BLE001 — ה-PDF מספיק, PPTX הוא בונוס
            log(f"PRESENTATION: הורדת pptx נכשלה ({e})")
        return {
            "type": kind,
            "fileName": os.path.basename(saved),
            "content": content,
        }

    # INFOGRAPHIC — הספרייה קובעת את הסיומת; משתמשים בנתיב שחזר בפועל
    base = os.path.join(files_dir, f"infographic-{uuid.uuid4().hex}.png")
    saved = await art.download_infographic(nb_id, base, artifact_id)
    return {
        "type": kind,
        "fileName": os.path.basename(saved),
        "content": {"format": os.path.splitext(saved)[1].lstrip("."), "promptUsed": instructions},
    }


async def cmd_generate(data: dict) -> dict:
    files_dir = data["filesDir"]
    os.makedirs(files_dir, exist_ok=True)
    prompts = data["prompts"]

    async with NotebookLMClient.from_storage() as client:
        nb = await find_or_create_notebook(client, data["notebookTitle"])
        source = await client.sources.add_text(
            nb.id, data["sourceTitle"], data["sourceText"],
            wait=True, wait_timeout=SOURCE_READY_TIMEOUT,
        )
        log(f"source מוכן: {source.id}")

        kinds = [
            ("PRESENTATION", prompts["presentation"]),
            ("QUIZ", prompts["quiz"]),
            ("FLASHCARDS", prompts["flashcards"]),
            ("INFOGRAPHIC", prompts["infographic"]),
        ]
        results = await asyncio.gather(
            *(generate_one(client, nb.id, kind, instr, files_dir) for kind, instr in kinds)
        )
        return {"notebookId": nb.id, "assets": list(results)}


async def cmd_edit(data: dict) -> dict:
    files_dir = data["filesDir"]
    os.makedirs(files_dir, exist_ok=True)

    async with NotebookLMClient.from_storage() as client:
        asset = await generate_one(
            client, data["notebookId"], data["assetType"], data["prompt"], files_dir
        )
        return {"notebookId": data["notebookId"], "assets": [asset]}


async def main() -> None:
    data = json.load(sys.stdin)
    command = data.get("command")
    if command == "generate":
        result = await cmd_generate(data)
    elif command == "edit":
        result = await cmd_edit(data)
    else:
        raise ValueError(f"unknown command: {command}")
    print(json.dumps(result, ensure_ascii=False), flush=True)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as e:  # noqa: BLE001 — מחזירים שגיאה מסודרת ל-Node
        print(json.dumps({"error": f"{type(e).__name__}: {e}"}, ensure_ascii=False), flush=True)
        sys.exit(1)
