from notion_client import Client
import json

import os
from dotenv import load_dotenv

load_dotenv()

token = os.getenv("NOTION_TOKEN")
page_id = os.getenv("NOTION_PAGE_ID")

if not token or not page_id:
    print("Warning: NOTION_TOKEN or NOTION_PAGE_ID not found in environment variables.")

client = Client(auth=token)

def get_all_pages_content(page_id):

    content_list = []

    blocks = get_page_content(page_id)

    notion_pages_list = []

    for result in blocks['results']:
        if result['type'] == 'child_page':
            notion_pages_list.append({
                "title": result['child_page']['title'],
                "id": result['id']
            })

    for page in notion_pages_list:
        content_list.append(get_page_content(page['id']))

    return content_list

def get_page_content(page_id):
    
    blocks = client.blocks.children.list(block_id=page_id)

    return blocks

# def get_files_content(file_id):

def save_to_json(data, filename="notion_data.json"):
    """Saves the provided data to a formatted JSON file."""
    try:
        with open(filename, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
        print(f"Successfully saved data to {filename}")
    except Exception as e:
        print(f"Error saving to JSON: {e}")
import requests

def extract_notebook_text(url):
    """Downloads and extracts text from an .ipynb file."""
    try:
        response = requests.get(url, timeout=15)
        if response.status_code == 200:
            nb_data = response.json()
            cells = nb_data.get("cells", [])
            text_content = []
            for cell in cells:
                cell_type = cell.get("cell_type")
                source = cell.get("source", [])
                if isinstance(source, list):
                    source = "".join(source)
                
                if cell_type == "markdown":
                    text_content.append(f"\n[Notebook Markdown]:\n{source}")
                elif cell_type == "code":
                    text_content.append(f"\n[Notebook Code]:\n{source[:500]}{'...' if len(source) > 500 else ''}")
            return "\n".join(text_content)
        else:
            print(f"Failed to download notebook (Status: {response.status_code}). URL might be expired.")
    except Exception as e:
        print(f"Error parsing notebook: {e}")
    return ""

def process_notion_data(filename="notion_data.json"):
    """
    Reads the raw Notion JSON data and extracts only the text and titles.
    Also parses attached .ipynb files.
    """
    try:
        with open(filename, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception as e:
        return f"Error reading JSON: {e}"

    cleaned_notes = []

    # The data is a list of block-list objects
    for block_list in data:
        if not isinstance(block_list, dict):
            continue
            
        results = block_list.get("results", [])
        for block in results:
            block_type = block.get("type")
            if not block_type:
                continue

            # Handle text-based blocks
            content_info = block.get(block_type)
            if not content_info:
                continue

            if isinstance(content_info, dict) and "rich_text" in content_info:
                text_parts = [t.get("plain_text", "") for t in content_info["rich_text"]]
                full_text = "".join(text_parts).strip()
                if full_text:
                    if block_type.startswith("heading"):
                        cleaned_notes.append(f"\n# {full_text}")
                    else:
                        cleaned_notes.append(full_text)

            # Handle child page titles
            elif block_type == "child_page":
                title = content_info.get("title", "")
                if title:
                    cleaned_notes.append(f"\n\n--- PAGE: {title} ---")

            # Handle attached files (especially notebooks)
            elif block_type == "file":
                file_info = block.get("file", {})
                # Notion files can be internal or external
                file_url = file_info.get("file", {}).get("url") or file_info.get("external", {}).get("url")
                
                if file_url:
                    # Check if it's a notebook
                    clean_url = file_url.split("?")[0].lower()
                    if clean_url.endswith(".ipynb"):
                        print(f"Extracting notebook content from: {clean_url}")
                        notebook_text = extract_notebook_text(file_url)
                        if notebook_text:
                            cleaned_notes.append(f"\n--- ATTACHED NOTEBOOK ---\n{notebook_text}\n--- END NOTEBOOK ---\n")

    return "\n".join(cleaned_notes)

def save_cleaned_data(text, filename="cleaned_notion_notes.txt"):
    """Saves the cleaned text content to a file."""
    try:
        with open(filename, "w", encoding="utf-8") as f:
            f.write(text)
        print(f"Successfully saved cleaned notes to {filename}")
    except Exception as e:
        print(f"Error saving cleaned data: {e}")
