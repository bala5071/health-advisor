import argparse
import os
from pathlib import Path

import torch
from transformers import AutoProcessor, PaliGemmaForConditionalGeneration


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model_id", required=True, help="e.g. google/paligemma-2b")
    parser.add_argument("--output_dir", required=True)
    parser.add_argument("--opset", type=int, default=17)
    parser.add_argument("--image_size", type=int, default=224)
    parser.add_argument("--seq_len", type=int, default=32)
    parser.add_argument(
        "--device_map",
        default=None,
        help='Transformers device_map. Use "auto" to load directly onto GPU and reduce CPU RAM usage.',
    )
    parser.add_argument(
        "--max_cuda_gb",
        type=float,
        default=None,
        help="If set, limits CUDA memory budget (GiB) and offloads remaining weights to CPU to avoid OOM (recommended for 8GB GPUs).",
    )
    args = parser.parse_args()

    hf_token = os.environ.get("HF_TOKEN")
    if not hf_token:
        raise SystemExit("HF_TOKEN env var is required to download PaliGemma weights.")

    out_dir = Path(args.output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    onnx_path = out_dir / "paligemma.onnx"
    offload_dir = out_dir / "offload"
    offload_dir.mkdir(parents=True, exist_ok=True)

    device = "cuda" if torch.cuda.is_available() else "cpu"
    dtype = torch.float16 if device == "cuda" else torch.float32
    device_map = args.device_map
    if isinstance(device_map, str) and device_map.lower() in {"none", "null"}:
        device_map = None

    max_memory = None
    if args.max_cuda_gb is not None and device_map is not None:
        # Keep some headroom for allocator + temporary buffers.
        max_memory = {
            0: f"{args.max_cuda_gb}GiB",
            "cpu": "64GiB",
        }

    processor = AutoProcessor.from_pretrained(args.model_id, token=hf_token)
    model = PaliGemmaForConditionalGeneration.from_pretrained(
        args.model_id,
        token=hf_token,
        torch_dtype=dtype,
        device_map=device_map,
        max_memory=max_memory,
        offload_folder=str(offload_dir) if device_map is not None else None,
        low_cpu_mem_usage=True,
    )
    if device_map is None:
        model = model.to(device)
    model.eval()

    # Dummy inputs (forward pass export only)
    # Note: This exports the *forward* graph. Mobile generation needs a token loop or an export with past_key_values.
    batch = 1
    seq_len = args.seq_len
    image_size = args.image_size

    input_ids = torch.ones((batch, seq_len), dtype=torch.int64, device=device)
    attention_mask = torch.ones((batch, seq_len), dtype=torch.int64, device=device)
    pixel_values = torch.zeros((batch, 3, image_size, image_size), dtype=torch.float32, device=device)

    # Names are chosen to be explicit; your RN runtime should feed these exact names.
    input_names = ["input_ids", "attention_mask", "pixel_values"]
    output_names = ["logits"]

    dynamic_axes = {
        "input_ids": {0: "batch", 1: "seq"},
        "attention_mask": {0: "batch", 1: "seq"},
        "pixel_values": {0: "batch", 2: "height", 3: "width"},
        "logits": {0: "batch", 1: "seq"},
    }

    with torch.no_grad():
        torch.onnx.export(
            model,
            (input_ids, attention_mask, pixel_values),
            f=str(onnx_path),
            export_params=True,
            opset_version=args.opset,
            do_constant_folding=True,
            input_names=input_names,
            output_names=output_names,
            dynamic_axes=dynamic_axes,
        )

    print(f"Exported ONNX to: {onnx_path}")
    print("NOTE: This is a forward-pass ONNX. For text generation on-device, you will likely need an export that supports KV cache (past_key_values) and a generation loop.")


if __name__ == "__main__":
    main()
