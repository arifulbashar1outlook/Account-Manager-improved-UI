
import React, { useEffect, useRef } from 'react';

interface VoiceWaveformProps {
  isListening: boolean;
}

const VoiceWaveform: React.FC<VoiceWaveformProps> = ({ isListening }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    if (isListening) {
      const initAudio = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          audioContextRef.current = new AudioContext();
          analyserRef.current = audioContextRef.current.createAnalyser();
          const source = audioContextRef.current.createMediaStreamSource(stream);
          source.connect(analyserRef.current);
          analyserRef.current.fftSize = 256;
          draw();
        } catch (err) {
          console.error('Mic access denied', err);
        }
      };
      initAudio();
    } else {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      cancelAnimationFrame(animationRef.current);
    }
    return () => cancelAnimationFrame(animationRef.current);
  }, [isListening]);

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx || !analyserRef.current) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteFrequencyData(dataArray);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Siri-style fluid waveform logic
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = 20;

    ctx.beginPath();
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

    const colors = ['#6366f1', '#ec4899', '#8b5cf6'];
    const time = Date.now() / 1000;

    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = colors[i];
      ctx.beginPath();
      for (let x = 0; x < canvas.width; x++) {
        const freqIndex = Math.floor((x / canvas.width) * bufferLength);
        const amplitude = (dataArray[freqIndex] / 255) * 20;
        const wave = Math.sin(x * 0.05 + time * 10 + i) * amplitude;
        ctx.lineTo(x, centerY + wave);
      }
      ctx.stroke();
    }

    animationRef.current = requestAnimationFrame(draw);
  };

  return (
    <canvas 
      ref={canvasRef} 
      width={120} 
      height={40} 
      className={`transition-opacity duration-300 ${isListening ? 'opacity-100' : 'opacity-0'}`}
    />
  );
};

export default VoiceWaveform;
