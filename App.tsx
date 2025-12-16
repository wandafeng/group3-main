import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameState, HookState, FishType, Entity, Particle } from './types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, WATER_LEVEL, BOAT_WIDTH, BOAT_HEIGHT, FISH_TYPES, HOOK_SPEED, REEL_SPEED } from './constants';

const GAME_DURATION = 60; // 60 seconds

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [gameOverReason, setGameOverReason] = useState<'time' | 'trash'>('time');

  // Game Refs
  const boatX = useRef(CANVAS_WIDTH / 2);
  const hookX = useRef(CANVAS_WIDTH / 2);
  const hookY = useRef(WATER_LEVEL);
  const hookVelocity = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  
  const hookState = useRef<HookState>(HookState.IDLE);
  const entities = useRef<Entity[]>([]);
  const caughtEntity = useRef<Entity | null>(null);
  const particles = useRef<Particle[]>([]);
  const scoreRef = useRef(0);
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const lastTimeRef = useRef<number>(0);
  const timerRef = useRef<number>(GAME_DURATION);
  
  // Animation state
  const castAnimation = useRef(0); // 0 (Idle/Up) to 1 (Cast/Down)
  
  // Visual inventory: Randomly placed in the "box"
  const boatInventory = useRef<{ emoji: string; x: number; y: number; category: 'fish' | 'trash'; rotation: number }[]>([]);

  // Input Handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { keysPressed.current[e.code] = true; };
    const handleKeyUp = (e: KeyboardEvent) => { keysPressed.current[e.code] = false; };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const spawnFish = useCallback(() => {
    // Only spawn if game has actually started counting down (prevent pre-spawn)
    if (timerRef.current >= GAME_DURATION - 0.1) return;

    // SPAWN LOGIC: 20% Trash, 80% Fish
    if (Math.random() > 0.04) return; 

    const wantTrash = Math.random() < 0.2; 
    const pool = FISH_TYPES.filter(t => wantTrash ? t.category === 'trash' : t.category === 'fish');
    
    if (pool.length === 0) return;

    const type = pool[Math.floor(Math.random() * pool.length)];
    
    // Always spawn from Left (-100) and move Right (1)
    
    // Depth logic
    let yMin = WATER_LEVEL + 60;
    let yMax = CANVAS_HEIGHT - 60; 
    
    if (type.depth === 'shallow') { yMax = WATER_LEVEL + 180; }
    else if (type.depth === 'medium') { yMin = WATER_LEVEL + 180; yMax = WATER_LEVEL + 400; }
    else { yMin = WATER_LEVEL + 400; }

    const y = Math.random() * (yMax - yMin) + yMin;

    entities.current.push({
      id: Date.now() + Math.random(),
      x: -100, // Always start far left
      y,
      type,
      direction: 1, // Always move right
    });
  }, []);

  const createBubbles = useCallback((x: number, y: number, count: number) => {
    for (let i = 0; i < count; i++) {
      particles.current.push({
        id: Math.random(),
        x: x + (Math.random() - 0.5) * 30,
        y: y,
        size: Math.random() * 4 + 2,
        speed: Math.random() * 2 + 1,
        alpha: 1,
      });
    }
  }, []);

  const getRodTipPosition = useCallback(() => {
     // Recalculate rod tip based on current boat position and animation state
     const boatBobY = Math.sin(Date.now() / 500) * 2;
     const boatGlobalY = WATER_LEVEL - 25 + boatBobY; 
     const fishermanGlobalX = boatX.current - 50;
     const fishermanGlobalY = boatGlobalY - 70; 
     
     // Rod geometry
     const startAngle = -Math.PI / 2.5; 
     const endAngle = 0.2; 
     const currentRodAngle = startAngle + (endAngle - startAngle) * castAnimation.current;
     
     const handX = fishermanGlobalX + Math.cos(currentRodAngle) * 30;
     const handY = fishermanGlobalY - 30 + Math.sin(currentRodAngle) * 30;
     
     const rodLength = 140;
     const rodTipX = handX + Math.cos(currentRodAngle) * rodLength;
     const rodTipY = handY + Math.sin(currentRodAngle) * rodLength;

     return { x: rodTipX, y: rodTipY };
  }, []);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameState !== GameState.PLAYING) return;
    if (hookState.current !== HookState.IDLE) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clickX = (e.clientX - rect.left) * (CANVAS_WIDTH / rect.width);
    const clickY = (e.clientY - rect.top) * (CANVAS_HEIGHT / rect.height);

    const tip = getRodTipPosition();
    
    // Calculate angle towards click
    const dx = clickX - tip.x;
    const dy = clickY - tip.y;
    const angle = Math.atan2(dy, dx);

    // Set velocity
    hookVelocity.current = {
      x: Math.cos(angle) * HOOK_SPEED,
      y: Math.sin(angle) * HOOK_SPEED
    };

    hookState.current = HookState.CASTING;
  };

  const update = useCallback((time: number) => {
    if (gameState !== GameState.PLAYING) return;

    const deltaTime = (time - lastTimeRef.current) / 1000;
    lastTimeRef.current = time;

    // Timer Logic
    if (deltaTime < 0.5) { 
        timerRef.current -= deltaTime;
        if (timerRef.current <= 0) {
            timerRef.current = 0;
            setGameOverReason('time');
            setGameState(GameState.GAME_OVER);
        }
        setTimeLeft(Math.ceil(timerRef.current));
    }

    // Boat Movement
    if (keysPressed.current['ArrowLeft'] && boatX.current > BOAT_WIDTH / 2) {
      boatX.current -= 5;
    }
    if (keysPressed.current['ArrowRight'] && boatX.current < CANVAS_WIDTH - BOAT_WIDTH / 2) {
      boatX.current += 5;
    }

    const tip = getRodTipPosition();

    // Sync hook to rod tip when IDLE
    if (hookState.current === HookState.IDLE) {
      hookX.current = tip.x;
      hookY.current = tip.y;
      castAnimation.current = Math.max(castAnimation.current - 0.1, 0); 
    } else if (hookState.current === HookState.CASTING) {
      castAnimation.current = Math.min(castAnimation.current + 0.1, 1);
      
      hookX.current += hookVelocity.current.x;
      hookY.current += hookVelocity.current.y;

      // Bounds Check
      if (hookY.current >= CANVAS_HEIGHT - 20 || hookX.current < 0 || hookX.current > CANVAS_WIDTH) {
        hookState.current = HookState.REELING;
      }
    } else if (hookState.current === HookState.REELING) {
      // Move towards rod tip
      const dx = tip.x - hookX.current;
      const dy = tip.y - hookY.current;
      const dist = Math.hypot(dx, dy);
      
      if (dist < REEL_SPEED + 5) {
        hookState.current = HookState.IDLE;
        
        // Handle Catch
        if (caughtEntity.current) {
          const caughtType = caughtEntity.current.type;
          
          if (caughtType.category === 'trash') {
             scoreRef.current -= 1;
             setScore(scoreRef.current);
             setGameOverReason('trash');
             setGameState(GameState.GAME_OVER);
          } else {
             scoreRef.current += caughtType.score;
             setScore(scoreRef.current);
          }
          
          createBubbles(boatX.current, WATER_LEVEL, 15);

          // Inventory Logic - Place in the Box (Storage Box)
          // Box is roughly at +80 relative to boat center
          const boxOffsetX = 100;
          const boxWidth = 70;
          const boxHeight = 40;
          
          // Random position inside the box
          const targetX = boatX.current + boxOffsetX + (Math.random() * boxWidth - boxWidth/2);
          const targetY = WATER_LEVEL - 55 + (Math.random() * boxHeight - boxHeight/2);

          boatInventory.current.push({
            emoji: caughtType.emoji,
            x: targetX - boatX.current, // Store relative
            y: targetY - WATER_LEVEL, // Store relative Y
            category: caughtType.category,
            rotation: (Math.random() - 0.5) * 1.5 // Random rotation for pile effect
          });

          // Limit pile size visually
          if (boatInventory.current.length > 20) {
            boatInventory.current.shift();
          }

          const caughtId = caughtEntity.current.id;
          entities.current = entities.current.filter(e => e.id !== caughtId);
          caughtEntity.current = null;
        }
      } else {
        const angle = Math.atan2(dy, dx);
        hookX.current += Math.cos(angle) * REEL_SPEED;
        hookY.current += Math.sin(angle) * REEL_SPEED;
      }
    }

    // Entity Movement
    spawnFish();
    entities.current.forEach(entity => {
      if (caughtEntity.current && caughtEntity.current.id === entity.id) {
        entity.x = hookX.current;
        entity.y = hookY.current + 20; 
        return;
      }
      entity.x += entity.type.speed * entity.direction;
      // Dynamic swimming motion (Sine wave on Y)
      if (entity.type.category === 'fish') {
         entity.y += Math.sin((Date.now() / 200) + entity.id) * 0.8;
      }
    });

    entities.current = entities.current.filter(entity => entity.x < CANVAS_WIDTH + 150);

    // Collision
    if (hookState.current === HookState.CASTING && !caughtEntity.current) {
      for (const entity of entities.current) {
        const dx = entity.x - hookX.current;
        const dy = entity.y - hookY.current;
        const distance = Math.hypot(dx, dy);

        if (distance < 30) { 
          caughtEntity.current = entity;
          hookState.current = HookState.REELING;
          createBubbles(entity.x, entity.y, 8);
          break;
        }
      }
    }

    // Particles
    particles.current.forEach(p => {
      p.y -= p.speed;
      p.x += Math.sin(p.y * 0.1) * 0.5;
      
      // Bubble popping logic (Stop at water level)
      if (p.y <= WATER_LEVEL) {
        p.alpha = 0; // Kill particle
      }
    });
    particles.current = particles.current.filter(p => p.alpha > 0);

  }, [gameState, spawnFish, createBubbles, getRodTipPosition]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // --- SKY (No Sun) ---
    const skyGradient = ctx.createLinearGradient(0, 0, 0, WATER_LEVEL);
    skyGradient.addColorStop(0, '#7dd3fc'); 
    skyGradient.addColorStop(1, '#bae6fd');
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, WATER_LEVEL);

    // --- UNDERWATER SCENE ---
    const waterGradient = ctx.createLinearGradient(0, WATER_LEVEL, 0, CANVAS_HEIGHT);
    waterGradient.addColorStop(0, '#38bdf8');  
    waterGradient.addColorStop(0.6, '#0ea5e9');
    waterGradient.addColorStop(1, '#0369a1');
    ctx.fillStyle = waterGradient;
    ctx.fillRect(0, WATER_LEVEL, CANVAS_WIDTH, CANVAS_HEIGHT - WATER_LEVEL);

    // Light Rays
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-100, WATER_LEVEL);
    ctx.lineTo(CANVAS_WIDTH * 0.4, CANVAS_HEIGHT);
    ctx.lineTo(CANVAS_WIDTH * 0.6, CANVAS_HEIGHT);
    ctx.lineTo(CANVAS_WIDTH + 100, WATER_LEVEL);
    ctx.closePath();
    const rayGradient = ctx.createLinearGradient(0, WATER_LEVEL, 0, CANVAS_HEIGHT);
    rayGradient.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
    rayGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = rayGradient;
    ctx.fill();
    ctx.restore();

    // --- SEABED DECORATION ---
    ctx.fillStyle = '#1e3a8a';
    ctx.beginPath();
    ctx.moveTo(0, CANVAS_HEIGHT);
    ctx.lineTo(0, CANVAS_HEIGHT - 200);
    ctx.bezierCurveTo(200, CANVAS_HEIGHT - 300, 400, CANVAS_HEIGHT - 180, 600, CANVAS_HEIGHT - 220);
    ctx.bezierCurveTo(800, CANVAS_HEIGHT - 280, 1000, CANVAS_HEIGHT - 120, CANVAS_WIDTH, CANVAS_HEIGHT - 220);
    ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fill();

    const floorGradient = ctx.createLinearGradient(0, CANVAS_HEIGHT - 120, 0, CANVAS_HEIGHT);
    floorGradient.addColorStop(0, '#d97706');
    floorGradient.addColorStop(1, '#78350f');
    ctx.fillStyle = floorGradient;
    ctx.beginPath();
    ctx.moveTo(0, CANVAS_HEIGHT);
    ctx.lineTo(0, CANVAS_HEIGHT - 100);
    ctx.quadraticCurveTo(CANVAS_WIDTH/2, CANVAS_HEIGHT - 150, CANVAS_WIDTH, CANVAS_HEIGHT - 80);
    ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fill();

    // Animated Clams (Shells)
    const drawClam = (x: number, y: number, color: string, phaseOffset: number) => {
        const time = Date.now() / 1000;
        const openAmount = Math.max(0, Math.sin(time + phaseOffset)); // 0 to 1
        const angle = openAmount * 0.6; // Max open angle

        ctx.save();
        ctx.translate(x, y);
        // Bottom Shell
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.ellipse(0, 0, 20, 10, 0, 0, Math.PI); ctx.fill();
        // Top Shell (Rotated)
        ctx.rotate(-angle);
        ctx.beginPath(); ctx.ellipse(0, 0, 20, 10, 0, Math.PI, 0); ctx.fill();
        // Pearl (Optional, only visible when open)
        if (openAmount > 0.3) {
            ctx.fillStyle = 'white';
            ctx.beginPath(); ctx.arc(0, -5, 5, 0, Math.PI*2); ctx.fill();
        }
        ctx.restore();
    };

    drawClam(150, CANVAS_HEIGHT - 40, '#fca5a5', 0);
    drawClam(550, CANVAS_HEIGHT - 60, '#fcd34d', 2);
    drawClam(950, CANVAS_HEIGHT - 50, '#e879f9', 4);


    // Corals
    const drawCoral = (x: number, y: number, color: string, type: 'tube' | 'brain' | 'weed' | 'fan') => {
       ctx.save();
       ctx.translate(x, y);
       ctx.fillStyle = color;
       ctx.strokeStyle = color;
       if (type === 'tube') {
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-12, -60); ctx.lineTo(12, -60); ctx.lineTo(18, 0); ctx.fill();
          ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.ellipse(0, -60, 12, 5, 0, 0, Math.PI*2); ctx.fill();
       } else if (type === 'brain') {
          ctx.beginPath(); ctx.arc(0, 0, 30, Math.PI, 0); ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 4; ctx.stroke();
       } else if (type === 'weed') {
          ctx.lineWidth = 10; ctx.lineCap = 'round';
          const sway = Math.sin(Date.now() / 800) * 12;
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(20+sway, -50, -20+sway, -90, 15+sway, -130); ctx.stroke();
       } else if (type === 'fan') {
          ctx.lineWidth = 3; ctx.beginPath();
          for(let i=-4; i<=4; i++) { ctx.moveTo(0,0); ctx.quadraticCurveTo(i*15, -40, i*22, -80); } ctx.stroke();
       }
       ctx.restore();
    };

    drawCoral(100, CANVAS_HEIGHT - 100, '#f472b6', 'tube'); 
    drawCoral(250, CANVAS_HEIGHT - 120, '#4ade80', 'weed');
    drawCoral(450, CANVAS_HEIGHT - 90, '#facc15', 'brain');
    drawCoral(650, CANVAS_HEIGHT - 100, '#c084fc', 'fan');
    drawCoral(850, CANVAS_HEIGHT - 80, '#fb7185', 'tube');
    drawCoral(1000, CANVAS_HEIGHT - 90, '#22d3ee', 'brain');


    // --- BOAT & FISHERMAN ---
    const boatBobY = Math.sin(Date.now() / 500) * 2;
    const boatGlobalY = WATER_LEVEL - 25 + boatBobY;

    ctx.save();
    ctx.translate(boatX.current, boatGlobalY);
    
    // Luxury Yacht (Wide, White, Modern)
    // Hull
    const hullGradient = ctx.createLinearGradient(0, -50, 0, 20);
    hullGradient.addColorStop(0, '#ffffff');
    hullGradient.addColorStop(1, '#f1f5f9');
    ctx.fillStyle = hullGradient;
    
    ctx.beginPath();
    ctx.moveTo(-200, 10); 
    ctx.lineTo(-210, -70); 
    ctx.lineTo(220, -75); 
    ctx.quadraticCurveTo(260, -20, 240, 20); 
    ctx.lineTo(-200, 20); 
    ctx.fill();
    ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1; ctx.stroke();

    // Dark Blue Stripe
    ctx.fillStyle = '#1e40af';
    ctx.beginPath(); ctx.moveTo(-210, -35); ctx.lineTo(230, -40); ctx.lineTo(225, -25); ctx.lineTo(-208, -20); ctx.fill();

    // Cabin Structure (Sleek)
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath(); ctx.moveTo(-120, -70); ctx.lineTo(-110, -130); ctx.lineTo(120, -130); ctx.lineTo(150, -73); ctx.fill();
    
    // Tinted Window
    ctx.fillStyle = '#1e293b';
    ctx.beginPath(); ctx.moveTo(-100, -80); ctx.lineTo(-95, -120); ctx.lineTo(100, -120); ctx.lineTo(130, -80); ctx.fill();

    // Storage Box / Container for Fish (On the right side of the deck)
    // Drawn BEFORE items so items are "in" it
    ctx.fillStyle = '#475569'; // Dark grey bin
    ctx.beginPath(); ctx.roundRect(65, -60, 70, 45, 4); ctx.fill();
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 2; ctx.stroke();
    // Inner depth
    ctx.fillStyle = '#1e293b';
    ctx.beginPath(); ctx.roundRect(70, -60, 60, 10, 2); ctx.fill();

    // Inventory Rendering (Inside Box Piles)
    // Clip to box area roughly
    ctx.save();
    ctx.beginPath(); ctx.rect(60, -100, 80, 80); ctx.clip();
    boatInventory.current.forEach(item => {
      ctx.save();
      ctx.translate(item.x, item.y - (boatGlobalY - WATER_LEVEL));
      ctx.rotate(item.rotation);
      ctx.font = '24px serif';
      ctx.fillText(item.emoji, 0, 0);
      ctx.restore();
    });
    ctx.restore();

    // Fisherman (Standing - Brown Hat, Blue Shirt, Yellow Pants)
    const fx = -50; 
    const fy = -70; 

    // Legs (Yellow Pants)
    ctx.fillStyle = '#FDD835'; 
    ctx.beginPath(); 
    ctx.roundRect(fx - 15, fy, 30, 30, 4);
    ctx.fill();
    ctx.strokeStyle = '#FBC02D'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx, fy + 28); ctx.stroke();

    // Body (Blue Shirt)
    ctx.fillStyle = '#42A5F5';
    ctx.beginPath(); ctx.roundRect(fx - 18, fy - 40, 36, 45, 8); ctx.fill();

    // Head (Skin)
    ctx.fillStyle = '#FFCC80'; 
    ctx.beginPath(); ctx.ellipse(fx, fy - 50, 16, 14, 0, 0, Math.PI * 2); ctx.fill();

    // Eyes
    ctx.fillStyle = 'black';
    ctx.beginPath(); ctx.arc(fx - 6, fy - 50, 3, 0, Math.PI*2); ctx.fill(); 
    ctx.beginPath(); ctx.arc(fx + 6, fy - 50, 3, 0, Math.PI*2); ctx.fill(); 

    // Hat (Brown Bucket Hat)
    ctx.fillStyle = '#8D6E63'; 
    ctx.beginPath(); ctx.ellipse(fx, fy - 58, 22, 7, 0, 0, Math.PI * 2); ctx.fill(); // Brim
    ctx.beginPath(); ctx.arc(fx, fy - 60, 15, Math.PI, 0); ctx.fill(); // Dome

    // Arms & Rod
    const tip = getRodTipPosition();
    const globalTipX = tip.x;
    const globalTipY = tip.y;
    const localTipX = globalTipX - boatX.current;
    const localTipY = globalTipY - boatGlobalY;

    // Arm (Blue)
    ctx.strokeStyle = '#42A5F5'; ctx.lineWidth = 8; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(fx + 10, fy - 35); ctx.lineTo(fx + 35, fy - 30); ctx.stroke();
    
    // Hand (Skin)
    ctx.fillStyle = '#FFCC80';
    ctx.beginPath(); ctx.arc(fx + 35, fy - 30, 6, 0, Math.PI*2); ctx.fill();
    
    // Rod
    ctx.strokeStyle = '#263238'; ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(fx + 25, fy - 20); // Handle
    ctx.lineTo(localTipX, localTipY); // Tip
    ctx.stroke();

    ctx.restore();

    // --- LINE & HOOK ---
    const tipPos = getRodTipPosition();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(tipPos.x, tipPos.y);
    ctx.lineTo(hookX.current, hookY.current);
    ctx.stroke();

    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(hookX.current, hookY.current);
    ctx.arc(hookX.current, hookY.current + 6, 6, 0, Math.PI, false);
    ctx.stroke();

    // --- ENTITIES ---
    // Icons
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    entities.current.forEach(entity => {
      ctx.save();
      ctx.translate(entity.x, entity.y);
      // Face right direction (1)
      if (entity.direction === 1) {
         ctx.scale(-1, 1); 
      }
      
      // Dynamic Size Logic:
      // Octopus & Tire: Max (100px)
      // Squid: Medium (70px)
      // Crab & Others: Small (45px)
      let fontSize = 45;
      if (entity.type.id === 'octopus' || entity.type.id === 'tire') {
        fontSize = 100;
      } else if (entity.type.id === 'squid') {
        fontSize = 70;
      } else if (entity.type.id === 'crab') {
        fontSize = 45;
      } else {
        fontSize = 45;
      }

      ctx.font = `${fontSize}px serif`;
      
      ctx.fillText(entity.type.emoji, 0, 0);
      ctx.restore();
    });

    // Particles
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    particles.current.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });

  }, [getRodTipPosition]);

  // Game Loop
  useEffect(() => {
    let animationFrameId: number;
    const render = (time: number) => {
      update(time);
      draw();
      animationFrameId = requestAnimationFrame(render);
    };
    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [update, draw]);

  const startGame = () => {
    setScore(0);
    scoreRef.current = 0;
    setTimeLeft(GAME_DURATION);
    timerRef.current = GAME_DURATION;
    lastTimeRef.current = performance.now();
    entities.current = [];
    boatInventory.current = [];
    setGameState(GameState.PLAYING);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 font-sans text-slate-100 overflow-hidden">
      
      {/* Main Canvas Container */}
      <div className="relative shadow-2xl rounded-3xl overflow-hidden border-8 border-slate-700 bg-slate-800">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="cursor-crosshair block"
          onClick={handleCanvasClick}
        />

        {/* HUD: Score (Top Left) */}
        {gameState === GameState.PLAYING && (
          <div className="absolute top-8 left-8 z-10 pointer-events-none select-none">
             <div className="flex flex-col items-start">
                <span className="text-base text-blue-900 font-extrabold uppercase tracking-widest mb-1 bg-white/60 px-3 py-1 rounded-full backdrop-blur-sm">分數</span>
                <span className="text-7xl font-black text-blue-900 drop-shadow-sm" style={{textShadow: '2px 2px 0px rgba(255,255,255,0.5)'}}>{score}</span>
             </div>
          </div>
        )}

        {/* HUD: Timer (Top Right) */}
        {gameState === GameState.PLAYING && (
          <div className="absolute top-8 right-8 z-10 pointer-events-none select-none">
             <div className={`flex flex-col items-end ${timeLeft <= 10 ? 'animate-pulse' : ''}`}>
                <span className="text-base text-blue-900 font-extrabold uppercase tracking-widest mb-1 bg-white/60 px-3 py-1 rounded-full backdrop-blur-sm">時間</span>
                <span className={`text-7xl font-black drop-shadow-sm tabular-nums ${timeLeft <= 10 ? 'text-red-600' : 'text-blue-900'}`} style={{textShadow: '2px 2px 0px rgba(255,255,255,0.5)'}}>
                  {timeLeft}
                </span>
             </div>
          </div>
        )}

        {/* Menu Overlay */}
        {gameState === GameState.MENU && (
          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-20 backdrop-blur-sm">
            <h1 className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-br from-cyan-300 to-blue-600 mb-8 drop-shadow-2xl tracking-tight">
              蔚藍守護者
            </h1>
            <div className="bg-white/10 p-10 rounded-3xl border border-white/10 text-center max-w-xl shadow-2xl">
                <div className="flex justify-around w-full mb-8">
                    <div className="text-center">
                        <div className="text-5xl mb-2">⏱️</div>
                        <div className="font-bold text-blue-100 text-lg">60 秒</div>
                    </div>
                    <div className="text-center">
                        <div className="text-5xl mb-2">🎣</div>
                        <div className="font-bold text-yellow-100 text-lg">釣大魚</div>
                    </div>
                    <div className="text-center">
                        <div className="text-5xl mb-2">🚫</div>
                        <div className="font-bold text-red-300 text-lg">禁垃圾</div>
                    </div>
                </div>
                <button 
                  onClick={startGame}
                  className="w-full py-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black rounded-2xl text-3xl transition transform hover:scale-[1.02] shadow-xl active:scale-95"
                >
                  開始遊戲
                </button>
            </div>
          </div>
        )}

        {/* Game Over Overlay */}
        {gameState === GameState.GAME_OVER && (
          <div className={`absolute inset-0 flex flex-col items-center justify-center z-20 backdrop-blur-md ${gameOverReason === 'trash' ? 'bg-black/90' : 'bg-black/60'}`}>
            
            {gameOverReason === 'trash' ? (
                // DEAD FISH SCREEN
                <div className="text-center animate-bounce-slow">
                    <div className="text-[150px] mb-6 drop-shadow-2xl grayscale opacity-90">☠️</div>
                    <h2 className="text-7xl font-black text-red-600 uppercase tracking-tighter mb-4 stroke-text">海洋污染！</h2>
                    <p className="text-gray-300 text-2xl font-light">你釣到了垃圾，魚群已死亡。</p>
                    <div className="mt-8 px-8 py-4 bg-red-900/30 rounded-2xl border border-red-500/30">
                         <span className="text-red-400 text-xl font-bold uppercase mr-4">最終得分</span>
                         <span className="text-5xl font-black text-white">{score}</span>
                    </div>
                </div>
            ) : (
                // TIME UP SCREEN
                <div className="text-center">
                    <div className="text-[120px] mb-4 animate-wiggle">⏰</div>
                    <h2 className="text-8xl font-black text-white mb-8 drop-shadow-xl">時間到！</h2>
                    <div className="bg-white/20 p-10 rounded-3xl border border-white/30 shadow-2xl backdrop-blur-xl transform hover:scale-105 transition duration-300">
                        <p className="text-blue-100 uppercase tracking-[0.2em] text-lg mb-2 font-bold">最終成績</p>
                        <p className="text-[120px] leading-none font-black text-yellow-300 drop-shadow-md">{score}</p>
                    </div>
                </div>
            )}

            <button 
              onClick={startGame}
              className="mt-12 px-12 py-5 bg-white text-slate-900 font-black rounded-full text-2xl hover:bg-blue-50 transition shadow-xl transform hover:-translate-y-1"
            >
              再玩一次 🔄
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;