import React, { useState, useEffect, useCallback, useRef } from 'react';

const COLORS = ['#26a69a', '#ef5350', '#42a5f5', '#ab47bc', '#ffa726', '#26c6da', '#d4e157'];
const KYRGYZ_ALPHABET = "АБВГДЕЁЖЗИЙКЛМНОПРСТУҮФХЦЧШЩЪЫЬЭЮЯӨҢ";

const FilwordGame = ({ wordsData = [] }) => {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('filword_user')));
  const [view, setView] = useState('menu'); 
  const [currentCatIndex, setCurrentCatIndex] = useState(() => parseInt(localStorage.getItem('filword_level')) || 0);
  const [score, setScore] = useState(() => parseInt(localStorage.getItem('filword_score')) || 0);
  const [completedDays, setCompletedDays] = useState(() => JSON.parse(localStorage.getItem('completed_days')) || []);
  
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const [grid, setGrid] = useState([]);
  const [selectedCells, setSelectedCells] = useState([]);
  const [foundWords, setFoundWords] = useState([]);
  const [targetWords, setTargetWords] = useState([]);
  const [categoryName, setCategoryName] = useState(""); 
  const [isSelecting, setIsSelecting] = useState(false);
  const [showWinModal, setShowWinModal] = useState(false);
  const [hintCell, setHintCell] = useState(null);

  const gridSize = 6;
  const today = new Date().getDate();

  const navItems = [
    { id: 'menu', icon: 'home-outline', text: 'Башкы' },
    { id: 'calendar', icon: 'calendar-outline', text: 'Күн' },
    { id: 'stats', icon: 'bar-chart-outline', text: 'Рейтинг' },
    { id: 'settings', icon: 'settings-outline', text: 'Профиль' }
  ];

  useEffect(() => {
    localStorage.setItem('filword_level', currentCatIndex);
    localStorage.setItem('filword_score', score);
    localStorage.setItem('completed_days', JSON.stringify(completedDays));
  }, [currentCatIndex, score, completedDays]);

  // СӨЗДҮ ТУТАШ ЖАЙГАШТЫРУУ ФУНКЦИЯСЫ (DFS/BFS)
  const findSnakePath = (r, c, len, currentGrid) => {
    let queue = [{ r, c, path: [{ r, c }], vis: new Set([`${r},${c}`]) }];
    let attempts = 0;
    
    while (queue.length > 0 && attempts < 500) {
      attempts++;
      let { r: currR, c: currC, path, vis } = queue.shift();
      if (path.length === len) return path;

      const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]].sort(() => Math.random() - 0.5);
      for (let [dr, dc] of dirs) {
        let nr = currR + dr, nc = currC + dc;
        if (nr >= 0 && nr < gridSize && nc >= 0 && nc < gridSize && !currentGrid[nr][nc] && !vis.has(`${nr},${nc}`)) {
          queue.push({ r: nr, c: nc, path: [...path, { r: nr, c: nc }], vis: new Set(vis).add(`${nr},${nc}`) });
        }
      }
    }
    return null;
  };

  const generateLevel = useCallback((index) => {
    const category = wordsData[index % wordsData.length] || { category: "Жалпы", words: ["АЛМА", "КИЛИМ", "ҮКҮ", "СААТ", "КИНИП"] };
    setCategoryName(category.category || category.name);

    let newGrid = Array(gridSize).fill(null).map(() => Array(gridSize).fill(null));
    let finalWords = [];
    
    // Сөздөрдү узунунан баштап тизебиз
    const pool = [...category.words].map(w => w.toUpperCase()).sort((a, b) => b.length - a.length);

    for (let word of pool) {
      let placed = false;
      // Торчодон бош орун издөө
      for (let r = 0; r < gridSize && !placed; r++) {
        for (let c = 0; c < gridSize && !placed; c++) {
          if (!newGrid[r][c]) {
            const path = findSnakePath(r, c, word.length, newGrid);
            if (path) {
              path.forEach((p, i) => { newGrid[p.r][p.c] = { char: word[i], word }; });
              finalWords.push({ word, path });
              placed = true;
            }
          }
        }
      }
    }

    // БОШ КАЛГАН УЯЧАЛАРДЫ АЛФАВИТ МЕНЕН ТОЛТУРУУ (Боз калбашы үчүн)
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (!newGrid[r][c]) {
          newGrid[r][c] = { char: KYRGYZ_ALPHABET[Math.floor(Math.random() * KYRGYZ_ALPHABET.length)], isFiller: true };
        }
      }
    }

    setGrid(newGrid);
    setTargetWords(finalWords);
    setFoundWords([]);
    setShowWinModal(false);
    setHintCell(null);
    setView('game');
  }, [wordsData]);

  const useHint = () => {
    if (score < 20) {
      alert("Упайыңыз жетпейт!");
      return;
    }
    const notFound = targetWords.filter(t => !foundWords.some(f => f.word === t.word));
    if (notFound.length > 0) {
      setHintCell(notFound[0].path[0]); // Табыла элек сөздүн 1-тамгасы
      setScore(prev => prev - 20);
      setTimeout(() => setHintCell(null), 1500);
    }
  };

  const startSelection = (r, c) => {
    if (foundWords.some(f => f.cells.some(s => s.r === r && s.c === c))) return;
    setIsSelecting(true);
    setSelectedCells([{ r, c }]);
  };

  const moveSelection = (r, c) => {
    if (!isSelecting) return;
    if (foundWords.some(f => f.cells.some(s => s.r === r && s.c === c))) return;
    if (selectedCells.some(s => s.r === r && s.c === c)) return;

    const last = selectedCells[selectedCells.length - 1];
    const isNeighbor = Math.abs(last.r - r) + Math.abs(last.c - c) === 1;
    if (isNeighbor) setSelectedCells(prev => [...prev, { r, c }]);
  };

  const endSelection = () => {
    if (!isSelecting) return;
    setIsSelecting(false);
    const selectedText = selectedCells.map(cell => grid[cell.r][cell.c].char).join('');
    const match = targetWords.find(t => t.word === selectedText && t.path.length === selectedCells.length && !foundWords.some(f => f.word === t.word));

    if (match) {
      const color = COLORS[foundWords.length % COLORS.length];
      const newFound = [...foundWords, { ...match, cells: [...selectedCells], color }];
      setFoundWords(newFound);
      setScore(prev => prev + 10);
      if (newFound.length === targetWords.length) setTimeout(() => setShowWinModal(true), 500);
    }
    setSelectedCells([]);
  };

  const handleTouchMove = (e) => {
    const touch = e.touches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    if (el && el.hasAttribute('data-r')) {
      moveSelection(parseInt(el.getAttribute('data-r')), parseInt(el.getAttribute('data-c')));
    }
  };

  if (!user) return <div className="p-20 text-center">Профиль жүктөлүүдө...</div>;

  return (
    <div className="full-page" onMouseUp={endSelection} onTouchEnd={endSelection} style={{ touchAction: 'none', background: '#0f172a', height: '100vh', color: 'white' }}>
      
      {view === 'game' && (
        <div className="game-header-new">
          <div className="header-top-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '15px' }}>
            <button className="icon-btn" onClick={() => setView('menu')} style={{ background: 'none', border: '1px solid white', color: 'white', borderRadius: '50%', width: '35px', height: '35px' }}>
                <ion-icon name="arrow-back-outline"></ion-icon>
            </button>
            <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '10px', opacity: 0.6 }}>КАТЕГОРИЯ</div>
                <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{categoryName}</div>
            </div>
            <div className="score-gem-badge" style={{ background: 'rgba(255,255,255,0.1)', padding: '5px 12px', borderRadius: '15px' }}>
                💎 {score}
            </div>
          </div>
        </div>
      )}

      <div className="content-area" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {view === 'menu' && (
          <div className="menu-inner" style={{ paddingTop: '100px', textAlign: 'center' }}>
            <h1 style={{ fontSize: '32px', marginBottom: '40px' }}>Кыргыз Сөз</h1>
            <div className="level-card" style={{ background: '#1e293b', padding: '30px', borderRadius: '20px', marginBottom: '20px' }}>
              <div style={{ fontSize: '14px' }}>ТУР</div>
              <div style={{ fontSize: '40px', fontWeight: 'bold' }}>{currentCatIndex + 1}</div>
            </div>
            <button className="play-btn-large" onClick={() => generateLevel(currentCatIndex)} style={{ background: '#22c55e', color: 'white', border: 'none', padding: '15px 60px', borderRadius: '30px', fontSize: '20px', fontWeight: 'bold' }}>
                ОЙНОО
            </button>
          </div>
        )}

        {view === 'game' && (
          <div className="game-wrapper" style={{ marginTop: '20px' }}>
            <div className="game-grid" onTouchMove={handleTouchMove} style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '6px', background: '#1e293b', padding: '10px', borderRadius: '12px' }}>
              {grid.map((row, r) => row.map((cell, c) => {
                const isSel = selectedCells.some(s => s.r === r && s.c === c);
                const fnd = foundWords.find(f => f.cells.some(s => s.r === r && s.c === c));
                const isHint = hintCell && hintCell.r === r && hintCell.c === c;
                
                return (
                  <div key={`${r}-${c}`} data-r={r} data-c={c} 
                    onMouseDown={() => startSelection(r, c)}
                    onMouseEnter={() => moveSelection(r, c)}
                    style={{
                        width: '50px', height: '50px', background: fnd ? fnd.color : isSel ? '#3b82f6' : '#334155',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px',
                        fontSize: '18px', fontWeight: 'bold', userSelect: 'none',
                        border: isHint ? '3px solid #fbbf24' : 'none',
                        boxShadow: isHint ? '0 0 15px #fbbf24' : 'none'
                    }}>
                    {cell?.char}
                  </div>
                );
              }))}
            </div>
            <div style={{ textAlign: 'center', marginTop: '30px' }}>
                <button className="hint-btn-new" onClick={useHint} style={{ background: '#eab308', color: 'black', border: 'none', padding: '12px 30px', borderRadius: '25px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 auto' }}>
                   <ion-icon name="bulb-outline"></ion-icon> ПОДСКАЗКА (-20)
                </button>
            </div>
          </div>
        )}
      </div>

      {showWinModal && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-card" style={{ background: '#1e293b', padding: '40px', borderRadius: '24px', textAlign: 'center', border: '1px solid #22c55e' }}>
            <h2 style={{ color: '#22c55e', fontSize: '28px' }}>ЖЕҢИШ!</h2>
            <p style={{ margin: '15px 0 25px' }}>Кийинки турга даярсызбы?</p>
            <button className="neon-button" onClick={() => {
                const next = currentCatIndex + 1;
                setCurrentCatIndex(next);
                generateLevel(next);
            }} style={{ background: '#22c55e', color: 'white', border: 'none', padding: '12px 40px', borderRadius: '15px', fontWeight: 'bold' }}>УЛАНТУУ</button>
          </div>
        </div>
      )}

      {view !== 'game' && (
        <nav className="navigation" style={{ position: 'fixed', bottom: 0, width: '100%', background: '#1e293b', padding: '10px 0' }}>
          <ul style={{ display: 'flex', justifyContent: 'space-around', listStyle: 'none', padding: 0 }}>
            {navItems.map((item) => (
              <li key={item.id} onClick={() => setView(item.id)} style={{ textAlign: 'center', opacity: view === item.id ? 1 : 0.5 }}>
                <ion-icon name={item.icon} style={{ fontSize: '22px' }}></ion-icon>
                <div style={{ fontSize: '10px' }}>{item.text}</div>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
};

export default FilwordGame;
    
