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
  { name: 'Clamshell Links', reps: 15, duration: 4, type: 'reps' },
  { name: 'Clamshell Rechts', reps: 15, duration: 4, type: 'reps' },
  { name: 'Side Lying Leg Lift Links', reps: 15, duration: 4, type: 'reps' },
  { name: 'Side Lying Leg Lift Rechts', reps: 15, duration: 4, type: 'reps' },
  { name: 'Romanian Squat Links', reps: 15, duration: 4, type: 'reps' },
  { name: 'Romanian Squat Rechts', reps: 15, duration: 4, type: 'reps' },
  { name: 'Butt Bridge', reps: 20, duration: 4, type: 'reps' },
  { name: 'Plank', reps: 1, duration: 60, type: 'hold' },
  { name: '1 Leg Stance Links', reps: 1, duration: 60, type: 'hold' },
  { name: '1 Leg Stance Rechts', reps: 1, duration: 60, type: 'hold' }
];

const EXERCISE_DISPLAY = [
  { name: 'Clamshell', reps: '15 reps/kant' },
  { name: 'Side Lying Leg Lift', reps: '15 reps/kant' },
  { name: 'Romanian Squat', reps: '15 reps/kant' },
  { name: 'Butt Bridge', reps: '20 reps' },
  { name: 'Plank', reps: '1 min' },
  { name: '1 Leg Stance', reps: '1 min/kant' }
];

const MOTIVATIONAL_QUOTES = [
  "Je bent sterker dan je denkt! 💪",
  "Goed bezig! Je inzet is inspirerend! 🌟",
  "Training voltooid! Je hebt het geknald! 🔥",
  "Geweldig werk! Hou dit tempo vast! 🚀",
  "Je hebt het gedaan! Elke herhaling telt! ⭐",
  "Fantastische inzet! Je bent niet te stoppen! 💯"
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
  const [phaseTimer, setPhaseTimer] = useState(1);
  const [secondInPhase, setSecondInPhase] = useState(0);
  const [holdTimer, setHoldTimer] = useState(0);
  const [pauseType, setPauseType] = useState<PauseType>(null);
  const [pauseTimer, setPauseTimer] = useState(0);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const silentVideoRef = useRef<HTMLVideoElement | null>(null);
  const wakeLockRef = useRef<any>(null);

  // --- Progress Calculations ---
  const calculateSingleSetDuration = () => {
    return EXERCISES.reduce((acc, ex, index) => {
      const exerciseDuration = ex.type === 'hold' ? ex.duration : ex.reps * 4; // 1s up + 3s down
      const pauseDuration = index < EXERCISES.length - 1 ? EXERCISE_PAUSE : 0;
      return acc + exerciseDuration + pauseDuration;
    }, 0);
  };

  const totalTrainingDuration = (calculateSingleSetDuration() * numSets) + (SET_PAUSE * (numSets - 1));

  const calculateCurrentProgressSeconds = () => {
    let seconds = 0;
    seconds += currentSet * (calculateSingleSetDuration() + SET_PAUSE);
    
    for (let i = 0; i < currentExercise; i++) {
      const ex = EXERCISES[i];
      seconds += (ex.type === 'hold' ? ex.duration : ex.reps * 4) + EXERCISE_PAUSE;
    }

    if (pauseType === 'exercise' || pauseType === 'set') {
      const totalPause = pauseType === 'set' ? SET_PAUSE : EXERCISE_PAUSE;
      seconds += (totalPause - pauseTimer);
    } else {
      const ex = EXERCISES[currentExercise];
      if (ex.type === 'hold') {
        seconds += holdTimer;
      } else {
        const secondsInCurrentRep = repPhase === 'up' ? (1 - phaseTimer) : (1 + (3 - phaseTimer));
        seconds += (currentRep * 4) + Math.max(0, secondsInCurrentRep);
      }
    }
    return Math.min(seconds, totalTrainingDuration);
  };

  const totalElapsedActual = calculateCurrentProgressSeconds();
  const totalRemaining = Math.max(0, totalTrainingDuration - totalElapsedActual);

  useEffect(() => {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioContextRef.current = new AudioContextClass();
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // --- WAKE LOCK EFFECT ---
  useEffect(() => {
    const requestWakeLock = async () => {
      if ('wakeLock' in navigator && isTraining && !isCompleted && !wakeLockRef.current) {
        try {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        } catch (err) {
          console.log('Wake Lock request failed:', err);
        }
      }
    };

    const releaseWakeLock = async () => {
      if (wakeLockRef.current) {
        try {
          await wakeLockRef.current.release();
          wakeLockRef.current = null;
        } catch (err) {
          console.log('Wake Lock release failed:', err);
        }
      }
    };

    if (isTraining && !isCompleted) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isTraining && !isCompleted) {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      releaseWakeLock();
    };
  }, [isTraining, isCompleted]);

  // --- AUDIO FUNCTIES ---
  const playTone = (frequency: number, duration: number = 0.08, volume: number = 0.12) => {
    const ctx = audioContextRef.current;
    if (!ctx || ctx.state === 'suspended') return;

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

  // NIEUW: Geluid voor einde van oefening
  const playExerciseComplete = () => {
    // Een vrolijk 'succes' akkoordje (C Majeur arpeggio)
    playTone(523.25, 0.1, 0.15); // C5
    setTimeout(() => playTone(659.25, 0.1, 0.15), 100); // E5
    setTimeout(() => playTone(783.99, 0.2, 0.15), 200); // G5
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
        c.y += c.speedY; c.x += c.speedX; c.rotation += c.rotationSpeed;
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate(c.rotation * Math.PI / 180);
        ctx.fillStyle = c.color;
        ctx.fillRect(-c.size / 2, -c.size / 2, c.size, c.size);
        ctx.restore();
        if (c.y > canvas.height) { c.y = -20; c.x = Math.random() * canvas.width; }
      });
      animationId = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(animationId);
  }, [isCompleted]);

  // --- MAIN TRAINING LOOP ---
  useEffect(() => {
    if (!isTraining || isPaused) return;

    const interval = setInterval(() => {
      if (pauseType) {
        setPauseTimer(prev => {
          if (prev <= 1) { setPauseType(null); return 0; }
          return prev - 1;
        });
      } else {
        const exercise = EXERCISES[currentExercise];
        
        if (exercise.type === 'hold') {
          setHoldTimer(prev => {
            if (prev >= exercise.duration - 1) { setCurrentRep(1); return exercise.duration; }
            return prev + 1;
          });
        } else {
          // Rep Logic
          if (phaseTimer <= 1) {
             if (repPhase === 'up') {
                setRepPhase('down');
                setPhaseTimer(3);
                setSecondInPhase(0);
             } else {
                setCurrentRep(prev => prev + 1);
                setRepPhase('up');
                setPhaseTimer(1);
                setSecondInPhase(0);
             }
          } else {
             setPhaseTimer(prev => prev - 1);
             setSecondInPhase(prev => prev + 1);
          }
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isTraining, isPaused, pauseType, repPhase, currentExercise, holdTimer, phaseTimer]);

  useEffect(() => {
    if (!isTraining || isPaused || pauseType) return;
    const exercise = EXERCISES[currentExercise];
    if (exercise.type === 'hold') return;
    if (repPhase === 'up') { playTone(800, 0.08, 0.12); } 
    else {
      const volume = secondInPhase === 1 ? 0.15 : secondInPhase === 2 ? 0.09 : 0.08;
      playTone(400, 0.08, volume);
    }
  }, [secondInPhase, isTraining, isPaused, pauseType, repPhase, currentExercise]);

  useEffect(() => {
    const exercise = EXERCISES[currentExercise];
    if (currentRep >= exercise.reps && !pauseType) {
      playExerciseComplete(); // GELUID BIJ VOLTOOIEN OEFENING

      if (currentExercise < EXERCISES.length - 1) {
        setPauseType('exercise'); setPauseTimer(EXERCISE_PAUSE); setCurrentExercise(prev => prev + 1);
        setCurrentRep(0); setRepPhase('up'); setPhaseTimer(1); setSecondInPhase(0); setHoldTimer(0);
      } else if (currentSet < numSets - 1) {
        setPauseType('set'); setPauseTimer(SET_PAUSE); setCurrentSet(prev => prev + 1);
        setCurrentExercise(0); setCurrentRep(0); setRepPhase('up'); setPhaseTimer(1); setSecondInPhase(0); setHoldTimer(0);
      } else {
        setIsTraining(false); setIsCompleted(true); playCheer();
      }
    }
  }, [currentRep, currentExercise, currentSet, numSets, pauseType]);

  const startTraining = async () => {
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') { await audioContextRef.current.resume(); }
    
    // FIX VOOR SILENT MODE: Play direct op de ref die in de JSX staat
    if (silentVideoRef.current) {
        try { 
            await silentVideoRef.current.play(); 
        } catch (e) { 
            console.log("Silent mode bypass failed", e); 
        }
    }

    setIsConfiguring(false); setIsTraining(true); setIsPaused(false); setIsCompleted(false);
    setCurrentSet(0); setCurrentExercise(0); setCurrentRep(0); setRepPhase('up'); setPhaseTimer(1); setSecondInPhase(0); setHoldTimer(0); setPauseType(null); setPauseTimer(0);
  };

  const togglePause = async () => {
    if (isPaused && audioContextRef.current && audioContextRef.current.state === 'suspended') { await audioContextRef.current.resume(); }
    setIsPaused(prev => !prev);
  };

  const abortTraining = () => { setIsTraining(false); setIsPaused(false); setIsConfiguring(true); setIsCompleted(false); };

  const skipToNext = () => {
    if (currentExercise < EXERCISES.length - 1) {
      setCurrentExercise(prev => prev + 1); setCurrentRep(0); setRepPhase('up'); setPhaseTimer(1); setSecondInPhase(0); setHoldTimer(0); setPauseType(null);
    } else if (currentSet < numSets - 1) {
      setPauseType('set'); setPauseTimer(SET_PAUSE); setCurrentSet(prev => prev + 1); setCurrentExercise(0); setCurrentRep(0); setRepPhase('up'); setPhaseTimer(1); setSecondInPhase(0); setHoldTimer(0);
    }
  };

  const skipToPrevious = () => {
    if (currentExercise > 0) { setCurrentExercise(prev => prev - 1); setCurrentRep(0); setRepPhase('up'); setPhaseTimer(1); setSecondInPhase(0); setHoldTimer(0); setPauseType(null); }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60); const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const incrementSets = () => setNumSets(prev => Math.min(10, prev + 1));
  const decrementSets = () => setNumSets(prev => Math.max(1, prev - 1));
  const resetToConfig = () => { setIsCompleted(false); setIsConfiguring(true); };

  if (isCompleted) {
    const quote = MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
        <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />
        <div className="bg-white/95 backdrop-blur rounded-lg shadow-2xl p-6 sm:p-8 max-w-md w-full text-center relative z-10">
          <div className="bg-gradient-to-br from-blue-600 to-cyan-600 p-6 rounded-lg mb-6 inline-block"><Trophy className="w-20 h-20 text-white" /></div>
          <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-4">Training Voltooid!</h1>
          <p className="text-xl sm:text-2xl text-gray-700 mb-8 font-medium">{quote}</p>
          <button onClick={resetToConfig} className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold py-4 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg"><Dumbbell className="w-5 h-5" /> Start Nieuwe Training</button>
        </div>
      </div>
    );
  }

  if (isConfiguring) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white/95 backdrop-blur rounded-lg shadow-2xl p-6 sm:p-8 max-w-md w-full">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-gradient-to-br from-blue-600 to-cyan-600 p-3 rounded-lg"><Dumbbell className="w-7 h-7 text-white" /></div>
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">Strength Trainer</h1>
          </div>
          <div className="mb-6">
            <label className="block text-gray-700 font-semibold mb-3 text-sm uppercase tracking-wide">Aantal Sets</label>
            <div className="flex items-center gap-3">
              <button onClick={decrementSets} className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold w-12 h-12 rounded-lg flex items-center justify-center transition-colors"><Minus className="w-5 h-5" /></button>
              <div className="flex-1 px-4 py-4 border-2 border-gray-200 rounded-lg text-3xl font-bold text-center bg-white">{numSets}</div>
              <button onClick={incrementSets} className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold w-12 h-12 rounded-lg flex items-center justify-center transition-colors"><Plus className="w-5 h-5" /></button>
            </div>
          </div>
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 mb-6 max-h-64 overflow-y-auto">
            <h3 className="font-bold text-gray-800 mb-3 text-sm uppercase tracking-wide">Oefeningen per set</h3>
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
          <button onClick={startTraining} className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold py-4 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-xl">
            <Play className="w-5 h-5" /> Start Training
          </button>
        </div>
      </div>
    );
  }

  const exercise = EXERCISES[currentExercise];
  const progress = exercise.type === 'hold' ? (holdTimer / exercise.duration) * 100 : (currentRep / exercise.reps) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      {/* DE ECHTE FIX VOOR IPHONE SILENT MODE: 
         De video moet in de DOM staan (niet via createElement).
         De playsInline en loop zijn cruciaal.
         We verbergen hem visueel met styles.
      */}
      <video 
        ref={silentVideoRef} 
        loop 
        playsInline 
        muted={false}
        src="data:video/mp4;base64,AAAAHGZ0eXBpc29tAAAAAGlzb21hdmMxbWV0YQAAACRocmRyAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcY3mN0AAAAAAQAAAAEAAAABAAAAAQAAAAEAAAAB"
        style={{ position: 'absolute', width: 1, height: 1, opacity: 0.01, pointerEvents: 'none' }}
      />

      <div className="bg-white/95 backdrop-blur rounded-lg shadow-2xl p-4 sm:p-8 max-w-2xl w-full">
        
        {/* Voortgang Sectie */}
        <div className="mb-8 p-4 bg-slate-50 rounded-xl border border-slate-200 shadow-inner">
          <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 px-1">
            <div className="flex flex-col">
              <span>Totaal Geleverd</span>
              <span className="text-slate-800 text-sm font-mono">{formatTime(totalElapsedActual)}</span>
            </div>
            <div className="flex flex-col text-right">
              <span>Totaal Resterend</span>
              <span className="text-slate-800 text-sm font-mono">-{formatTime(totalRemaining)}</span>
            </div>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden mb-6">
            <div className="bg-blue-500 h-full transition-all duration-1000" style={{ width: `${(totalElapsedActual / totalTrainingDuration) * 100}%` }} />
          </div>

          <div className="w-full bg-slate-200 rounded-full h-4 overflow-hidden mb-2">
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 h-full transition-all duration-300 rounded-full shadow-[0_0_8px_rgba(37,99,235,0.4)]" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex justify-between text-xs font-bold text-gray-600 px-1">
            <span>{pauseType ? 'Rustfase' : exercise.type === 'hold' ? `${holdTimer}s / ${exercise.duration}s` : `Herhaling ${currentRep + 1} / ${exercise.reps}`}</span>
            <span>{Math.round(progress)}% van oefening</span>
          </div>
        </div>

        <div className="text-center mb-6">
          <div className="inline-block px-4 py-1.5 bg-gradient-to-r from-blue-100 to-cyan-100 rounded-full mb-3">
            <span className="text-sm font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent uppercase">Set {currentSet + 1} van {numSets}</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-bold text-gray-800 mb-2 leading-tight">
            {/* HIER GEWISSELD: Toon ALTIJD de naam van de (volgende) oefening, ook tijdens rust */}
            {pauseType ? EXERCISES[currentExercise].name : exercise.name}
          </h1>
        </div>

        {pauseType ? (
          <div className="text-center py-8">
            <div className="text-7xl sm:text-8xl font-black bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-4 font-mono">{formatTime(pauseTimer)}</div>
            {/* Hier staat nu klein 'rust' in plaats van groot */}
            <p className="text-gray-500 font-medium">{pauseType === 'set' ? 'Rust tussen Sets' : 'Even uitrusten...'}</p>
          </div>
        ) : (
          <div className="text-center mb-8">
            {exercise.type === 'hold' ? (
              <div className="inline-block px-10 py-8 rounded-2xl shadow-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white min-w-[180px]">
                <div className="text-6xl font-black mb-2 font-mono">{exercise.duration - holdTimer}</div>
                <div className="text-xl font-bold uppercase tracking-widest">Hold</div>
              </div>
            ) : (
              <div className={`inline-block px-10 py-8 rounded-2xl shadow-xl transition-colors duration-500 min-w-[180px] ${repPhase === 'up' ? 'bg-gradient-to-br from-green-400 to-emerald-500' : 'bg-gradient-to-br from-blue-400 to-indigo-500'} text-white`}>
                <div className="text-6xl font-black mb-2 font-mono">{phaseTimer}</div>
                <div className="text-xl font-bold uppercase tracking-widest">{repPhase === 'up' ? '↑ Op' : '↓ Neer'}</div>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-center gap-4 mb-6">
          <button onClick={skipToPrevious} disabled={currentExercise === 0 && currentSet === 0} className="bg-gray-100 hover:bg-gray-200 disabled:opacity-30 text-gray-600 w-14 h-14 rounded-xl flex items-center justify-center transition-all shadow-sm border border-gray-200"><SkipBack className="w-6 h-6" /></button>
          
          {/* Pause knop is w-20 h-20 in mijn eerdere ontwerp, maar w-14 h-14 in jouw code. Ik maak hem w-20 voor betere touch target, en pas Abort daarop aan */}
          <button onClick={togglePause} className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:scale-105 text-white w-20 h-20 rounded-2xl flex items-center justify-center transition-all shadow-lg">
             {isPaused ? <Play className="w-10 h-10 fill-current" /> : <Pause className="w-10 h-10 fill-current" />}
          </button>
          
          <button onClick={skipToNext} disabled={currentExercise === EXERCISES.length - 1 && currentSet === numSets - 1} className="bg-gray-100 hover:bg-gray-200 disabled:opacity-30 text-gray-600 w-14 h-14 rounded-xl flex items-center justify-center transition-all shadow-sm border border-gray-200"><SkipForward className="w-6 h-6" /></button>
        </div>

        {isPaused && (
          // Abort knop: gecentreerd, even groot als Play/Pause (w-20 h-20), geen tekst
          <div className="flex justify-center">
             <button onClick={abortTraining} className="bg-red-50 hover:bg-red-100 text-red-600 w-20 h-20 rounded-2xl flex items-center justify-center transition-all border border-red-100 shadow-md">
               <Square className="w-8 h-8 fill-current" />
             </button>
          </div>
        )}
      </div>
    </div>
  );
}