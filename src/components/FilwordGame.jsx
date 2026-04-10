import React, { useState, useEffect, useCallback } from 'react';

const COLORS = ['#26a69a', '#d4e157', '#ef5350', '#42a5f5', '#ab47bc', '#ffa726', '#26c6da'];
const KYRGYZ_ALPHABET = "АБВГДЕЁЖЗИЙКЛМНОПРСТУҮФХЦЧШЩЪЫЬЭЮЯӨҢ";

const FilwordGame = ({ wordsData = [] }) => {
  // --- STATES (Сенин бардык өзгөрмөлөрүң сакталды) ---
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('filword_user')));
  const [view, setView] = useState('menu'); 
  const [currentCatIndex, setCurrentCatIndex] = useState(() => parseInt(localStorage.getItem('filword_level')) || 0);
  const [score, setScore] = useState(() => parseInt(localStorage.getItem('filword_score')) || 0);
  const [completedDays, setCompletedDays] = useState(() => JSON.parse(localStorage.getItem('completed_days')) || []);
  
  const [grid, setGrid] = useState([]);
  const [selectedCells, setSelectedCells] = useState([]);
  const [foundWords, setFoundWords] = useState([]);
  const [targetWords, setTargetWords] = useState([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [showWinModal, setShowWinModal] = useState(false);
  const [isDaily, setIsDaily] = useState(false);

  const gridSize = 6;
  const today = new Date().getDate();

  // Навигация элементтери (Сенин CSS'иңдеги 1, 2, 3, 4-чи орундар үчүн)
  const navItems = [
    { id: 'menu', icon: 'home-outline', text: 'Башкы' },
    { id: 'calendar', icon: 'calendar-outline', text: 'Күн' },
    { id: 'profile', icon: 'person-outline', text: 'Профиль' },
    { id: 'settings', icon: 'settings-outline', text: 'Чыгуу' }
  ];

  useEffect(() => {
    localStorage.setItem('filword_level', currentCatIndex);
    localStorage.setItem('filword_score', score);
    localStorage.setItem('completed_days', JSON.stringify(completedDays));
  }, [currentCatIndex, score, completedDays]);

  // --- GAME GENERATION (Сенин оригиналдуу алгоритмиң) ---
  const generateLevel = useCallback((index, daily = false) => {
    const category = wordsData[index % wordsData.length];
    if (!category) return;

    let newGrid = Array(gridSize).fill(null).map(() => Array(gridSize).fill(null));
    let finalWords = [];
    const availableWords = category.words.filter(w => w.length >= 3 && w.length <= 6).map(w => w.toUpperCase());

    const solve = (r, c) => {
      if (r === gridSize) return true;
      let nextR = c === gridSize - 1 ? r + 1 : r;
      let nextC = c === gridSize - 1 ? 0 : c + 1;
      if (newGrid[r][c]) return solve(nextR, nextC);
      const shuffled = [...availableWords].sort(() => Math.random() - 0.5);
      for (let word of shuffled) {
        const paths = findPaths(r, c, word.length, newGrid);
        for (let path of paths) {
          path.forEach((p, i) => newGrid[p.r][p.c] = { char: word[i], word: word });
          if (solve(nextR, nextC)) { finalWords.push({ word, path }); return true; }
          path.forEach(p => newGrid[p.r][p.c] = null);
        }
      }
      return false;
    };

    function findPaths(r, c, len, g) {
      let res = [];
      const explore = (currR, currC, path, vis) => {
        if (path.length === len) { res.push([...path]); return; }
        const neighbors = [[1,0], [-1,0], [0,1], [0,-1]].map(([dr, dc]) => ({ r: currR + dr, c: currC + dc }))
          .filter(n => n.r >= 0 && n.r < gridSize && n.c >= 0 && n.c < gridSize && !g[n.r][n.c] && !vis.has(`${n.r},${n.c}`));
        for (let n of neighbors) {
          vis.add(`${n.r},${n.c}`); path.push(n);
          explore(n.r, n.c, path, vis);
          path.pop(); vis.delete(`${n.r},${n.c}`);
        }
      };
      explore(r, c, [{ r, c }], new Set([`${r},${c}`]));
      return res.sort(() => Math.random() - 0.5).slice(0, 5);
    }

    solve(0, 0);
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (!newGrid[r][c]) {
          newGrid[r][c] = { char: KYRGYZ_ALPHABET[Math.floor(Math.random() * KYRGYZ_ALPHABET.length)], isFiller: true };
        }
      }
    }
    setGrid([...newGrid]);
    setTargetWords(finalWords);
    setFoundWords([]);
    setShowWinModal(false);
    setIsDaily(daily);
    setView('game');
  }, [wordsData]);

  // --- SELECTION LOGIC (Сенин оригиналдуу логикаң) ---
  const startSelection = (r, c) => {
    if (foundWords.some(f => f.cells.some(s => s.r === r && s.c === c))) return;
    setIsSelecting(true);
    setSelectedCells([{ r, c }]);
  };

  const moveSelection = (r, c) => {
    if (!isSelecting || foundWords.some(f => f.cells.some(s => s.r === r && s.c === c))) return;
    if (selectedCells.some(s => s.r === r && s.c === c)) return;
    const last = selectedCells[selectedCells.length - 1];
    if ((last.c === c && Math.abs(last.r - r) === 1) || (last.r === r && Math.abs(last.c - c) === 1)) {
      setSelectedCells(prev => [...prev, { r, c }]);
    }
  };

  const endSelection = () => {
    if (!isSelecting) return;
    setIsSelecting(false);
    const selectedText = selectedCells.map(cell => grid[cell.r][cell.c].char).join('');
    const match = targetWords.find(t => t.word === selectedText && !foundWords.some(f => f.word === t.word));
    
    if (match && match.word.length === selectedCells.length) {
      const color = COLORS[foundWords.length % COLORS.length];
      const newFound = [...foundWords, { ...match, cells: [...selectedCells], color }];
      setFoundWords(newFound);
      setScore(prev => prev + (match.word.length * 10));
      if (newFound.length === targetWords.length) {
        if (isDaily) setCompletedDays(prev => [...new Set([...prev, today])]);
        setTimeout(() => setShowWinModal(true), 500);
      }
    }
    setSelectedCells([]);
  };

  if (!user) {
    return (
      <div style={styles.modalOverlay}>
        <div style={styles.glassCard}>
          <h2 style={{color: '#00f2fe', marginBottom: '20px'}}>Кыргыз Сөз</h2>
          <input id="userName" placeholder="Атыңыз" style={styles.glassInput} />
          <button onClick={() => {
            const name = document.getElementById('userName').value;
            if (name) {
              const newUser = { name, age: 18 };
              setUser(newUser);
              localStorage.setItem('filword_user', JSON.stringify(newUser));
            }
          }} style={styles.neonButton}>БАШТОО</button>
        </div>
      </div>
    );
  }

  return (
    <div onMouseUp={endSelection} onTouchEnd={endSelection} style={styles.fullPage}>

      <div style={styles.contentArea}>
        {view === 'menu' && (
          <div style={styles.menuInner}>
            <div style={styles.levelCard}>
               <div style={{fontSize: '14px', opacity: 0.7}}>УЧУРДАГЫ ДЕҢГЭЭЛ</div>
               <div style={{fontSize: '54px', fontWeight: '900', color: '#00f2fe'}}>{currentCatIndex + 1}</div>
               <div style={styles.progressBar}><div style={{...styles.progressFill, width: '40%'}}></div></div>
            </div>
            <button onClick={() => generateLevel(currentCatIndex)} style={styles.playBtnLarge}>ОЙНОО</button>
            <div style={styles.scoreRow}>
                <div style={styles.glassBadge}>🏆 {score}</div>
                <div style={styles.glassBadge}>💎 1430</div>
            </div>
          </div>
        )}

        {view === 'game' && (
          <div style={styles.gameContainer}>
            <div style={styles.headerRow}>
                <button onClick={() => setView('menu')} style={styles.backBtn}>🏠</button>
                <div style={styles.glassTag}>{wordsData[currentCatIndex % wordsData.length]?.category.replace(/_/g, ' ')}</div>
                <div style={styles.glassBadge}>🏆 {score}</div>
            </div>
            <div 
              onPointerMove={(e) => {
                if (!isSelecting) return;
                const el = document.elementFromPoint(e.clientX, e.clientY);
                if (el && el.getAttribute('data-r')) moveSelection(parseInt(el.getAttribute('data-r')), parseInt(el.getAttribute('data-c')));
              }} 
              style={styles.gameGrid}
            >
                {grid.map((row, r) => row.map((cell, c) => {
                    const isSel = selectedCells.some(s => s.r === r && s.c === c);
                    const fnd = foundWords.find(f => f.cells.some(s => s.r === r && s.c === c));
                    return (
                        <div key={`${r}-${c}`} data-r={r} data-c={c}
                            onPointerDown={(e) => { e.target.releasePointerCapture(e.pointerId); startSelection(r, c); }}
                            style={{
                                ...styles.cell,
                                background: isSel ? '#00f2fe' : fnd ? fnd.color : 'rgba(255, 255, 255, 0.05)',
                                color: isSel || fnd ? '#000' : '#fff',
                                touchAction: 'none'
                            }}
                        >{cell?.char}</div>
                    );
                }))}
            </div>
          </div>
        )}

        {view === 'calendar' && (
            <div style={styles.calendarContainer}>
                <h2 style={styles.neonText}>Жылнама</h2>
                <div style={styles.calendarGrid}>
                    {Array.from({ length: 30 }, (_, i) => i + 1).map(day => (
                        <div key={day} onClick={() => generateLevel(day + 100, true)} 
                             style={{...styles.calendarCell, background: completedDays.includes(day) ? '#10b981' : 'rgba(255,255,255,0.05)'}}>
                            {day}
                        </div>
                    ))}
                </div>
            </div>
        )}
      </div>

      {showWinModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.glassCard}>
            <h2 style={styles.neonText}>ЖЕҢИШ!</h2>
            <p>Сиз бардык сөздөрдү таптыңыз!</p>
            <button onClick={() => {
                const nextIdx = currentCatIndex + 1;
                setCurrentCatIndex(nextIdx);
                generateLevel(nextIdx);
            }} style={styles.neonButton}>КИЙИНКИ</button>
          </div>
        </div>
      )}

      {/* --- СЕНИН ТҮПНУСКА НАВИГАЦИЯҢ (БУЗУЛГАН ЖОК) --- */}
      {view !== 'game' && (
        <div className="navigation">
          <ul>
            {navItems.map((item) => (
              <li 
                key={item.id} 
                className={view === item.id ? 'active' : ''} 
                onClick={() => {
                  if(item.id === 'settings') { 
                    localStorage.clear(); 
                    window.location.reload(); 
                  } else {
                    setView(item.id);
                  }
                }}
              >
                <a href="#" onClick={(e) => e.preventDefault()}>
                  <span className="icon"><ion-icon name={item.icon}></ion-icon></span>
                  <span className="text">{item.text}</span>
                </a>
              </li>
            ))}
            {/* Индикатор так ушул жерде болушу шарт (CSS үчүн) */}
            <div className="indicator"></div>
          </ul>
        </div>
      )}
    </div>
  );
};

// Стилдерди өзүнчө объектке чыгарып койдум, оюндун ичиндеги макетти кармап турат
const styles = {
  fullPage: { background: '#0f172a', minHeight: '100vh', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: 'Poppins, sans-serif', overflow: 'hidden' },
  contentArea: { flex: 1, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px' },
  menuInner: { width: '100%', textAlign: 'center', marginTop: '40px' },
  levelCard: { background: 'rgba(255,255,255,0.03)', padding: '40px 20px', borderRadius: '40px', marginBottom: '30px', border: '1px solid rgba(255,255,255,0.05)' },
  progressBar: { width: '80%', height: '10px', background: 'rgba(255,255,255,0.1)', borderRadius: '10px', margin: '20px auto 0' },
  progressFill: { height: '100%', background: '#4ade80', borderRadius: '10px' },
  playBtnLarge: { width: '200px', height: '60px', borderRadius: '30px', background: '#4ade80', border: 'none', color: 'white', fontSize: '20px', fontWeight: 'bold', cursor: 'pointer' },
  scoreRow: { display: 'flex', gap: '15px', marginTop: '30px', justifyContent: 'center' },
  glassBadge: { background: 'rgba(255,255,255,0.05)', padding: '10px 20px', borderRadius: '15px', border: '1px solid rgba(255,255,255,0.1)', fontWeight: 'bold' },
  gameContainer: { width: '100%', maxWidth: '400px', textAlign: 'center' },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  gameGrid: { display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px', background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '25px', touchAction: 'none' },
  cell: { aspectRatio: '1/1', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px', fontSize: '18px', fontWeight: 'bold', transition: '0.2s', userSelect: 'none' },
  calendarContainer: { width: '100%', maxWidth: '400px' },
  calendarGrid: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', marginTop: '20px' },
  calendarCell: { aspectRatio: '1/1', background: 'rgba(255,255,255,0.05)', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 },
  glassCard: { background: '#1e293b', padding: '30px', borderRadius: '30px', textAlign: 'center', width: '80%', border: '1px solid rgba(255,255,255,0.1)' },
  neonText: { color: '#00f2fe', textShadow: '0 0 10px #00f2fe', fontSize: '24px' },
  neonButton: { width: '100%', padding: '15px', background: '#00f2fe', border: 'none', borderRadius: '15px', fontWeight: 'bold', marginTop: '20px' },
  glassInput: { width: '100%', padding: '15px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '15px', color: 'white', marginBottom: '20px', outline: 'none' },
  backBtn: { background: 'none', border: 'none', color: 'white', fontSize: '24px', cursor: 'pointer' },
  glassTag: { padding: '5px 15px', background: 'rgba(255,255,255,0.1)', borderRadius: '10px', fontSize: '14px' }
};

export default FilwordGame;