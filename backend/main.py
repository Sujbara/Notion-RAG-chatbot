from fastapi import FastAPI, Body, WebSocket, WebSocketDisconnect
import json
import ollama
from fastapi.responses import StreamingResponse
from RAGPipeline import RAG_Pipeline
from llama_index.core.agent.workflow import AgentStream
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Pre-initialize the RAG pipeline so the first request is fast
    print("Pre-initializing RAG Pipeline (indexing notes)...")
    RAG_Pipeline()
    yield

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.websocket("/ws/chat")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            request = json.loads(data)
            message = request.get("message")
            thinking_mode = request.get("thinking_mode", False)
            
            agent, query_engine = RAG_Pipeline()
            
            if thinking_mode:
                handler = agent.run(user_msg=message)
                async for event in handler.stream_events():
                    if isinstance(event, AgentStream):
                        if event.delta:
                            await websocket.send_text(event.delta)
            else:
                response = await query_engine.aquery(message)
                async for chunk in response.response_gen:
                    await websocket.send_text(chunk)
            
            # Send a special EOF token so the frontend knows we are done
            await websocket.send_text("[DONE]")
            
    except WebSocketDisconnect:
        print("Client disconnected")
    except Exception as e:
        print(f"WebSocket error: {e}")
        try:
            await websocket.send_text(f"Error: {str(e)}")
        except:
            pass

@app.post("/chat")
async def chat_endpoint(message: str = Body(..., embed=True), thinking_mode: bool = Body(False, embed=True)):
    agent, query_engine = RAG_Pipeline()
    
    async def generate_response():
        if thinking_mode:
            # Agent Mode (Slower, Reasoning)
            handler = agent.run(user_msg=message)
            async for event in handler.stream_events():
                if isinstance(event, AgentStream):
                    if event.delta:
                        yield event.delta
        else:
            # Fast Mode (Direct RAG)
            response = await query_engine.aquery(message)
            async for chunk in response.response_gen:
                yield chunk

    return StreamingResponse(generate_response(), media_type="text/plain")

