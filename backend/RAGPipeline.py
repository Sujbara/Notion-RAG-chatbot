import ollama
import chromadb
import os
import hashlib
from dotenv import load_dotenv
from llama_index.core import VectorStoreIndex, SimpleDirectoryReader, Settings, StorageContext, load_index_from_storage
from llama_index.vector_stores.chroma import ChromaVectorStore
from llama_index.llms.ollama import Ollama
from llama_index.llms.google_genai import GoogleGenAI
from llama_index.embeddings.ollama import OllamaEmbedding
from llama_index.core.agent.workflow import AgentWorkflow
from llama_index.core.node_parser import SentenceSplitter

load_dotenv()
DB_PATH = "./chroma_db"
HASH_FILE = "./chroma_db/file_hash.txt"

_agent = None
_query_engine = None

def get_file_hash(filepath):
    if not os.path.exists(filepath):
        return None
    with open(filepath, "rb") as f:
        return hashlib.md5(f.read()).hexdigest()

def RAG_Pipeline(model_provider="ollama"):
    global _agent, _query_engine
    if _agent is not None:
        return _agent, _query_engine

    # 1. Setup Persistent Storage
    if not os.path.exists(DB_PATH):
        os.makedirs(DB_PATH)
        
    chroma_client = chromadb.PersistentClient(path=DB_PATH)
    chroma_collection = chroma_client.get_or_create_collection("rag_notes")
    vector_store = ChromaVectorStore(chroma_collection=chroma_collection)

    # 2. Setup Settings
    if model_provider == "gemini":
        print("Using Gemini model (gemini-2.0-flash-lite)...")
        Settings.llm = GoogleGenAI(model="models/gemini-2.0-flash-lite", api_key=os.getenv("GOOGLE_API_KEY"))
    else:
        print(f"Using Ollama model (gemma4:e2b)...")
        Settings.llm = Ollama(model="gemma4:e2b", stream=True, request_timeout=3600.0, context_window= 8000, base_url="http://localhost:11434")
    
    Settings.embed_model = OllamaEmbedding(model_name="nomic-embed-text:latest", base_url="http://localhost:11434")
    
    # Configure chunking strategy
    Settings.node_parser = SentenceSplitter(chunk_size=512, chunk_overlap=50)

    # 3. Check if we need to re-index
    notes_path = "./cleaned_notion_notes.txt"
    current_hash = get_file_hash(notes_path)
    
    saved_hash = None
    if os.path.exists(HASH_FILE):
        with open(HASH_FILE, "r") as f:
            saved_hash = f.read().strip()

    # If the collection is empty OR the file has changed, (re)index
    if chroma_collection.count() == 0 or current_hash != saved_hash:
        print("Indexing documents (this might take a moment)...")
        if chroma_collection.count() > 0:
            chroma_client.delete_collection("rag_notes")
            chroma_collection = chroma_client.create_collection("rag_notes")
            vector_store = ChromaVectorStore(chroma_collection=chroma_collection)

        documents = SimpleDirectoryReader(input_files=[notes_path]).load_data()
        storage_context = StorageContext.from_defaults(vector_store=vector_store)
        index = VectorStoreIndex.from_documents(
            documents, 
            storage_context=storage_context, 
            embed_model=Settings.embed_model,
            transformations=[Settings.node_parser]
        )
        if current_hash:
            with open(HASH_FILE, "w") as f:
                f.write(current_hash)
    else:
        print("Loading existing index from persistent storage...")
        index = VectorStoreIndex.from_vector_store(
            vector_store, 
            embed_model=Settings.embed_model
        )

    # Fast Mode: Direct Query Engine
    _query_engine = index.as_query_engine(similarity_top_k=5, streaming=True)

    # Agent Mode: Full Workflow
    retriever = index.as_retriever(similarity_top_k=5)
    async def search_notion(query: str):
        """Useful for searching through your notion notes to retrieve relevant information."""
        nodes = await retriever.aretrieve(query)
        return "\n\n".join([n.get_content() for n in nodes])

    system_prompt = (
        "You are a professional assistant specialized in retrieving information from private Notion notes.\n"
        "RULES:\n"
        "1. ONLY answer using the information retrieved from the search_notion tool.\n"
        "2. If the search results do not contain the answer, explicitly state: 'I am sorry, but I do not have that information in my notes.'\n"
        "3. You may summarize, reformat, or explain the relevant data, but do not add external facts.\n"
    )

    _agent = AgentWorkflow.from_tools_or_functions(
        [search_notion],
        llm = Settings.llm,
        system_prompt = system_prompt
    )

    return _agent, _query_engine



