import React, { useState, useEffect, useCallback, useRef } from 'react';

const COLORS = ['#26a69a', '#d4e157', '#ef5350', '#42a5f5', '#ab47bc', '#ffa726', '#26c6da'];
const KYRGYZ_ALPHABET = "АБВГДЕЁЖЗИЙКЛМНОПРСТУҮФХЦЧШЩЪЫЬЭЮЯӨҢ";

const FilwordGame = ({ wordsData = [] }) => {
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
  const gridRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('filword_level', currentCatIndex);
    localStorage.setItem('filword_score', score);
    localStorage.setItem('completed_days', JSON.stringify(completedDays));
  }, [currentCatIndex, score, completedDays]);

  const generateLevel = useCallback((index, daily = false) => {
    const category = wordsData[index % wordsData.length] || { category: "Жалпы", words: ["АЛМА", "КИЛИМ", "ТОО", "БАЛА"] };

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

  // --- TOUCH HANDLERS ---
  const handleTouchMove = (e) => {
    if (!isSelecting) return;
    const touch = e.touches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    if (el && el.hasAttribute('data-r')) {
      const r = parseInt(el.getAttribute('data-r'));
      const c = parseInt(el.getAttribute('data-c'));
      moveSelection(r, c);
    }
  };

  const startSelection = (r, c) => {
    if (foundWords.some(f => f.cells.some(s => s.r === r && s.c === c))) return;
    setIsSelecting(true);
    setSelectedCells([{ r, c }]);
    if (window.navigator.vibrate) window.navigator.vibrate(10);
  };

  const moveSelection = (r, c) => {
    if (!isSelecting || foundWords.some(f => f.cells.some(s => s.r === r && s.c === c))) return;
    if (selectedCells.some(s => s.r === r && s.c === c)) return;
    const last = selectedCells[selectedCells.length - 1];
    if ((last.c === c && Math.abs(last.r - r) === 1) || (last.r === r && Math.abs(last.c - c) === 1)) {
      setSelectedCells(prev => [...prev, { r, c }]);
      if (window.navigator.vibrate) window.navigator.vibrate(5);
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
      if (window.navigator.vibrate) window.navigator.vibrate([30, 50, 30]);
      if (newFound.length === targetWords.length) {
        setTimeout(() => setShowWinModal(true), 500);
      }
    }
    setSelectedCells([]);
  };

  return (
    <div onMouseUp={endSelection} onTouchEnd={endSelection} style={styles.fullPage}>
      <style>{`
        body { margin: 0; padding: 0; overflow: hidden; position: fixed; width: 100%; height: 100%; }
        * { -webkit-tap-highlight-color: transparent; user-select: none; }
        .nav-item.active .icon { color: #29fd53 !important; transform: translateY(-5px); }
        .cell-pop { animation: pop 0.2s ease-out; }
        @keyframes pop { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
      `}</style>

      {view === 'menu' && (
        <div style={styles.container}>
          <div style={styles.header}>КЫРГЫЗ СӨЗ</div>
          <div style={styles.levelCard}>
            <div style={{opacity: 0.7, fontSize: '14px'}}>ДЕҢГЭЭЛ</div>
            <div style={{fontSize: '60px', fontWeight: 'bold', color: '#00f2fe'}}>{currentCatIndex + 1}</div>
          </div>
          <button onClick={() => generateLevel(currentCatIndex)} style={styles.mainBtn}>ОЙНОО</button>
          <div style={styles.statRow}>
            <div style={styles.glassBadge}>🏆 {score}</div>
          </div>
        </div>
      )}

      {view === 'game' && (
        <div style={styles.gameWrapper}>
          <div style={styles.gameHeader}>
            <button onClick={() => setView('menu')} style={styles.iconBtn}>🏠</button>
            <div style={styles.categoryTag}>{wordsData[currentCatIndex % wordsData.length]?.category || "Оюн"}</div>
            <div style={styles.scoreTag}>🏆 {score}</div>
          </div>

          <div 
            ref={gridRef}
            onTouchMove={handleTouchMove}
            style={styles.grid}
          >
            {grid.map((row, r) => row.map((cell, c) => {
              const isSel = selectedCells.some(s => s.r === r && s.c === c);
              const fnd = foundWords.find(f => f.cells.some(s => s.r === r && s.c === c));
              return (
                <div 
                  key={`${r}-${c}`}
                  data-r={r} data-c={c}
                  onTouchStart={() => startSelection(r, c)}
                  onMouseDown={() => startSelection(r, c)}
                  onMouseEnter={() => moveSelection(r, c)}
                  style={{
                    ...styles.cell,
                    background: isSel ? '#00f2fe' : fnd ? fnd.color : 'rgba(255, 255, 255, 0.08)',
                    color: isSel || fnd ? '#000' : '#fff',
                    transform: isSel ? 'scale(0.95)' : 'scale(1)',
                    boxShadow: isSel ? '0 0 15px #00f2fe' : 'none'
                  }}
                >
                  {cell?.char}
                </div>
              );
            }))}
          </div>

          <div style={styles.wordProgress}>
            {foundWords.length} / {targetWords.length} сөз табылды
          </div>
        </div>
      )}

      {/* Navigation Bar */}
      {view !== 'game' && (
        <div style={styles.navBar}>
          <div onClick={() => setView('menu')} className={`nav-item ${view === 'menu' ? 'active' : ''}`} style={styles.navItem}>
            <span style={styles.navIcon}>🏠</span>
            <span style={styles.navText}>Башкы</span>
          </div>
          <div onClick={() => setView('calendar')} className={`nav-item ${view === 'calendar' ? 'active' : ''}`} style={styles.navItem}>
            <span style={styles.navIcon}>📅</span>
            <span style={styles.navText}>Күн</span>
          </div>
          <div onClick={() => { localStorage.clear(); window.location.reload(); }} style={styles.navItem}>
            <span style={styles.navIcon}>🚪</span>
            <span style={styles.navText}>Чыгуу</span>
          </div>
        </div>
      )}

      {showWinModal && (
        <div style={styles.overlay}>
          <div style={styles.winCard}>
            <h2 style={{color: '#4ade80'}}>СОНУН!</h2>
            <p>Бардык сөздөрдү таптыңыз!</p>
            <button onClick={() => {
              const next = currentCatIndex + 1;
              setCurrentCatIndex(next);
              generateLevel(next);
            }} style={styles.mainBtn}>КИЙИНКИ</button>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  fullPage: {
    background: '#0f172a',
    height: '100vh',
    width: '100vw',
    display: 'flex',
    flexDirection: 'column',
    color: 'white',
    fontFamily: 'system-ui, sans-serif'
  },
  container: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px'
  },
  header: { fontSize: '28px', fontWeight: '900', letterSpacing: '2px', marginBottom: '40px', color: '#00f2fe' },
  levelCard: {
    background: 'rgba(255,255,255,0.05)',
    width: '80%',
    padding: '30px',
    borderRadius: '30px',
    textAlign: 'center',
    border: '1px solid rgba(255,255,255,0.1)',
    marginBottom: '40px'
  },
  mainBtn: {
    background: '#4ade80',
    color: '#000',
    border: 'none',
    padding: '15px 50px',
    borderRadius: '20px',
    fontSize: '20px',
    fontWeight: 'bold',
    boxShadow: '0 10px 20px rgba(74, 222, 128, 0.3)'
  },
  statRow: { display: 'flex', gap: '15px', marginTop: '20px' },
  glassBadge: { background: 'rgba(255,255,255,0.1)', padding: '10px 20px', borderRadius: '15px' },
  gameWrapper: { flex: 1, display: 'flex', flexDirection: 'column', padding: '15px' },
  gameHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', marginTop: '10px' },
  iconBtn: { background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '12px', padding: '10px', color: 'white' },
  categoryTag: { background: '#1e293b', padding: '8px 15px', borderRadius: '12px', fontSize: '14px', border: '1px solid #334155' },
  scoreTag: { fontWeight: 'bold', color: '#fbbf24' },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(6, 1fr)',
    gap: '6px',
    background: 'rgba(255,255,255,0.03)',
    padding: '10px',
    borderRadius: '20px',
    aspectRatio: '1/1',
    touchAction: 'none'
  },
  cell: {
    aspectRatio: '1/1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '10px',
    fontSize: '5vw',
    fontWeight: 'bold',
    transition: 'all 0.15s ease'
  },
  wordProgress: { textAlign: 'center', marginTop: '20px', opacity: 0.6, fontSize: '14px' },
  navBar: {
    height: '75px',
    background: '#1e293b',
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 'env(safe-area-inset-bottom)'
  },
  navItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' },
  navIcon: { fontSize: '20px' },
  navText: { fontSize: '12px', opacity: 0.8 },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  winCard: { background: '#1e293b', padding: '40px', borderRadius: '30px', textAlign: 'center', width: '80%' }
};

export default FilwordGame;