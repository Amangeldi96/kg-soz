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

  const gridRef = useRef(null);
  const gridSize = 6;
  const today = new Date().getDate();

  const navItems = [
    { id: 'menu', icon: 'home-outline', text: 'Башкы' },
    { id: 'calendar', icon: 'calendar-outline', text: 'Күн' },
    { id: 'stats', icon: 'bar-chart-outline', text: 'Рейтинг' },
    { id: 'settings', icon: 'settings-outline', text: 'Чыгуу' }
  ];

  useEffect(() => {
    document.body.style.overscrollBehaviorY = 'contain';
    return () => { document.body.style.overscrollBehaviorY = 'auto'; };
  }, []);

  useEffect(() => {
    localStorage.setItem('filword_level', currentCatIndex);
    localStorage.setItem('filword_score', score);
    localStorage.setItem('completed_days', JSON.stringify(completedDays));
  }, [currentCatIndex, score, completedDays]);

  const generateLevel = useCallback((index, daily = false) => {
    const category = wordsData[index % wordsData.length];
    if (!category) return;

    let newGrid = Array(gridSize).fill(null).map(() => Array(gridSize).fill(null));
    let finalWords = [];
    const availableWords = category.words
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
          newGrid[r][c] = {
            char: KYRGYZ_ALPHABET[Math.floor(Math.random() * KYRGYZ_ALPHABET.length)],
            isFiller: true
          };
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

  // ПОДСКАЗКА ФУНКЦИЯСЫ (50 упай алат)
  const useHint = () => {
    if (score < 50) {
      alert("Упайыңыз жетпейт! (Кеминде 50 упай керек)");
      return;
    }
    const notFound = targetWords.filter(t => !foundWords.some(f => f.word === t.word));
    if (notFound.length > 0) {
      const hintWord = notFound[0];
      const color = COLORS[foundWords.length % COLORS.length];
      const newFound = [...foundWords, { ...hintWord, cells: hintWord.path, color }];
      setFoundWords(newFound);
      setScore(prev => prev - 50);
      if (newFound.length === targetWords.length) {
        if (isDaily) setCompletedDays(prev => [...new Set([...prev, today])]);
        setTimeout(() => setShowWinModal(true), 500);
      }
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
      if (navigator.vibrate) navigator.vibrate(5);
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

  const handleTouchMove = (e) => {
    if (!isSelecting) return;
    const touch = e.touches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    if (el && el.hasAttribute('data-r')) {
      moveSelection(parseInt(el.getAttribute('data-r')), parseInt(el.getAttribute('data-c')));
    }
  };

  if (!user) {
    return (
      <div className="modal-overlay">
        <div className="glass-card">
          <h2 className="neon-text">Кыргыз Сөз</h2>
          <input id="userName" placeholder="Атыңыз" className="glass-input" />
          <button className="neon-button" onClick={() => {
            const name = document.getElementById('userName').value;
            if (name) {
              const newUser = { name, age: 18 };
              setUser(newUser);
              localStorage.setItem('filword_user', JSON.stringify(newUser));
            }
          }}>БАШТОО</button>
        </div>
      </div>
    );
  }

  return (
    <div className="full-page" onMouseUp={endSelection} onTouchEnd={endSelection} style={{ touchAction: 'none', overflow: 'hidden', height: '100vh' }}>
      <div className="content-area">
        {view === 'menu' && (
          <div className="menu-inner">
            <div className="level-card">
              <div className="level-title">УЧУРДАГЫ ТУР</div>
              <div className="level-number">{currentCatIndex + 1}</div>
              <div className="progress-bar"><div className="progress-fill" style={{ width: '40%' }} /></div>
            </div>
            <button className="play-btn-large" onClick={() => generateLevel(currentCatIndex)}>ОЙНОО</button>
            <div className="score-row">
              <div className="glass-badge">🏆 {score}</div>
              <div className="glass-badge">💎 1430</div>
            </div>
          </div>
        )}

        {view === 'calendar' && (
          <div className="calendar-container">
            <h2 className="view-title">Күнүмдүк тапшырма</h2>
            <div className="calendar-grid">
              {[...Array(31)].map((_, i) => {
                const day = i + 1;
                const isCompleted = completedDays.includes(day);
                const isToday = day === today;
                const isLocked = day > today; // Келечектеги күндөр жабык

                return (
                  <div 
                    key={day} 
                    className={`day-cell ${isCompleted ? 'green' : isToday ? 'blue' : isLocked ? 'locked' : 'missed'}`}
                    onClick={() => {
                      if (isToday && !isCompleted) generateLevel(day + 100, true);
                    }}
                  >
                    {day}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {view === 'game' && (
          <div className="game-container">
            <div className="header-row">
              <button className="back-btn" onClick={() => setView('menu')}>🏠</button>
              <div className="tour-badge">ТУР: {currentCatIndex + 1}</div>
              <button className="hint-btn" onClick={useHint}>💡 Подсказка</button>
              <div className="glass-badge">🏆 {score}</div>
            </div>
            <div className="game-grid" ref={gridRef} onTouchMove={handleTouchMove} style={{ touchAction: 'none' }}>
              {grid.map((row, r) => row.map((cell, c) => {
                const isSel = selectedCells.some(s => s.r === r && s.c === c);
                const fnd = foundWords.find(f => f.cells.some(s => s.r === r && s.c === c));
                return (
                  <div key={`${r}-${c}`} data-r={r} data-c={c} className={`cell ${isSel ? 'selected' : ''} ${fnd ? 'found' : ''}`}
                    style={fnd ? { background: fnd.color, border: 'none' } : {}}
                    onMouseDown={() => startSelection(r, c)}
                    onTouchStart={() => startSelection(r, c)}
                    onMouseEnter={() => moveSelection(r, c)}>
                    {cell?.char}
                  </div>
                );
              }))}
            </div>
          </div>
        )}
      </div>

      {showWinModal && (
        <div className="modal-overlay">
          <div className="glass-card">
            <h2 className="neon-text">ЖЕҢИШ!</h2>
            <p>Сиз бардык сөздөрдү таптыңыз!</p>
            <button className="neon-button" onClick={() => {
              if (!isDaily) {
                const nextIdx = currentCatIndex + 1;
                setCurrentCatIndex(nextIdx);
                generateLevel(nextIdx);
              } else {
                setView('calendar');
                setShowWinModal(false);
              }
            }}>УЛАНТУУ</button>
          </div>
        </div>
      )}

      {view !== 'game' && (
        <nav className="navigation">
          <ul>
            {navItems.map((item) => (
              <li key={item.id} className={view === item.id ? 'active' : ''} onClick={() => {
                if (item.id === 'settings') { localStorage.clear(); window.location.reload(); }
                else setView(item.id);
              }}>
                <a href="#" onClick={(e) => e.preventDefault()}>
                  <span className="icon"><ion-icon name={item.icon}></ion-icon></span>
                  <span className="text">{item.text}</span>
                </a>
              </li>
            ))}
            <div className="indicator" style={{ transform: `translateX(calc(70px * ${navItems.findIndex(i => i.id === view)}))` }}></div>
          </ul>
        </nav>
      )}
    </div>
  );
};

export default FilwordGame;