import React, { useState, useEffect, useCallback, useRef } from 'react';

const COLORS = ['#26a69a', '#d4e157', '#ef5350', '#42a5f5', '#ab47bc', '#ffa726', '#26c6da'];
const KYRGYZ_ALPHABET = "АБВГДЕЁЖЗИЙКЛМНОПРСТУҮФХЦЧШЩЪЫЬЭЮЯӨҢ";

const FilwordGame = ({ wordsData = [] }) => {
  // --- States ---
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('filword_user')));
  const [view, setView] = useState('menu'); 
  const [currentCatIndex, setCurrentCatIndex] = useState(() => parseInt(localStorage.getItem('filword_level')) || 0);
  const [score, setScore] = useState(() => parseInt(localStorage.getItem('filword_score')) || 0);
  const [completedDays, setCompletedDays] = useState(() => JSON.parse(localStorage.getItem('completed_days')) || {});
  
  const [grid, setGrid] = useState([]);
  const [selectedCells, setSelectedCells] = useState([]);
  const [foundWords, setFoundWords] = useState([]);
  const [targetWords, setTargetWords] = useState([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [showWinModal, setShowWinModal] = useState(false);
  const [isDaily, setIsDaily] = useState(false);

  const gridRef = useRef(null);
  const gridSize = 6;
  const todayKey = new Date().toISOString().split('T')[0]; // Мисалы: "2023-10-25"

  // --- Effects ---
  useEffect(() => {
    document.body.style.overscrollBehaviorY = 'contain';
    return () => { document.body.style.overscrollBehaviorY = 'auto'; };
  }, []);

  useEffect(() => {
    localStorage.setItem('filword_level', currentCatIndex);
    localStorage.setItem('filword_score', score);
    localStorage.setItem('completed_days', JSON.stringify(completedDays));
  }, [currentCatIndex, score, completedDays]);

  // --- Game Core Functions ---
  const generateLevel = useCallback((index, daily = false) => {
    const category = wordsData[index % wordsData.length];
    if (!category) return;

    let newGrid = Array(gridSize).fill(null).map(() => Array(gridSize).fill(null));
    let finalWords = [];
    const availableWords = [...category.words]
      .filter(w => w.length >= 3 && w.length <= 6)
      .map(w => w.toUpperCase());

    const solve = (r, c) => {
      if (r === gridSize) return true;
      let nextR = c === gridSize - 1 ? r + 1 : r;
      let nextC = c === gridSize - 1 ? 0 : c + 1;
      if (newGrid[r][c]) return solve(nextR, nextC);

      const shuffled = [...availableWords].sort(() => Math.random() - 0.5);
      for (let word of shuffled) {
        const paths = findPaths(r, c, word.length, newGrid);
        for (let path of paths) {
          path.forEach((p, i) => newGrid[p.r][p.c] = { char: word[i], word });
          if (solve(nextR, nextC)) {
            finalWords.push({ word, path });
            return true;
          }
          path.forEach(p => newGrid[p.r][p.c] = null);
        }
      }
      return false;
    };

    function findPaths(r, c, len, g) {
      let res = [];
      const explore = (currR, currC, path, vis) => {
        if (path.length === len) { res.push([...path]); return; }
        const neighbors = [[1,0], [-1,0], [0,1], [0,-1]]
          .map(([dr, dc]) => ({ r: currR + dr, c: currC + dc }))
          .filter(n => n.r >= 0 && n.r < gridSize && n.c >= 0 && n.c < gridSize && !g[n.r][n.c] && !vis.has(`${n.r},${n.c}`));

        for (let n of neighbors) {
          vis.add(`${n.r},${n.c}`);
          path.push(n);
          explore(n.r, n.c, path, vis);
          path.pop();
          vis.delete(`${n.r},${n.c}`);
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

  // --- Hint System ---
  const useHint = () => {
    if (score < 50) return alert("Упайыңыз жетпейт (Кеминде 50 упай керек)!");
    
    const remainingWords = targetWords.filter(t => !foundWords.some(f => f.word === t.word));
    if (remainingWords.length > 0) {
      const hintWord = remainingWords[0];
      const color = COLORS[foundWords.length % COLORS.length];
      setFoundWords(prev => [...prev, { ...hintWord, cells: hintWord.path, color, isHint: true }]);
      setScore(prev => prev - 50);
      
      // Бардык сөз табылса
      if (foundWords.length + 1 === targetWords.length) {
        finishLevel();
      }
    }
  };

  const finishLevel = () => {
    if (isDaily) {
      setCompletedDays(prev => ({ ...prev, [todayKey]: true }));
    }
    setShowWinModal(true);
  };

  // --- Interaction ---
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
    if (navigator.vibrate) navigator.vibrate(10);
  };

  const moveSelection = (r, c) => {
    if (!isSelecting) return;
    const isAlreadyFound = foundWords.some(f => f.cells.some(s => s.r === r && s.c === c));
    const isAlreadySelected = selectedCells.some(s => s.r === r && s.c === c);
    if (isAlreadyFound || isAlreadySelected) return;

    const last = selectedCells[selectedCells.length - 1];
    const isNeighbor = (last.c === c && Math.abs(last.r - r) === 1) || (last.r === r && Math.abs(last.c - c) === 1);
    if (isNeighbor) {
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
      if (newFound.length === targetWords.length) finishLevel();
    }
    setSelectedCells([]);
  };

  // --- Calendar Logic ---
  const renderCalendar = () => {
    const days = Array.from({ length: 30 }, (_, i) => i + 1);
    return (
      <div className="calendar-view">
        <h3 className="view-title">Күнүмдүк тапшырмалар</h3>
        <div className="calendar-grid">
          {days.map(day => {
            const dateStr = `2026-04-${day.toString().padStart(2, '0')}`; // Мисал үчүн 2026-жыл
            const isCompleted = completedDays[dateStr];
            const isToday = todayKey === dateStr;
            const canPlay = isToday && !isCompleted;

            return (
              <div 
                key={day} 
                className={`calendar-day ${isCompleted ? 'done' : ''} ${isToday ? 'today' : ''} ${!canPlay && !isCompleted ? 'locked' : ''}`}
                onClick={() => canPlay && generateLevel(day + 100, true)}
              >
                {day}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (!user) {
    return (
      <div className="login-screen">
        <div className="card">
          <h1>Кыргыз Сөз</h1>
          <input id="userName" placeholder="Атыңызды жазыңыз..." />
          <button onClick={() => {
            const name = document.getElementById('userName').value;
            if (name) {
              setUser({ name });
              localStorage.setItem('filword_user', JSON.stringify({ name }));
            }
          }}>БАШТОО</button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-wrapper" onTouchEnd={endSelection} onMouseUp={endSelection}>
      
      {/* Top Header */}
      <div className="top-bar">
        <div className="user-info">👤 {user.name}</div>
        <div className="level-badge">ТУР: {currentCatIndex + 1}</div>
        <div className="score-badge">🏆 {score}</div>
      </div>

      <div className="main-content">
        {view === 'menu' && (
          <div className="menu-view">
            <div className="hero-card">
              <h2>Даярсызбы?</h2>
              <p>Учурдагы тур: {currentCatIndex + 1}</p>
              <button className="play-button" onClick={() => generateLevel(currentCatIndex)}>ОЙНОО</button>
            </div>
          </div>
        )}

        {view === 'calendar' && renderCalendar()}

        {view === 'game' && (
          <div className="game-view">
            <div className="game-header">
              <button onClick={() => setView('menu')}>🔙</button>
              <div className="category-name">{wordsData[currentCatIndex % wordsData.length]?.category}</div>
              <button className="hint-btn" onClick={useHint}>💡 (50)</button>
            </div>

            <div className="grid-container" ref={gridRef} onTouchMove={handleTouchMove}>
              {grid.map((row, r) => row.map((cell, c) => {
                const isSel = selectedCells.some(s => s.r === r && s.c === c);
                const fnd = foundWords.find(f => f.cells.some(s => s.r === r && s.c === c));
                return (
                  <div
                    key={`${r}-${c}`} data-r={r} data-c={c}
                    className={`cell ${isSel ? 'selecting' : ''} ${fnd ? 'found' : ''}`}
                    style={fnd ? { backgroundColor: fnd.color } : {}}
                    onPointerDown={() => startSelection(r, c)}
                    onPointerEnter={() => moveSelection(r, c)}
                  >
                    {cell?.char}
                  </div>
                );
              }))}
            </div>
            
            <div className="word-list">
              {targetWords.map((t, i) => (
                <span key={i} className={foundWords.some(f => f.word === t.word) ? 'strikethrough' : ''}>
                  {foundWords.some(f => f.word === t.word) ? t.word : '?.?.?.'}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="bottom-nav">
        <button className={view === 'menu' ? 'active' : ''} onClick={() => setView('menu')}>🏠<span>Башкы</span></button>
        <button className={view === 'calendar' ? 'active' : ''} onClick={() => setView('calendar')}>📅<span>Күн</span></button>
        <button onClick={() => { localStorage.clear(); window.location.reload(); }}>🚪<span>Чыгуу</span></button>
      </nav>

      {/* Win Modal */}
      {showWinModal && (
        <div className="modal">
          <div className="modal-content">
            <h2>СОНУН!</h2>
            <p>Тур аяктады. Сиз жаңы упайларга ээ болдуңуз.</p>
            <button onClick={() => {
              if (!isDaily) {
                const n = currentCatIndex + 1;
                setCurrentCatIndex(n);
                generateLevel(n);
              } else {
                setView('calendar');
                setShowWinModal(false);
              }
            }}>УЛАНТУУ</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilwordGame;