import asyncio
import ollama
import json
from RAGPipeline import RAG_Pipeline
from llama_index.core.llms import ChatMessage
from llama_index.llms.google_genai import GoogleGenAI
from dotenv import load_dotenv
import os

load_dotenv()
# Evaluation Questions based on cleaned_notion_notes.txt
TEST_QUESTIONS = [
    "What are the core concepts of Generative AI according to the notes?",
    "What is the difference between augmentation and automation in AI?",
    "Explain Retrieval Augmented Generation (RAG) as described in the notes.",
    "What is Mixture of Experts (MoE) and what are its risks?",
    "What is Chain of Thought reasoning?"
]

# Judge Configuration
JUDGE_PROVIDER = "gemini" if os.getenv("GOOGLE_API_KEY") else "ollama"
JUDGE_MODEL = "models/gemini-2.0-flash" if JUDGE_PROVIDER == "gemini" else "gemma4:e4b"

async def get_judge_score(prompt):
    try:
        if JUDGE_PROVIDER == "gemini":
            # Adhere to 5 RPM limit (1 request every 12 seconds)
            await asyncio.sleep(12)
            client = GoogleGenAI(model=JUDGE_MODEL, api_key=os.getenv("GOOGLE_API_KEY"))
            response = await client.achat(messages=[
                ChatMessage(role="system", content="You are a strict AI evaluator. Return only a single integer from 1 to 5."),
                ChatMessage(role="user", content=prompt)
            ])
            content = response.message.content.strip()
        else:
            # Create an async client with a long timeout (1 hour)
            client = ollama.AsyncClient(timeout=3600)
            response = await client.chat(model=JUDGE_MODEL, messages=[
                {'role': 'system', 'content': 'You are a strict AI evaluator. Return only a single integer from 1 to 5.'},
                {'role': 'user', 'content': prompt}
            ])
            content = response['message']['content'].strip()
        
        # Try to extract the first digit found
        import re
        match = re.search(r'\d', content)
        if match:
            return int(match.group())
        return 0
    except Exception as e:
        print(f"Error getting judge score: {e}")
        return 0

async def evaluate_rag(model_to_test="ollama"):
    print(f"Starting Evaluation Pipeline...")
    print(f"-> Testing Model: {model_to_test}")
    print(f"-> Using Judge:  {JUDGE_PROVIDER} ({JUDGE_MODEL})")
    
    agent, query_engine = RAG_Pipeline(model_provider=model_to_test)
    
    results = []

    for i, question in enumerate(TEST_QUESTIONS):
        print(f"\n[{i+1}/{len(TEST_QUESTIONS)}] Testing Question: {question}")
        
        # 1. Get Context and Answer
        print(f"   -> Generating answer...")
        if model_to_test == "gemini":
            await asyncio.sleep(60)
        response = await query_engine.aquery(question)
        answer = str(response)
        context = "\n---\n".join([node.node.get_content() for node in response.source_nodes])
        
        # 2. Evaluate Context Relevance
        print(f"   -> Judging Context Relevance...")
        context_rel_prompt = f"""
        Rate the relevance of the retrieved context to the user's question.
        Question: {question}
        Context: {context}
        Score (1-5):
        1: Context is completely irrelevant.
        5: Context contains all necessary information to answer the question perfectly.
        Return ONLY the integer score.
        """
        context_relevance = await get_judge_score(context_rel_prompt)
        
        # 3. Evaluate Groundedness
        print(f"   -> Judging Groundedness...")
        groundedness_prompt = f"""
        Rate if the answer is grounded in the provided context.
        Context: {context}
        Answer: {answer}
        Score (1-5):
        1: Answer contains information not in the context or contradicts it.
        5: Answer is entirely derived from the context and accurate to it.
        Return ONLY the integer score.
        """
        groundedness = await get_judge_score(groundedness_prompt)
        
        # 4. Evaluate Answer Relevance
        print(f"   -> Judging Answer Relevance...")
        answer_rel_prompt = f"""
        Rate how well the answer addresses the question.
        Question: {question}
        Answer: {answer}
        Score (1-5):
        1: Answer does not address the question at all.
        5: Answer perfectly and concisely answers the question.
        Return ONLY the integer score.
        """
        answer_relevance = await get_judge_score(answer_rel_prompt)
        
        result = {
            "question": question,
            "answer": answer,
            "scores": {
                "context_relevance": context_relevance,
                "groundedness": groundedness,
                "answer_relevance": answer_relevance
            }
        }
        results.append(result)
        print(f"   Scores -> Context: {context_relevance}, Groundedness: {groundedness}, Answer: {answer_relevance}")

    # Calculate Totals
    avg_ctx = sum(r['scores']['context_relevance'] for r in results) / len(results)
    avg_grd = sum(r['scores']['groundedness'] for r in results) / len(results)
    avg_ans = sum(r['scores']['answer_relevance'] for r in results) / len(results)
    
    print("\n" + "="*50)
    print("FINAL EVALUATION SUMMARY")
    print("="*50)
    print(f"Average Context Relevance: {avg_ctx:.2f}/5")
    print(f"Average Groundedness:       {avg_grd:.2f}/5")
    print(f"Average Answer Relevance:   {avg_ans:.2f}/5")
    print(f"Overall RAG Triad Score:    {(avg_ctx + avg_grd + avg_ans) / 3:.2f}/5")
    print("="*50)

    with open("eval_results.json", "w") as f:
        json.dump(results, f, indent=4)
    print("Detailed results saved to eval_results.json")

if __name__ == "__main__":
    # You can change this to "gemini" to test your new Gemini integration
    # Or keep it "ollama" to test your local Gemma model
    MODEL_TO_TEST = "gemini" 
    asyncio.run(evaluate_rag(model_to_test=MODEL_TO_TEST))
