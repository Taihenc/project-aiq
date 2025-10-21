#!/usr/bin/env python
"""
Test script for running CrewAI agents locally with chat loop.
Usage: python app/test.py
Type 'exit', 'quit', or 'q' to end the conversation.
"""
from datetime import datetime


from app.services import CrewService


def test_crew_service():
    """Test function to verify CrewService works correctly"""
    try:
        print("🚀 Testing CrewService...")

        # Initialize service
        crew_service = CrewService()
        print("✓ CrewService initialized successfully")

        # Get crew configuration
        crew_config = crew_service.get_crew_config("document_search_crew")
        if crew_config:
            print("✓ Crew configuration loaded successfully")
            print(f"  - Crew name: {crew_config.name}")
            print(f"  - Process: {crew_config.process}")
            print(f"  - Tasks count: {len(crew_config.workflow)}")
        else:
            print("✗ Failed to load crew configuration")
            return False

        # Get crew instance
        crew = crew_service.get_crew("document_search_crew")
        if crew:
            print("✓ Crew instance created successfully")
            print(f"  - Tasks: {len(crew.tasks)}")

            # Test individual tasks and agents
            for i, task in enumerate(crew.tasks):
                print(f"  - Task {i+1}: {task.description[:50]}...")
                if task.agent:
                    print(f"    Agent Role: {task.agent.role}")
                    print(f"    Agent Goal: {task.agent.goal}")
                    print(f"    Agent Object ID: {id(task.agent)}")
                    print(f"    Agent Type: {type(task.agent)}")
                    print("    ---")
        else:
            print("✗ Failed to create crew instance")
            return False

        print("\n🎉 CrewService test passed! All dependencies working correctly.")
        return crew

    except Exception as e:
        print(f"✗ Error during testing: {e}")
        return None


def test_single_query():
    """
    Test the crew with a single query to debug agent roles.
    """
    print("=" * 60)
    print("🚀 Testing Crew with Single Query")
    print("=" * 60)

    # Test and initialize crew instance
    crew = test_crew_service()
    if not crew:
        print("❌ Failed to initialize crew. Exiting...")
        return

    # Test with a simple query
    test_query = "สวัสดี ผมชื่อพล คุณคือใคร"
    print(f"📝 Test Query: {test_query}")

    # Maintain chat history as a list
    chat_history = []

    try:
        print(f"\n⏰ [{datetime.now().strftime('%H:%M:%S')}] Processing...\n")

        # Prepare inputs with chat history
        inputs = {
            "user_query": test_query,
            "chat_history": chat_history,
            "context": "",
        }

        # Run crew
        result = crew.kickoff(inputs=inputs)

        # Display result
        print("\n" + "=" * 60)
        print("🤖 Assistant Response:")
        print("=" * 60)
        print(f"{result}\n")

    except Exception as e:
        print("\n" + "=" * 60)
        print("❌ Error occurred")
        print("=" * 60)
        print(f"{type(e).__name__}: {str(e)}\n")
        import traceback

        traceback.print_exc()


def run():
    """
    Run the crew in a continuous chat loop with chat history.
    """
    print("=" * 60)
    print("🚀 Starting Document Search Chat")
    print("=" * 60)
    print("💬 Chat history is tracked - Context is maintained!")
    print("📝 Type 'exit', 'quit', or 'q' to end the chat\n")

    # Test and initialize crew instance
    crew = test_crew_service()
    if not crew:
        print("❌ Failed to initialize crew. Exiting...")
        return

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
            result = crew.kickoff(inputs=inputs)

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


def main():
    """Main function that runs the test without waiting for input"""
    print("=" * 60)
    print("🚀 Testing Document Search Crew")
    print("=" * 60)

    # Test and initialize crew instance
    crew = test_crew_service()
    if not crew:
        print("❌ Failed to initialize crew. Exiting...")
        return

    print("\n🎉 Crew initialization successful!")
    print("✅ All components are working correctly.")
    print("\n📝 To run interactive chat, use: python app/test.py --interactive")


if __name__ == "__main__":
    import sys

    # Check if user wants interactive mode
    if len(sys.argv) > 1 and sys.argv[1] == "--interactive":
        # Run single test to debug agent roles
        # test_single_query()
        run()
    else:
        # Run main test without input
        main()
