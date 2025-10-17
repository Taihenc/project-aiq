#!/usr/bin/env python
"""
Test script for running CrewAI agents locally with chat loop.
Usage: python main.py
Type 'exit', 'quit', or 'q' to end the conversation.
"""
from datetime import datetime

from crew import DocumentSearchCrew


def run():
    """
    Run the crew in a continuous chat loop with chat history.
    """
    print("=" * 60)
    print("🚀 Starting Document Search Chat")
    print("=" * 60)
    print("💬 Chat history is tracked - Context is maintained!")
    print("📝 Type 'exit', 'quit', or 'q' to end the chat\n")

    # Initialize crew instance
    crew_instance = DocumentSearchCrew()

    # Maintain chat history as a list
    chat_history = []
    conversation_count = 0

    while True:
        try:
            # Get user input
            print("-" * 60)
            user_query = input("You: ").strip()

            # Check for exit commands
            if user_query.lower() in ["exit", "quit", "q"]:
                print("\n👋 Goodbye! Thanks for chatting!")
                break

            # Skip empty queries
            if not user_query:
                print("⚠️  Please enter a question or message.\n")
                continue

            conversation_count += 1
            print(f"\n⏰ [{datetime.now().strftime('%H:%M:%S')}] Processing...\n")

            # Prepare inputs with chat history
            inputs = {
                "user_query": user_query,
                "chat_history": chat_history,
                "context": "",
            }

            # Run crew
            result = crew_instance.crew().kickoff(inputs=inputs)

            # Add to chat history
            chat_history.append({"role": "user", "content": user_query})
            chat_history.append({"role": "assistant", "content": str(result)})

            # Display result
            print("\n" + "=" * 60)
            print(f"🤖 Assistant (Turn {conversation_count}):")
            print("=" * 60)
            print(f"{result}\n")

        except KeyboardInterrupt:
            print("\n\n👋 Chat interrupted. Goodbye!")
            break

        except Exception as e:
            print("\n" + "=" * 60)
            print("❌ Error occurred")
            print("=" * 60)
            print(f"{type(e).__name__}: {str(e)}\n")
            print("💡 You can continue chatting or type 'exit' to quit.\n")


if __name__ == "__main__":
    run()
