from notionNotes import process_notion_data, save_cleaned_data

if __name__ == "__main__":
    print("Processing notion_data.json...")
    cleaned_text = process_notion_data("notion_data.json")
    save_cleaned_data(cleaned_text, "cleaned_notion_notes.txt")
    print("Done!")
