from __future__ import annotations

import asyncio
import base64
import os
import tempfile

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from core.config import get_settings

router = APIRouter(prefix="/api/v1/transform", tags=["transform"])

SPACE = "InstantX/InstantID"


def _client():
    from gradio_client import Client
    token = get_settings().hf_token
    return Client(SPACE, hf_token=token or None)


def _run_prediction(image_path: str, prompt: str, style: str) -> str:
    from gradio_client import handle_file
    client = _client()
    result = client.predict(
        handle_file(image_path),                            # face_image_path
        None,                                               # pose_image_path
        prompt,                                             # prompt
        "(lowres, low quality, worst quality:1.2), watermark, deformed, ugly",
        style,                                              # style_name
        20,                                                 # num_steps
        0.8,                                                # identitynet_strength_ratio
        0.8,                                                # adapter_strength_ratio
        0.4,                                                # canny_strength
        0.4,                                                # depth_strength
        ["depth"],                                          # controlnet_selection
        5.0,                                                # guidance_scale
        42,                                                 # seed
        "EulerDiscreteScheduler",                           # scheduler
        False,                                              # enable_lcm
        True,                                               # enhance_face_region
        api_name="/generate_image",
    )
    return result[0]


@router.post("")
async def transform_image(
    file: UploadFile = File(...),
    prompt: str = Form(...),
    style: str = Form("(No style)"),
):
    image_bytes = await file.read()

    suffix = os.path.splitext(file.filename or "img.jpg")[1] or ".jpg"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(image_bytes)
        tmp_path = tmp.name

    try:
        out_path = await asyncio.to_thread(_run_prediction, tmp_path, prompt, style)
    except Exception as e:
        raise HTTPException(500, str(e)[:300])
    finally:
        os.unlink(tmp_path)

    if not out_path or not os.path.exists(out_path):
        raise HTTPException(500, "Space không trả về ảnh")

    ext = os.path.splitext(out_path)[1].lower()
    mime = {"webp": "image/webp", "png": "image/png"}.get(ext.lstrip("."), "image/jpeg")

    with open(out_path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode()

    return {"image_url": f"data:{mime};base64,{b64}"}
