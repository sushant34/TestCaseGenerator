# ⬡ Test Case Generator — Local AI

> Agentic AI test case generator powered by Ollama (local LLM).
> Runs 100% on your machine — no API keys, no cloud, no cost.

---

## 🚀 Quick Start (Docker Desktop)

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- 8 GB+ RAM recommended (for llama3)
- ~5 GB disk space for the model

### 1. Clone / download this folder
```
test-case-generator/
├── docker-compose.yml
├── .env
├── ollama-init/
│   └── start.sh
└── ui/
    ├── Dockerfile
    ├── nginx.conf
    └── index.html
```

### 2. Start everything
```bash
cd test-case-generator
docker compose up --build
```

First run downloads the model (~4 GB for llama3). Grab a coffee ☕

### 3. Open the app
```
http://localhost:3000
```

The status bar at the top shows Ollama health. Once green — you're ready!

---

## 🔄 Changing the Model

Edit `.env`:
```
DEFAULT_MODEL=mistral    # or gemma3, qwen2, phi3
```
Then restart:
```bash
docker compose restart ollama
```

Or pull additional models without restarting:
```bash
docker exec test-case-generator-ollama ollama pull mistral
```
Then select it in the model dropdown in the UI.

---

## 🛑 Stop / Start

```bash
# Stop (keeps model data)
docker compose down

# Start again (model already downloaded — starts in seconds)
docker compose up

# Stop AND delete model data (full reset)
docker compose down -v
```

---

## 🏗️ Architecture

```
Browser
  └── http://localhost:3000
        └── nginx (test-case-generator-ui container)
              ├── /          → serves index.html (the app)
              └── /ollama/   → proxies to ollama:11434 (avoids CORS)
                                └── Ollama (test-case-generator-ollama container)
                                      └── llama3 / mistral / gemma3...
```

**Why nginx proxy?**
Browsers block direct calls to `localhost:11434` from a web page due to CORS.
Nginx proxies `/ollama/` → `ollama:11434` so the browser only talks to one origin.

---

## 🐛 Troubleshooting

| Problem | Fix |
|---|---|
| Status shows "Ollama offline" | Wait 30–60s on first start for model download |
| App won't open | Check `docker compose ps` — both containers should be `Up` |
| Model response is slow | Normal for CPU-only. Add GPU support (see below) |
| "Could not parse JSON" | Try mistral — it follows JSON instructions more reliably |
| Port 3000 in use | Change `"3000:80"` in docker-compose.yml to `"3001:80"` |

---

## ⚡ GPU Acceleration (optional, NVIDIA only)

Add this to the `ollama` service in `docker-compose.yml`:
```yaml
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]
```
Requires [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html).

---

## 📦 Model Recommendations

| Model | Size | Best for |
|---|---|---|
| llama3 | 4.7 GB | Best overall quality |
| mistral | 4.1 GB | Reliable JSON output ✅ |
| gemma3 | 3.3 GB | Faster, lighter |
| qwen2 | 4.4 GB | Good for structured tasks |
| phi3 | 2.3 GB | Fastest, smallest RAM |

---


