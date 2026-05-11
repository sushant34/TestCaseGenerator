#!/bin/sh
# Start Ollama server in background
ollama serve &
OLLAMA_PID=$!

echo "⏳ Waiting for Ollama to start..."
until ollama list > /dev/null 2>&1; do
  sleep 1
done
echo "✅ Ollama is up."

# Pull the default model if not already present
MODEL=${DEFAULT_MODEL:-llama3}
echo "📦 Checking model: $MODEL"
if ! ollama list | grep -q "$MODEL"; then
  echo "⬇️  Pulling $MODEL (this may take a few minutes on first run)..."
  ollama pull "$MODEL"
  echo "✅ $MODEL ready."
else
  echo "✅ $MODEL already available."
fi

echo "🚀 Test Case Generator AI is ready!"
# Keep ollama running in foreground
wait $OLLAMA_PID
