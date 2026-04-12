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
  const [isDaily, setIsDaily] = useState(false);
  const [hintCell, setHintCell] = useState(null);

  const gridRef = useRef(null);
  const gridSize = 6;
  const totalCells = gridSize * gridSize;
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

  const generateLevel = useCallback((index, daily = false) => {
    const category = wordsData[index % wordsData.length] || { category: "Жалпы", words: ["АЛМА", "КИЛИМ", "КИТЕП", "ТОКОЙ", "БАЛЫК"] };
    setCategoryName(category.category || category.name);

    let finalGrid = null;
    let finalTargetWords = [];

    // МАКСАТ: Торчону 100% толтуруу үчүн рекурсияны иштетебиз
    const attemptGeneration = () => {
      let tempGrid = Array(gridSize).fill(null).map(() => Array(gridSize).fill(null));
      let tempWords = [];
      let filledCount = 0;

      // Сөздөрдү аралаштырып алуу
      const wordPool = [...category.words]
        .map(w => w.toUpperCase())
        .filter(w => w.length >= 3 && w.length <= 8)
        .sort(() => Math.random() - 0.5);

      const solve = (r, c) => {
        if (filledCount === totalCells) return true; // Бардык уяча толду!
        
        // Кийинки бош уячаны табуу
        let currR = r, currC = c;
        while (currR < gridSize && tempGrid[currR][currC]) {
          currC++;
          if (currC === gridSize) { currC = 0; currR++; }
        }
        if (currR === gridSize) return filledCount === totalCells;

        for (let word of wordPool) {
          // Сөз торчодогу калган бош орунга батабы текшерүү
          if (word.length > (totalCells - filledCount)) continue;

          const paths = findAvailablePaths(currR, currC, word.length, tempGrid);
          for (let path of paths) {
            // Жайгаштыруу
            path.forEach((p, i) => tempGrid[p.r][p.c] = { char: word[i], word });
            tempWords.push({ word, path });
            filledCount += word.length;

            if (solve(currR, currC)) return true;

            // Backtrack (Кайтаруу)
            filledCount -= word.length;
            tempWords.pop();
            path.forEach(p => tempGrid[p.r][p.c] = null);
          }
        }
        return false;
      };

      if (solve(0, 0)) {
        finalGrid = tempGrid;
        finalTargetWords = tempWords;
        return true;
      }
      return false;
    };

    function findAvailablePaths(r, c, len, g) {
      let results = [];
      const explore = (currR, currC, path, vis) => {
        if (path.length === len) { results.push([...path]); return; }
        if (results.length > 5) return;

        const directions = [[1,0], [-1,0], [0,1], [0,-1]];
        for (let [dr, dc] of directions.sort(() => Math.random() - 0.5)) {
          const nr = currR + dr, nc = currC + dc;
          if (nr >= 0 && nr < gridSize && nc >= 0 && nc < gridSize && !g[nr][nc] && !vis.has(`${nr},${nc}`)) {
            vis.add(`${nr},${nc}`);
            path.push({ r: nr, c: nc });
            explore(nr, nc, path, vis);
            path.pop();
            vis.delete(`${nr},${nc}`);
          }
        }
      };
      explore(r, c, [{ r, c }], new Set([`${r},${c}`]));
      return results;
    }

    // Торчо толук толмоюнча аракет кыла берет (макс 10 жолу)
    let success = false;
    for(let i=0; i<10; i++) {
      if (attemptGeneration()) { success = true; break; }
    }

    // Эгер өтө оор болуп толбой калса (редкий случай), алфавит менен толтуруп кой (боз калбашы үчүн)
    if (!success) {
        // Бул жерге жетсе демек сөздөр комбинациясы өтө татаал.
        // Ошондо да боз калбашы үчүн filler колдонобуз, бирок негизги максат - success болуу.
    }

    setGrid(finalGrid);
    setTargetWords(finalTargetWords);
    setFoundWords([]);
    setShowWinModal(false);
    setIsDaily(daily);
    setHintCell(null);
    setView('game');
  }, [wordsData, totalCells]);

  const useHint = () => {
    if (score < 20) return;
    const notFound = targetWords.filter(t => !foundWords.some(f => f.word === t.word));
    if (notFound.length > 0) {
      setHintCell(notFound[0].path[0]); // Табыла элек сөздүн БАШ тамгасы
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
    if (!isSelecting) return;
    setIsSelecting(false);
    const selectedText = selectedCells.map(cell => grid[cell.r][cell.c].char).join('');
    
    const match = targetWords.find(t => 
      t.word === selectedText && 
      t.path.length === selectedCells.length &&
      !foundWords.some(f => f.word === t.word)
    );

    if (match) {
      const color = COLORS[foundWords.length % COLORS.length];
      const newFound = [...foundWords, { ...match, cells: [...selectedCells], color }];
      setFoundWords(newFound);
      setScore(prev => prev + (match.word.length * 10));
      if (newFound.length === targetWords.length) setTimeout(() => setShowWinModal(true), 500);
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

  if (!user) return null; // Же кирүү логикасы

  return (
    <div className="full-page" onMouseUp={endSelection} onTouchEnd={endSelection} style={{ touchAction: 'none', overflow: 'hidden', height: '100vh', background: '#0f172a' }}>
      
      {view === 'game' && (
        <div className="game-header-new">
          <div className="header-top-row">
            <button className="icon-btn" onClick={() => setView('menu')}><ion-icon name="arrow-back-outline"></ion-icon></button>
            <div className="cat-badge-container">
                <span className="cat-label">КАТЕГОРИЯ</span>
                <span className="cat-name-main" style={{fontSize: '14px'}}>{categoryName}</span>
            </div>
            <div className="score-gem-badge">
                <span className="gem-icon">💎</span>
                <span className="score-text">{score}</span>
            </div>
          </div>
          <div className="header-bottom-row"><div className="tour-info">ТУР: {currentCatIndex + 1}</div></div>
        </div>
      )}

      <div className="content-area">
        {view === 'menu' && (
          <div className="menu-inner">
             <div className="level-card">
               <div className="level-title">УЧУРДАГЫ ТУР</div>
               <div className="level-number">{currentCatIndex + 1}</div>
             </div>
             <button className="play-btn-large" onClick={() => generateLevel(currentCatIndex)}>ОЙНОО</button>
          </div>
        )}

        {view === 'game' && grid && (
          <div className="game-wrapper">
            <div className="game-grid" onTouchMove={handleTouchMove} style={{display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '6px', padding: '10px'}}>
              {grid.map((row, r) => row.map((cell, c) => {
                const isSel = selectedCells.some(s => s.r === r && s.c === c);
                const fnd = foundWords.find(f => f.cells.some(s => s.r === r && s.c === c));
                const isHint = hintCell && hintCell.r === r && hintCell.c === c;
                
                return (
                  <div key={`${r}-${c}`} data-r={r} data-c={c} 
                    className={`cell ${isSel ? 'selected' : ''} ${fnd ? 'found' : ''} ${isHint ? 'hint-glow' : ''}`}
                    style={{
                        background: fnd ? fnd.color : isSel ? 'rgba(255,255,255,0.3)' : '#1e293b',
                        color: '#fff', height: '50px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 'bold',
                        border: isHint ? '3px solid #ffd700' : 'none',
                        boxShadow: isHint ? '0 0 15px #ffd700' : 'none'
                    }}
                    onMouseDown={() => startSelection(r, c)}
                    onTouchStart={() => startSelection(r, c)}
                    onMouseEnter={() => moveSelection(r, c)}>
                    {cell?.char}
                  </div>
                );
              }))}
            </div>
            <div className="game-actions">
                <button className="hint-btn-new" onClick={useHint} style={{background: '#22c55e', color: '#fff', border: 'none', padding: '12px 30px', borderRadius: '30px', marginTop: '20px', fontWeight: 'bold'}}>
                   <ion-icon name="bulb-outline"></ion-icon> ПОДСКАЗКА
                </button>
            </div>
          </div>
        )}
      </div>

      {showWinModal && (
        <div className="modal-overlay">
          <div className="glass-card" style={{textAlign: 'center', background: '#1e293b', padding: '30px', borderRadius: '20px', color: '#fff'}}>
            <h2 className="neon-text">ЖЕҢИШ!</h2>
            <button className="neon-button" onClick={() => {
                const next = currentCatIndex + 1;
                setCurrentCatIndex(next);
                generateLevel(next);
            }} style={{background: '#22c55e', color: '#fff', padding: '10px 20px', border: 'none', borderRadius: '10px', marginTop: '20px'}}>УЛАНТУУ</button>
          </div>
        </div>
      )}

      {view !== 'game' && (
        <nav className="navigation">
          <ul style={{display: 'flex', justifyContent: 'space-around', listStyle: 'none', padding: '15px', background: '#1e293b'}}>
            {navItems.map((item) => (
              <li key={item.id} onClick={() => setView(item.id)} style={{color: view === item.id ? '#22c55e' : '#94a3b8', textAlign: 'center'}}>
                <ion-icon name={item.icon} style={{fontSize: '24px'}}></ion-icon>
                <div style={{fontSize: '10px'}}>{item.text}</div>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
};

export default FilwordGame;
    
