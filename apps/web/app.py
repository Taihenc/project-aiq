import streamlit as st
import requests

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
        backend_url = "http://localhost:3000/chat"  # Assuming backend runs on port 3000
        try:
            response_from_backend = requests.post(
                backend_url, json={"message": prompt})
            response_from_backend.raise_for_status()  # Raise an exception for HTTP errors
            response_data = response_from_backend.json()
            response = response_data.get(
                "response", "Error: No response from backend.")
        except requests.exceptions.ConnectionError:
            response = "Error: Could not connect to the backend service. Is it running?"
        except requests.exceptions.RequestException as e:
            response = f"Error from backend: {e}"
        st.markdown(response)
    st.session_state.messages.append(
        {"role": "assistant", "content": response})
