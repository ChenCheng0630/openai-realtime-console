import { useEffect, useRef, useCallback, useState } from 'react';
import { WavRecorder, WavStreamPlayer } from '../lib/wavtools/index.js';
import { instructions } from '../utils/conversation_config.js';
import { WavRenderer } from '../utils/wav_renderer';
import { X, Edit, Zap, ArrowUp, ArrowDown } from 'react-feather';
import { Button } from '../components/button/Button';
import { Toggle } from '../components/toggle/Toggle';
import './ConsolePage.scss';

// SRS WebRTC configuration
const SRS_SERVER_URL =
  process.env.REACT_APP_SRS_SERVER_URL || 'http://47.99.44.144:1985';
const PC_CONFIG = {
  iceServers: [
    // Alibaba Cloud STUN servers
    { urls: 'stun:stun.aliyun.com:3478' },

    // Fallback to other Chinese STUN servers
    { urls: 'stun:stun.qq.com:3478' },

    // Only include Google as last resort fallback
    { urls: 'stun:stun.l.google.com:19302' },
  ],
};

interface RTCState {
  peerConnection: RTCPeerConnection | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
}

export function ConsolePageWebRTC() {
  // State for WebRTC connection
  const [rtcState, setRtcState] = useState<RTCState>({
    peerConnection: null,
    localStream: null,
    remoteStream: null,
  });
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  // Canvas refs for audio visualization
  const clientCanvasRef = useRef<HTMLCanvasElement>(null);
  const serverCanvasRef = useRef<HTMLCanvasElement>(null);

  /**
   * Initialize WebRTC connection with SRS
   */
  const initializeWebRTC = async () => {
    try {
      // Get user media (microphone)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Create new RTCPeerConnection
      const pc = new RTCPeerConnection(PC_CONFIG);

      // Add local stream tracks to peer connection
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // Handle incoming remote streams
      pc.ontrack = (event) => {
        setRtcState((prev) => ({
          ...prev,
          remoteStream: event.streams[0],
        }));
      };

      // Update ICE connection state
      pc.oniceconnectionstatechange = () => {
        console.log('ICE Connection State:', pc.iceConnectionState);
      };

      // Create and set local description
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Send offer to SRS server
      const response = await fetch(`${SRS_SERVER_URL}/rtc/v1/publish/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          streamurl: 'webrtc://localhost/live/stream',
          sdp: offer.sdp,
        }),
      });

      const jsonResponse = await response.json();

      // Set remote description from SRS response
      await pc.setRemoteDescription(
        new RTCSessionDescription({ type: 'answer', sdp: jsonResponse.sdp })
      );

      // Update state with new connection
      setRtcState({
        peerConnection: pc,
        localStream: stream,
        remoteStream: null,
      });

      setIsConnected(true);
    } catch (error) {
      console.error('Failed to initialize WebRTC:', error);
    }
  };

  /**
   * Disconnect WebRTC
   */
  const disconnectWebRTC = useCallback(async () => {
    if (rtcState.peerConnection) {
      rtcState.peerConnection.close();
    }
    if (rtcState.localStream) {
      rtcState.localStream.getTracks().forEach((track) => track.stop());
    }

    setRtcState({
      peerConnection: null,
      localStream: null,
      remoteStream: null,
    });
    setIsConnected(false);
    setIsRecording(false);
  }, [rtcState]);

  /**
   * Start/Stop Recording handlers
   */
  const startRecording = async () => {
    if (rtcState.localStream) {
      setIsRecording(true);
      // Enable audio tracks
      rtcState.localStream.getAudioTracks().forEach((track) => {
        track.enabled = true;
      });
    }
  };

  const stopRecording = async () => {
    if (rtcState.localStream) {
      setIsRecording(false);
      // Disable audio tracks
      rtcState.localStream.getAudioTracks().forEach((track) => {
        track.enabled = false;
      });
    }
  };

  /**
   * Audio visualization render loop
   */
  useEffect(() => {
    let animationFrameId: number;
    const clientCanvas = clientCanvasRef.current;
    const serverCanvas = serverCanvasRef.current;

    if (clientCanvas && serverCanvas) {
      const clientCtx = clientCanvas.getContext('2d');
      const serverCtx = serverCanvas.getContext('2d');

      const render = () => {
        if (clientCtx && serverCtx) {
          // Clear canvases
          clientCtx.clearRect(0, 0, clientCanvas.width, clientCanvas.height);
          serverCtx.clearRect(0, 0, serverCanvas.width, serverCanvas.height);

          // Draw visualization based on audio levels
          // You'll need to implement audio analysis here

          animationFrameId = requestAnimationFrame(render);
        }
      };

      render();
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [rtcState.localStream, rtcState.remoteStream]);

  return (
    <div data-component="ConsolePage">
      <div className="content-top">
        <div className="content-title">
          <img src="/yidianxingchen-logo.png" alt="Logo" />
          <span>扬州税务局智能客服 (WebRTC)</span>
        </div>
      </div>

      <div className="content-main">
        <div className="content-logs">
          <div className="content-block events">
            <div className="visualization">
              <div className="visualization-entry client">
                <canvas ref={clientCanvasRef} />
              </div>
              <div className="visualization-entry server">
                <canvas ref={serverCanvasRef} />
              </div>
            </div>
          </div>

          <div className="content-actions">
            {isConnected && (
              <Button
                label={isRecording ? '松开发送' : '按住说话'}
                buttonStyle={isRecording ? 'alert' : 'regular'}
                disabled={!isConnected}
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
              />
            )}
            <div className="spacer" />
            <Button
              label={isConnected ? 'disconnect' : 'connect'}
              iconPosition={isConnected ? 'end' : 'start'}
              icon={isConnected ? X : Zap}
              buttonStyle={isConnected ? 'regular' : 'action'}
              onClick={isConnected ? disconnectWebRTC : initializeWebRTC}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
