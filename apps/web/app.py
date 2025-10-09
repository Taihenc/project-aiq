import os

import requests
import streamlit as st

st.title("AI Chat Interface")

if "messages" not in st.session_state:
    st.session_state.messages = []

for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])

if prompt := st.chat_input("What is up?"):
    st.session_state.messages.append({"role": "user", "content": prompt})
    with st.chat_message("user"):
        st.markdown(prompt)

    with st.chat_message("assistant"):
        backend_url = os.getenv("BACKEND_URL") or "http://localhost:3000/chat"
        try:
            # Construct the chat request payload
            chat_request_payload = {
                "chat_box": {
                    "message": prompt,
                    "context": {} # You can add context here if needed
                },
                # "session_id": st.session_state.get("session_id") # Uncomment and manage session_id if needed
            }
            response_from_backend = requests.post(
                backend_url, json=chat_request_payload)
            response_from_backend.raise_for_status()  # Raise an exception for HTTP errors
            response_data = response_from_backend.json()
            
            # Extract the message from the nested chat_box
            response = response_data.get("chat_box", {}).get(
                "message", "Error: No response from AI service.")
            
            # You can also store the session_id if the backend returns one
            # if "session_id" in response_data:
            #     st.session_state.session_id = response_data["session_id"]

        except requests.exceptions.ConnectionError:
            response = "Error: Could not connect to the backend service. Is it running?"
        except requests.exceptions.RequestException as e:
            response = f"Error from backend: {e}"
        st.markdown(response)
    st.session_state.messages.append(
        {"role": "assistant", "content": response})
