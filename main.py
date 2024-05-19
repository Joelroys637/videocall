import streamlit as st
from streamlit_webrtc import webrtc_streamer, WebRtcMode, RTCConfiguration
import av

# Configuration for WebRTC
RTC_CONFIGURATION = RTCConfiguration({
    "iceServers": [{"urls": ["stun:stun.l.google.com:19302"]}]
})

# Set up the Streamlit app
st.title("Video Conference Call")

# Input for room ID
room_id = st.text_input("Enter Room ID:")

# Join button
if st.checkbox("Join"):
    if room_id:
        st.write(f"Joining room: {room_id}")

        class VideoProcessor:
            def recv(self, frame):
                return frame

        webrtc_streamer(
            key=f"room-{room_id}",
            mode=WebRtcMode.SENDRECV,
            rtc_configuration=RTC_CONFIGURATION,
            media_stream_constraints={
                "video": True,
                "audio": True
            },
            video_processor_factory=VideoProcessor
        )
    else:
        st.error("Please enter a Room ID.")
