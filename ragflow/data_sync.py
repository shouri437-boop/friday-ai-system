import os
import sys
import time
import requests

RAGFLOW_HOST = os.environ.get("RAGFLOW_HOST", "http://localhost:9380")
API_KEY = os.environ.get("RAGFLOW_API_KEY", "ragflow-a7b64a82881540b88840ee24d3069b4b")
DATA_DIR = os.environ.get("DATA_DIR", "/ragflow/data")

HEADERS = {
    "Authorization": f"Bearer {API_KEY}"
}

def clean_dataset_name(filename: str) -> str:
    name, _ = os.path.splitext(filename)
    clean_name = name.replace("-", "_").replace(".", "_").replace(" ", "_")
    return clean_name.lower()

def main():
    print(f"=== Syncing PDFs from {DATA_DIR} to RAGFlow Datasets ===")
    if not os.path.exists(DATA_DIR):
        print(f"Error: Directory {DATA_DIR} does not exist.")
        sys.exit(1)

    pdf_files = [f for f in os.listdir(DATA_DIR) if f.lower().endswith(".pdf")]
    print(f"Found {len(pdf_files)} PDF files: {pdf_files}")

    # Fetch existing datasets
    resp = requests.get(f"{RAGFLOW_HOST}/api/v1/datasets?page=1&page_size=100", headers=HEADERS)
    if resp.status_code != 200 or resp.json().get("code") != 0:
        print(f"Failed to fetch datasets: {resp.text}")
        sys.exit(1)

    existing_ds_map = {ds["name"]: ds for ds in resp.json()["data"]}

    created_datasets = {}

    for pdf_name in pdf_files:
        ds_name = clean_dataset_name(pdf_name)
        pdf_path = os.path.join(DATA_DIR, pdf_name)
        print(f"\n--- Processing '{pdf_name}' -> Dataset '{ds_name}' ---")

        if ds_name in existing_ds_map:
            ds = existing_ds_map[ds_name]
            print(f"Dataset '{ds_name}' already exists (ID: {ds['id']}).")
        else:
            create_payload = {
                "name": ds_name,
                "description": f"Dataset automatically created for {pdf_name}",
                "permission": "me",
                "chunk_method": "naive"
            }
            c_resp = requests.post(f"{RAGFLOW_HOST}/api/v1/datasets", headers=HEADERS, json=create_payload)
            if c_resp.status_code != 200 or c_resp.json().get("code") != 0:
                print(f"Failed to create dataset '{ds_name}': {c_resp.text}")
                continue
            ds = c_resp.json()["data"]
            print(f"Created Dataset '{ds_name}' (ID: {ds['id']}).")

        dataset_id = ds["id"]
        created_datasets[ds_name] = dataset_id

        # Check existing documents in dataset
        docs_resp = requests.get(f"{RAGFLOW_HOST}/api/v1/datasets/{dataset_id}/documents", headers=HEADERS)
        existing_docs = docs_resp.json().get("data", {}).get("docs", []) if docs_resp.status_code == 200 else []
        doc_found = any(d["name"] == pdf_name for d in existing_docs)

        if doc_found:
            print(f"Document '{pdf_name}' is already uploaded to dataset '{ds_name}'.")
            doc_id = next(d["id"] for d in existing_docs if d["name"] == pdf_name)
        else:
            print(f"Uploading '{pdf_name}'...")
            with open(pdf_path, "rb") as f:
                files = {"file": (pdf_name, f, "application/pdf")}
                u_resp = requests.post(f"{RAGFLOW_HOST}/api/v1/datasets/{dataset_id}/documents", headers=HEADERS, files=files)
            
            if u_resp.status_code != 200 or u_resp.json().get("code") != 0:
                print(f"Failed to upload document '{pdf_name}': {u_resp.text}")
                continue
            
            uploaded_docs = u_resp.json()["data"]
            doc_id = uploaded_docs[0]["id"] if isinstance(uploaded_docs, list) else uploaded_docs["id"]
            print(f"Uploaded document '{pdf_name}' (ID: {doc_id}).")

        # Parse / index document
        print(f"Triggering indexing for document ID: {doc_id}...")
        parse_payload = {
            "document_ids": [doc_id],
            "run": "1"
        }
        p_resp = requests.post(f"{RAGFLOW_HOST}/api/v1/datasets/{dataset_id}/chunks", headers=HEADERS, json=parse_payload)
        if p_resp.status_code == 200 and p_resp.json().get("code") == 0:
            print(f"Parsing/indexing task started for '{pdf_name}'.")
        else:
            print(f"Notice on parsing trigger for '{pdf_name}': {p_resp.text}")

    print("\n=== Dataset Sync Summary ===")
    for ds_name, ds_id in created_datasets.items():
        print(f"Dataset Name: {ds_name} | Dataset ID: {ds_id}")

if __name__ == "__main__":
    main()
