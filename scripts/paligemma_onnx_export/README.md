# PaliGemma ONNX Export (Local)

This folder contains a **local** export pipeline to generate ONNX artifacts for on-device inference.

## Why you must export locally
PaliGemma model weights are distributed under terms that typically require you to **accept a license** and often authenticate (Hugging Face token). Because of that, the ONNX file cannot be bundled here.

## Prerequisites
- Windows users: **WSL2 (Ubuntu)** recommended.
- Python 3.10+.
- Enough disk space (several GB free).

## Environment variables
Set your Hugging Face token:

- `HF_TOKEN` (required)

Example:

```bash
export HF_TOKEN="<your_hf_token>"
```

## Install deps
From this directory:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Export
This produces an ONNX graph for the forward pass (logits). It is a **building block** for a full mobile VLM pipeline.

```bash
python export_paligemma_to_onnx.py \
  --model_id google/paligemma-2b \
  --output_dir ./artifacts \
  --opset 17
```

## Quantize (optional)
```bash
python quantize_onnx.py \
  --input ./artifacts/paligemma.onnx \
  --output ./artifacts/paligemma.int8.onnx
```

## Upload to Supabase Storage
Upload the resulting `.onnx` to your Supabase Storage bucket (e.g. `models/`).

Then set in your app environment:

```env
EXPO_PUBLIC_PALIGEMMA_MODEL_URL=<public_supabase_storage_url_to_model>
```

## Notes
- Full PaliGemma VLM inference typically requires tokenizer + generation loop. The ONNX export here is the core model forward pass.
- If you want me to complete the **mobile generation loop**, I’ll need the final model signature (input/output names and shapes) produced by your exported ONNX.
