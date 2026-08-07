"""
FRIDAY Production Groq Multi-Key Engine with Rate-Limit Fallback.

Strict Groq API Key to Model Mapping with Automatic Fallback:
- llama-3.1-8b-instant   -> GROQ_API_KEY_FAST (Fallback to llama-3.3-70b-versatile on 429 Rate Limit)
- llama-3.1-70b-versatile -> GROQ_API_KEY_HEAVY
- mixtral-8x7b-32768      -> GROQ_API_KEY_BALANCED
"""
import os
import time
import httpx
from typing import Tuple, Dict
from dotenv import load_dotenv

load_dotenv()


class RealGroqEngine:
    """
    Production Groq Engine with rate limit resilience and key rotation.
    """

    MODEL_KEY_MAP: Dict[str, Tuple[str, str]] = {
        "llama-3.1-8b-instant": ("llama-3.1-8b-instant", "GROQ_API_KEY_FAST"),
        "fast": ("llama-3.1-8b-instant", "GROQ_API_KEY_FAST"),
        "llama-3.1-70b-versatile": ("llama-3.3-70b-versatile", "GROQ_API_KEY_HEAVY"),
        "heavy": ("llama-3.3-70b-versatile", "GROQ_API_KEY_HEAVY"),
        "mixtral-8x7b": ("llama-3.3-70b-versatile", "GROQ_API_KEY_BALANCED"),
        "mixtral-8x7b-32768": ("llama-3.3-70b-versatile", "GROQ_API_KEY_BALANCED"),
        "balanced": ("llama-3.3-70b-versatile", "GROQ_API_KEY_BALANCED"),
    }

    def generate(self, model: str, question: str, system_prompt: str = "") -> Tuple[str, str]:
        """
        Executes a real Groq API request with rate limit handling and multi-key fallback.
        """
        load_dotenv()

        model_key = model.strip().lower()
        if model_key not in self.MODEL_KEY_MAP:
            model_key = "llama-3.1-8b-instant"

        groq_model_id, env_var_name = self.MODEL_KEY_MAP[model_key]

        # Gather available Groq API keys
        available_keys = [
            os.getenv(env_var_name, "").strip(),
            os.getenv("GROQ_API_KEY_HEAVY", "").strip(),
            os.getenv("MY_API_KEY", "").strip(),
            os.getenv("GROQ_API_KEY_BALANCED", "").strip(),
            os.getenv("GROQ_API_KEY_FAST", "").strip(),
        ]
        available_keys = [k for k in available_keys if k]

        if not available_keys:
            raise RuntimeError(f"Missing API key '{env_var_name}' for Groq model '{groq_model_id}'.")

        url = "https://api.groq.com/openai/v1/chat/completions"
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": question})

        # Try models: primary requested model first, then llama-3.3-70b-versatile fallback
        models_to_try = [groq_model_id]
        if groq_model_id != "llama-3.3-70b-versatile":
            models_to_try.append("llama-3.3-70b-versatile")

        for current_model in models_to_try:
            for key in available_keys:
                headers = {
                    "Authorization": f"Bearer {key}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "model": current_model,
                    "messages": messages,
                    "temperature": 0.3,
                    "max_tokens": 1024
                }

                try:
                    with httpx.Client(timeout=20.0) as client:
                        resp = client.post(url, headers=headers, json=payload)
                        if resp.status_code == 200:
                            data = resp.json()
                            answer = data["choices"][0]["message"]["content"]
                            return answer.strip(), current_model
                        elif resp.status_code == 429:
                            time.sleep(1.0)
                            continue  # Try next available API key or fallback model
                except httpx.HTTPError:
                    time.sleep(1.0)
                    continue

        raise RuntimeError("Groq API request rate limit reached across keys. Please try again shortly.")


# Singleton live engine instance
llm_engine = RealGroqEngine()
