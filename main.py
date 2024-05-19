import streamlit as st
from streamlit_webrtc import webrtc_streamer, WebRtcMode, RTCConfiguration

# RTC Configuration (use appropriate STUN/TURN servers)
RTC_CONFIGURATION = RTCConfiguration({"iceServers": [{"urls": ["stun:stun.l.google.com:19302"]}]})

st.title("Mini Video Call Feature")

# Function to generate unique IDs (example using user inputs for simplicity)
def generate_unique_id():
    return st.text_input("Enter your unique ID:")

# Unique ID input for both users
user_id = generate_unique_id()
peer_id = st.text_input("Enter peer's unique ID:")

if st.checkbox("Start Video Call"):
    if user_id and peer_id:
        st.write(f"Connecting {user_id} to {peer_id}...")

        webrtc_streamer(
            key="example",
            mode=WebRtcMode.SENDRECV,
            rtc_configuration=RTC_CONFIGURATION
        )
    else:
        st.error("Please enter both your ID and your peer's ID.")
