"""
RAGFlow Retrieval Client Module for FRI GRAV Backend.
Connects to RAGFlow API service and retrieves dataset context chunks.
"""
import os
import logging
from typing import List, Dict, Any, Optional
import httpx

logger = logging.getLogger(__name__)

RAGFLOW_HOST = os.getenv("RAGFLOW_HOST", "http://localhost:9380")
RAGFLOW_API_KEY = os.getenv("RAGFLOW_API_KEY", "your_ragflow_api_key_here")


DATASET_NAME_MAP = {
    "AcademicAgent": ["b_tech_iii_year_academic_calendar_2026_2027", "ibtechece2042024_removed_removed"],
    "EventsAgent": ["vnrvjiet_events_calendar_2026", "2026_holidays_list"],
    "StudentServicesAgent": ["2026_holidays_list"],
    "KnowledgeAgent": ["b_tech_iii_year_academic_calendar_2026_2027", "2026_holidays_list", "ibtechece2042024_removed_removed"],
}


class RAGFlowClient:
    def __init__(self, host: str = RAGFLOW_HOST, api_key: str = RAGFLOW_API_KEY):
        self.host = host.rstrip("/")
        self.api_key = api_key
        self.headers = {"Authorization": f"Bearer {self.api_key}"}
        self.dataset_cache: Dict[str, str] = {}

    def _fetch_datasets(self) -> Dict[str, str]:
        if self.dataset_cache:
            return self.dataset_cache
        try:
            with httpx.Client(timeout=10.0) as client:
                resp = client.get(f"{self.host}/api/v1/datasets?page=1&page_size=100", headers=self.headers)
                if resp.status_code == 200 and resp.json().get("code") == 0:
                    for ds in resp.json()["data"]:
                        self.dataset_cache[ds["name"]] = ds["id"]
        except Exception as e:
            logger.error(f"Error fetching RAGFlow datasets: {e}")
        return self.dataset_cache

    def retrieve_context(self, question: str, agent_name: str = "", dataset_names: Optional[List[str]] = None, top_k: int = 4) -> str:
        all_ds_map = self._fetch_datasets()
        if not all_ds_map:
            return ""

        target_ds_names = dataset_names
        if not target_ds_names and agent_name in DATASET_NAME_MAP:
            target_ds_names = DATASET_NAME_MAP[agent_name]

        dataset_ids = []
        if target_ds_names:
            for name in target_ds_names:
                if name in all_ds_map:
                    dataset_ids.append(all_ds_map[name])
        else:
            dataset_ids = list(all_ds_map.values())

        if not dataset_ids:
            return ""

        retrieved_chunks = []
        try:
            with httpx.Client(timeout=10.0) as client:
                payload = {
                    "question": question,
                    "dataset_ids": dataset_ids,
                    "top_k": top_k
                }
                resp = client.post(f"{self.host}/api/v1/retrieval", headers=self.headers, json=payload)
                if resp.status_code == 200 and resp.json().get("code") == 0:
                    chunks_data = resp.json().get("data", {}).get("chunks", [])
                    for chunk in chunks_data:
                        content = chunk.get("content_with_weight") or chunk.get("content")
                        doc_name = chunk.get("docnm_kwd", "Document")
                        score = chunk.get("similarity", 0.0)
                        retrieved_chunks.append(f"📄 [Doc: {doc_name} | Score: {score:.2f}]\n{content}")
        except Exception as e:
            logger.error(f"Error retrieving context from RAGFlow: {e}")

        if not retrieved_chunks:
            return ""

        return "\n\n---\n".join(retrieved_chunks)


ragflow_client = RAGFlowClient()
