import React, { useState, useEffect, useCallback, useRef } from 'react';

const COLORS = ['#26a69a', '#ef5350', '#42a5f5', '#ab47bc', '#ffa726', '#26c6da', '#d4e157'];
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
  const [categoryName, setCategoryName] = useState(""); 
  const [isSelecting, setIsSelecting] = useState(false);
  const [showWinModal, setShowWinModal] = useState(false);
  const [hintCell, setHintCell] = useState(null);

  const gridSize = 6;
  const totalCellsCount = 36;
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

  // Сөздөрдү бири-бирине туташ (snake) кылып, бош орун калтырбай тизүү алгоритми
  const generateLevel = useCallback((index) => {
    const category = wordsData[index % wordsData.length] || { category: "Жалпы", words: ["АЛМА", "КИЛИМ", "ҮКҮ", "АРСТАН", "КАШКАР", "КИНИП"] };
    setCategoryName(category.category || category.name);

    let tempGrid = Array(gridSize).fill(null).map(() => Array(gridSize).fill(null));
    let finalWords = [];
    let filledCount = 0;

    // Сөздөрдү узундугуна карап иреттеп, кошумча сөздөрдү даярдоо
    const wordPool = [...category.words].map(w => w.toUpperCase()).sort((a, b) => b.length - a.length);

    const solve = (cellIdx) => {
      if (filledCount === totalCellsCount) return true;
      if (cellIdx >= totalCellsCount) return filledCount === totalCellsCount;

      let r = Math.floor(cellIdx / gridSize);
      let c = cellIdx % gridSize;

      if (tempGrid[r][c]) return solve(cellIdx + 1);

      for (let word of wordPool) {
        if (finalWords.some(fw => fw.word === word)) continue;
        if (word.length > (totalCellsCount - filledCount)) continue;

        const paths = findSnakePaths(r, c, word.length, tempGrid);
        for (let path of paths) {
          path.forEach((p, i) => tempGrid[p.r][p.c] = { char: word[i], word });
          finalWords.push({ word, path });
          filledCount += word.length;

          if (solve(cellIdx + 1)) return true;

          // Backtrack
          filledCount -= word.length;
          finalWords.pop();
          path.forEach(p => tempGrid[p.r][p.c] = null);
        }
      }
      return false;
    };

    function findSnakePaths(startR, startC, len, g) {
      let results = [];
      const explore = (currR, currC, path, vis) => {
        if (path.length === len) { results.push([...path]); return; }
        if (results.length > 5) return;

        const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]].sort(() => Math.random() - 0.5);
        for (let [dr, dc] of dirs) {
          let nr = currR + dr, nc = currC + dc;
          if (nr >= 0 && nr < gridSize && nc >= 0 && nc < gridSize && !g[nr][nc] && !vis.has(`${nr},${nc}`)) {
            vis.add(`${nr},${nc}`);
            path.push({ r: nr, c: nc });
            explore(nr, nc, path, vis);
            path.pop();
            vis.delete(`${nr},${nc}`);
          }
        }
      };
      explore(startR, startC, [{ r: startR, c: startC }], new Set([`${startR},${startC}`]));
      return results;
    }

    // Эгер сөздөр жетпесе, алфавит менен толтурбай, деңгээлди кайра түзүүгө аракет кылат
    if (!solve(0)) {
       // Өтө татаал учурда гана бир аз боштук калса алфавит менен жабат
       for (let i = 0; i < gridSize; i++) {
         for (let j = 0; j < gridSize; j++) {
           if (!tempGrid[i][j]) tempGrid[i][j] = { char: KYRGYZ_ALPHABET[Math.floor(Math.random() * KYRGYZ_ALPHABET.length)], isFiller: true };
         }
       }
    }

    setGrid(tempGrid);
    setTargetWords(finalWords);
    setFoundWords([]);
    setShowWinModal(false);
    setHintCell(null);
    setView('game');
  }, [wordsData]);

  const useHint = () => {
    if (score < 20) return;
    const notFound = targetWords.filter(t => !foundWords.some(f => f.word === t.word));
    if (notFound.length > 0) {
      setHintCell(notFound[0].path[0]); 
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
    if (Math.abs(last.r - r) + Math.abs(last.c - c) === 1) {
      setSelectedCells(prev => [...prev, { r, c }]);
    }
  };

  const endSelection = () => {
    setIsSelecting(false);
    const selectedText = selectedCells.map(cell => grid[cell.r][cell.c].char).join('');
    const match = targetWords.find(t => t.word === selectedText && t.path.length === selectedCells.length && !foundWords.some(f => f.word === t.word));

    if (match) {
      const color = COLORS[foundWords.length % COLORS.length];
      setFoundWords([...foundWords, { ...match, cells: [...selectedCells], color }]);
      setScore(prev => prev + 10);
      if (foundWords.length + 1 === targetWords.length) setTimeout(() => setShowWinModal(true), 500);
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

  if (!user) return null;

  return (
    <div className="full-page" onMouseUp={endSelection} onTouchEnd={endSelection} style={{ touchAction: 'none', background: '#0f172a', height: '100vh', color: 'white' }}>
      
      {view === 'game' && (
        <div className="game-header-new" style={{ padding: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button className="icon-btn" onClick={() => setView('menu')} style={{ background: 'none', border: '1px solid #fff', borderRadius: '50%', color: '#fff', width: '35px', height: '35px' }}>
            <ion-icon name="arrow-back-outline"></ion-icon>
          </button>
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '10px', display: 'block', opacity: 0.7 }}>КАТЕГОРИЯ</span>
            <span style={{ fontWeight: 'bold' }}>{categoryName}</span>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.1)', padding: '5px 12px', borderRadius: '15px' }}>💎 {score}</div>
        </div>
      )}

      <div className="content-area" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {view === 'menu' && (
          <div style={{ paddingTop: '80px', textAlign: 'center' }}>
            <h1 style={{ fontSize: '36px', marginBottom: '40px' }}>Кыргыз Сөз</h1>
            <div style={{ background: '#1e293b', padding: '40px', borderRadius: '25px', marginBottom: '30px' }}>
              <div style={{ fontSize: '14px', opacity: 0.7 }}>ТУР</div>
              <div style={{ fontSize: '48px', fontWeight: 'bold' }}>{currentCatIndex + 1}</div>
            </div>
            <button className="play-btn-large" onClick={() => generateLevel(currentCatIndex)} style={{ background: '#22c55e', color: '#fff', border: 'none', padding: '15px 70px', borderRadius: '35px', fontSize: '22px', fontWeight: 'bold', boxShadow: '0 10px 20px rgba(34, 197, 94, 0.3)' }}>ОЙНОО</button>
          </div>
        )}

        {view === 'game' && (
          <div style={{ marginTop: '20px' }}>
            <div className="game-grid" onTouchMove={handleTouchMove} style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '6px', background: '#1e293b', padding: '10px', borderRadius: '12px', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
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
                      fontSize: '20px', fontWeight: 'bold', userSelect: 'none', transition: 'background 0.2s',
                      border: isHint ? '3px solid #facc15' : 'none',
                      boxShadow: isHint ? '0 0 20px #facc15' : 'none'
                    }}>
                    {cell?.char}
                  </div>
                );
              }))}
            </div>
            <div style={{ marginTop: '30px', textAlign: 'center' }}>
              <button onClick={useHint} style={{ background: '#eab308', color: '#000', border: 'none', padding: '12px 30px', borderRadius: '25px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 auto' }}>
                <ion-icon name="bulb-outline"></ion-icon> КЕҢЕШ (-20)
              </button>
            </div>
          </div>
        )}
      </div>

      {showWinModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#1e293b', padding: '40px', borderRadius: '30px', textAlign: 'center', border: '1px solid #22c55e' }}>
            <h2 style={{ color: '#22c55e', fontSize: '32px' }}>ЖЕҢИШ!</h2>
            <p style={{ opacity: 0.8, margin: '10px 0 25px' }}>Кийинки деңгээлге даярсызбы?</p>
            <button onClick={() => { setCurrentCatIndex(prev => prev + 1); generateLevel(currentCatIndex + 1); }} style={{ background: '#22c55e', color: '#fff', border: 'none', padding: '12px 40px', borderRadius: '15px', fontWeight: 'bold' }}>УЛАНТУУ</button>
          </div>
        </div>
      )}

      {view !== 'game' && (
        <nav style={{ position: 'fixed', bottom: 0, width: '100%', background: '#1e293b', display: 'flex', justifyContent: 'space-around', padding: '12px 0' }}>
          {navItems.map(item => (
            <div key={item.id} onClick={() => setView(item.id)} style={{ textAlign: 'center', opacity: view === item.id ? 1 : 0.4, cursor: 'pointer' }}>
              <ion-icon name={item.icon} style={{ fontSize: '24px' }}></ion-icon>
              <div style={{ fontSize: '10px' }}>{item.text}</div>
            </div>
          ))}
        </nav>
      )}
    </div>
  );
};

export default FilwordGame;
                        
