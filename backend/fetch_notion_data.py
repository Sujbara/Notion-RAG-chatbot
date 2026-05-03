from notionNotes import get_all_pages_content, save_to_json
import os

if __name__ == "__main__":
    # PAGE_ID = "341ca25dc5848028b7ebdb2a036e2376" # This was in notionNotes.py
    # But let's check if the user has a different one or if we should use the one from notionNotes
    from notionNotes import page_id
    
    print(f"Fetching data from Notion for page: {page_id}...")
    data = get_all_pages_content(page_id)
    save_to_json(data, "notion_data.json")
    print("Done! notion_data.json has been refreshed with fresh file URLs.")
