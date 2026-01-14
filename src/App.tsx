import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, SkipForward, SkipBack, Dumbbell, Plus, Minus, Trophy } from 'lucide-react';

// --- Types ---
interface ConfettiPiece {
  x: number;
  y: number;
  size: number;
  speedY: number;
  speedX: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
}

type PauseType = 'exercise' | 'set' | null;

// --- Constants ---
const EXERCISES = [
  { name: 'Clamshell Left', reps: 15, duration: 4, type: 'reps' },
  { name: 'Clamshell Right', reps: 15, duration: 4, type: 'reps' },
  { name: 'Side Lying Leg Lift Left', reps: 15, duration: 4, type: 'reps' },
  { name: 'Side Lying Leg Lift Right', reps: 15, duration: 4, type: 'reps' },
  { name: 'Romanian Squat Left', reps: 15, duration: 4, type: 'reps' },
  { name: 'Romanian Squat Right', reps: 15, duration: 4, type: 'reps' },
  { name: 'Butt Bridge', reps: 20, duration: 4, type: 'reps' },
  { name: 'Plank', reps: 1, duration: 60, type: 'hold' },
  { name: '1 Leg Stance Left', reps: 1, duration: 60, type: 'hold' },
  { name: '1 Leg Stance Right', reps: 1, duration: 60, type: 'hold' }
];

const EXERCISE_DISPLAY = [
  { name: 'Clamshell', reps: '15 reps/side' },
  { name: 'Side Lying Leg Lift', reps: '15 reps/side' },
  { name: 'Romanian Squat', reps: '15 reps/side' },
  { name: 'Butt Bridge', reps: '20 reps' },
  { name: 'Plank', reps: '1 min' },
  { name: '1 Leg Stance', reps: '1 min/side' }
];

const MOTIVATIONAL_QUOTES = [
  "You're stronger than you think! 💪",
  "Great job! Your dedication is inspiring! 🌟",
  "Training complete! You crushed it! 🔥",
  "Awesome work! Keep up the momentum! 🚀",
  "You did it! Every rep counts! ⭐",
  "Amazing effort! You're unstoppable! 💯"
];

const EXERCISE_PAUSE = 15;
const SET_PAUSE = 120;

export default function StrengthTrainingApp() {
  const [numSets, setNumSets] = useState(3);
  const [isConfiguring, setIsConfiguring] = useState(true);
  const [isTraining, setIsTraining] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [currentSet, setCurrentSet] = useState(0);
  const [currentExercise, setCurrentExercise] = useState(0);
  const [currentRep, setCurrentRep] = useState(0);
  const [repPhase, setRepPhase] = useState<'up' | 'down'>('up');
  const [phaseTimer, setPhaseTimer] = useState(0);
  const [secondInPhase, setSecondInPhase] = useState(0);
  const [holdTimer, setHoldTimer] = useState(0);
  const [pauseType, setPauseType] = useState<PauseType>(null);
  const [pauseTimer, setPauseTimer] = useState(0);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioContextRef.current = new AudioContextClass();
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const playTone = (frequency: number, duration: number = 0.08, volume: number = 0.12) => {
    const ctx = audioContextRef.current;
    if (!ctx) return;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  };

  const playCheer = () => {
    [523, 659, 784, 1047].forEach((freq, i) => {
      setTimeout(() => playTone(freq, 0.2, 0.2), i * 150);
    });
  };

  useEffect(() => {
    if (!isCompleted || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const confetti: ConfettiPiece[] = [];
    const colors = ['#3B82F6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444'];
    
    for (let i = 0; i < 150; i++) {
      confetti.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        size: Math.random() * 8 + 4,
        speedY: Math.random() * 3 + 2,
        speedX: Math.random() * 2 - 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotationSpeed: Math.random() * 10 - 5
      });
    }

    let animationId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      confetti.forEach(c => {
        c.y += c.speedY;
        c.x += c.speedX;
        c.rotation += c.rotationSpeed;
        
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate(c.rotation * Math.PI / 180);
        ctx.fillStyle = c.color;
        ctx.fillRect(-c.size / 2, -c.size / 2, c.size, c.size);
        ctx.restore();
        
        if (c.y > canvas.height) {
          c.y = -20;
          c.x = Math.random() * canvas.width;
        }
      });
      
      animationId = requestAnimationFrame(animate);
    };
    
    animate();
    return () => cancelAnimationFrame(animationId);
  }, [isCompleted]);

  useEffect(() => {
    if (!isTraining || isPaused) return;

    const interval = setInterval(() => {
      if (pauseType) {
        setPauseTimer(prev => {
          if (prev <= 1) {
            setPauseType(null);
            return 0;
          }
          return prev - 1;
        });
      } else {
        const exercise = EXERCISES[currentExercise];
        
        if (exercise.type === 'hold') {
          setHoldTimer(prev => {
            if (prev >= exercise.duration) {
              setCurrentRep(1);
              return prev;
            }
            return prev + 1;
          });
        } else {
          setPhaseTimer(prev => {
            if (prev <= 1) {
              if (repPhase === 'up') {
                setRepPhase('down');
                setSecondInPhase(0);
                return 3;
              } else {
                setCurrentRep(r => r + 1);
                setRepPhase('up');
                setSecondInPhase(0);
                return 1;
              }
            }
            return prev - 1;
          });
          
          setSecondInPhase(prev => prev + 1);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isTraining, isPaused, pauseType, repPhase, currentExercise, holdTimer]);

  useEffect(() => {
    if (!isTraining || isPaused || pauseType) return;
    
    const exercise = EXERCISES[currentExercise];
    if (exercise.type === 'hold') return;
    
    if (repPhase === 'up') {
      playTone(800, 0.08, 0.12);
    } else {
      const volume = secondInPhase === 1 ? 0.15 : secondInPhase === 2 ? 0.09 : 0.08;
      playTone(400, 0.08, volume);
    }
  }, [secondInPhase, isTraining, isPaused, pauseType, repPhase, currentExercise]);

  useEffect(() => {
    const exercise = EXERCISES[currentExercise];
    
    if (currentRep >= exercise.reps && !pauseType) {
      if (currentExercise < EXERCISES.length - 1) {
        setPauseType('exercise');
        setPauseTimer(EXERCISE_PAUSE);
        setCurrentExercise(prev => prev + 1);
        setCurrentRep(0);
        setRepPhase('up');
        setPhaseTimer(1);
        setSecondInPhase(0);
        setHoldTimer(0);
      } else if (currentSet < numSets - 1) {
        setPauseType('set');
        setPauseTimer(SET_PAUSE);
        setCurrentSet(prev => prev + 1);
        setCurrentExercise(0);
        setCurrentRep(0);
        setRepPhase('up');
        setPhaseTimer(1);
        setSecondInPhase(0);
        setHoldTimer(0);
      } else {
        setIsTraining(false);
        setIsCompleted(true);
        playCheer();
      }
    }
  }, [currentRep, currentExercise, currentSet, numSets, pauseType]);

  const startTraining = () => {
    setIsConfiguring(false);
    setIsTraining(true);
    setIsPaused(false);
    setIsCompleted(false);
    setCurrentSet(0);
    setCurrentExercise(0);
    setCurrentRep(0);
    setRepPhase('up');
    setPhaseTimer(1);
    setSecondInPhase(0);
    setHoldTimer(0);
    setPauseType(null);
    setPauseTimer(0);
  };

  const togglePause = () => {
    setIsPaused(prev => !prev);
  };

  const abortTraining = () => {
    setIsTraining(false);
    setIsPaused(false);
    setIsConfiguring(true);
    setIsCompleted(false);
  };

  const skipToNext = () => {
    if (currentExercise < EXERCISES.length - 1) {
      setCurrentExercise(prev => prev + 1);
      setCurrentRep(0);
      setRepPhase('up');
      setPhaseTimer(1);
      setSecondInPhase(0);
      setHoldTimer(0);
      setPauseType(null);
    } else if (currentSet < numSets - 1) {
      setPauseType('set');
      setPauseTimer(SET_PAUSE);
      setCurrentSet(prev => prev + 1);
      setCurrentExercise(0);
      setCurrentRep(0);
      setRepPhase('up');
      setPhaseTimer(1);
      setSecondInPhase(0);
      setHoldTimer(0);
    }
  };

  const skipToPrevious = () => {
    if (currentExercise > 0) {
      setCurrentExercise(prev => prev - 1);
      setCurrentRep(0);
      setRepPhase('up');
      setPhaseTimer(1);
      setSecondInPhase(0);
      setHoldTimer(0);
      setPauseType(null);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const incrementSets = () => setNumSets(prev => Math.min(10, prev + 1));
  const decrementSets = () => setNumSets(prev => Math.max(1, prev - 1));

  const resetToConfig = () => {
    setIsCompleted(false);
    setIsConfiguring(true);
  };

  if (isCompleted) {
    const quote = MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
        <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />
        
        <div className="bg-white/95 backdrop-blur rounded-lg shadow-2xl p-6 sm:p-8 max-w-md w-full text-center relative z-10">
          <div className="bg-gradient-to-br from-blue-600 to-cyan-600 p-6 rounded-lg mb-6 inline-block">
            <Trophy className="w-20 h-20 text-white" />
          </div>
          
          <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-4">
            Training Complete!
          </h1>
          
          <p className="text-xl sm:text-2xl text-gray-700 mb-8 font-medium">
            {quote}
          </p>
          
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 mb-6">
            <p className="text-gray-600 font-semibold">You completed:</p>
            <p className="text-3xl font-bold text-gray-800">{numSets} {numSets === 1 ? 'Set' : 'Sets'}</p>
            <p className="text-gray-600">{EXERCISES.length} exercises per set</p>
          </div>
          
          <button
            onClick={resetToConfig}
            className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold py-4 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg"
          >
            <Dumbbell className="w-5 h-5" />
            Start New Training
          </button>
        </div>
      </div>
    );
  }

  if (isConfiguring) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white/95 backdrop-blur rounded-lg shadow-2xl p-6 sm:p-8 max-w-md w-full">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-gradient-to-br from-blue-600 to-cyan-600 p-3 rounded-lg">
              <Dumbbell className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              Strength Trainer
            </h1>
          </div>
          
          <div className="mb-6">
            <label className="block text-gray-700 font-semibold mb-3 text-sm uppercase tracking-wide">
              Number of Sets
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={decrementSets}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold w-12 h-12 rounded-lg flex items-center justify-center transition-colors"
              >
                <Minus className="w-5 h-5" />
              </button>
              <div className="flex-1 px-4 py-4 border-2 border-gray-200 rounded-lg text-3xl font-bold text-center bg-white">
                {numSets}
              </div>
              <button
                onClick={incrementSets}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold w-12 h-12 rounded-lg flex items-center justify-center transition-colors"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 mb-6 max-h-64 overflow-y-auto">
            <h3 className="font-bold text-gray-800 mb-3 text-sm uppercase tracking-wide">Exercises per set</h3>
            <ul className="text-sm text-gray-700 space-y-2">
              {EXERCISE_DISPLAY.map((ex, i) => (
                <li key={i} className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                  <span className="font-medium">{ex.name}</span>
                  <span className="text-gray-500">— {ex.reps}</span>
                </li>
              ))}
            </ul>
          </div>

          <button
            onClick={startTraining}
            className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold py-4 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-xl"
          >
            <Play className="w-5 h-5" />
            Start Training
          </button>
        </div>
      </div>
    );
  }

  const exercise = EXERCISES[currentExercise];
  const progress = exercise.type === 'hold' 
    ? (holdTimer / exercise.duration) * 100
    : (currentRep / exercise.reps) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white/95 backdrop-blur rounded-lg shadow-2xl p-4 sm:p-8 max-w-2xl w-full">
        <div className="text-center mb-6">
          <div className="inline-block px-4 py-1.5 bg-gradient-to-r from-blue-100 to-cyan-100 rounded-full mb-3">
            <span className="text-sm font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              SET {currentSet + 1} / {numSets}
            </span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-bold text-gray-800 mb-2">
            {pauseType ? (pauseType === 'set' ? 'Rest Between Sets' : 'Rest Between Exercises') : exercise.name}
          </h1>
        </div>

        {pauseType ? (
          <div className="text-center py-8">
            <div className="text-6xl sm:text-8xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-4">
              {formatTime(pauseTimer)}
            </div>
            <p className="text-gray-600 text-lg">Next: {pauseType === 'set' ? 'New Set' : EXERCISES[currentExercise].name}</p>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <div className="flex justify-between text-sm font-bold text-gray-600 mb-2">
                <span>
                  {exercise.type === 'hold' 
                    ? `${holdTimer}s / ${exercise.duration}s` 
                    : `Rep ${currentRep + 1} / ${exercise.reps}`}
                </span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-600 to-cyan-600 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="text-center mb-6">
              {exercise.type === 'hold' ? (
                <div className="inline-block px-8 sm:px-12 py-6 sm:py-8 rounded-lg shadow-lg bg-gradient-to-br from-amber-400 to-orange-500 text-white">
                  <div className="text-5xl sm:text-7xl font-bold mb-2">{exercise.duration - holdTimer}</div>
                  <div className="text-xl sm:text-2xl font-bold uppercase tracking-wider">
                    HOLD
                  </div>
                </div>
              ) : (
                <div className={`inline-block px-8 sm:px-12 py-6 sm:py-8 rounded-lg shadow-lg ${
                  repPhase === 'up' 
                    ? 'bg-gradient-to-br from-green-400 to-emerald-500 text-white' 
                    : 'bg-gradient-to-br from-blue-400 to-indigo-500 text-white'
                }`}>
                  <div className="text-5xl sm:text-7xl font-bold mb-2">{phaseTimer}</div>
                  <div className="text-xl sm:text-2xl font-bold uppercase tracking-wider" style={{ minWidth: '100px' }}>
                    {repPhase === 'up' ? '↑ UP' : '↓ DOWN'}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        <div className="flex items-center justify-center gap-3 mb-4">
          <button
            onClick={skipToPrevious}
            disabled={currentExercise === 0}
            className="bg-gray-300 hover:bg-gray-400 disabled:bg-gray-200 disabled:cursor-not-allowed text-gray-700 disabled:text-gray-400 font-bold w-12 h-12 rounded-lg flex items-center justify-center transition-all shadow-md"
          >
            <SkipBack className="w-5 h-5" />
          </button>
          
          <button
            onClick={togglePause}
            className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-bold w-14 h-14 rounded-lg flex items-center justify-center transition-all shadow-lg"
          >
            {isPaused ? <Play className="w-6 h-6" /> : <Pause className="w-6 h-6" />}
          </button>
          
          <button
            onClick={skipToNext}
            disabled={currentExercise === EXERCISES.length - 1 && currentSet === numSets - 1}
            className="bg-gray-300 hover:bg-gray-400 disabled:bg-gray-200 disabled:cursor-not-allowed text-gray-700 disabled:text-gray-400 font-bold w-12 h-12 rounded-lg flex items-center justify-center transition-all shadow-md"
          >
            <SkipForward className="w-5 h-5" />
          </button>
        </div>

        {isPaused && (
          <button
            onClick={abortTraining}
            className="w-full bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white font-bold py-4 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg"
          >
            <Square className="w-5 h-5" />
            Abort Training
          </button>
        )}
      </div>
    </div>
  );
}