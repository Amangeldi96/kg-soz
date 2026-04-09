import React, { useState, useEffect, useCallback } from 'react';

const COLORS = ['#26a69a', '#d4e157', '#ef5350', '#42a5f5', '#ab47bc', '#ffa726', '#26c6da'];
const KYRGYZ_ALPHABET = "АБВГДЕЁЖЗИЙКЛМНОПРСТУҮФХЦЧШЩЪЫЬЭЮЯӨҢ";

const FilwordGame = ({ wordsData }) => {
  // --- LOCAL STORAGE & STATES ---
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('filword_user')));
  const [view, setView] = useState('menu'); // 'menu', 'game', 'calendar'
  const [currentCatIndex, setCurrentCatIndex] = useState(() => parseInt(localStorage.getItem('filword_level')) || 0);
  const [score, setScore] = useState(() => parseInt(localStorage.getItem('filword_score')) || 0);
  const [completedDays, setCompletedDays] = useState(() => JSON.parse(localStorage.getItem('completed_days')) || []);
  
  // Оюндун ички абалы
  const [grid, setGrid] = useState([]);
  const [selectedCells, setSelectedCells] = useState([]);
  const [foundWords, setFoundWords] = useState([]);
  const [targetWords, setTargetWords] = useState([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [hintCount, setHintCount] = useState(3);
  const [hintCell, setHintCell] = useState(null);
  const [showWinModal, setShowWinModal] = useState(false);
  const [isDaily, setIsDaily] = useState(false);

  const gridSize = 6;
  const today = new Date().getDate();

  // Сактоо
  useEffect(() => {
    localStorage.setItem('filword_level', currentCatIndex);
    localStorage.setItem('filword_score', score);
    localStorage.setItem('completed_days', JSON.stringify(completedDays));
  }, [currentCatIndex, score, completedDays]);

  // Деңгээл генерациясы
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

  // Оюн логикалары
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
    const match = targetWords.find(t => t.word === selectedText && !foundWords.some(f => f.word === t.word) && t.word.length === selectedCells.length);
    if (match) {
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

  // --- UI SCREENS ---

  if (!user) {
    return (
      <div style={styles.modalOverlay}>
        <form onSubmit={(e) => {
          e.preventDefault();
          const newUser = { name: e.target.name.value, age: e.target.age.value };
          setUser(newUser);
          localStorage.setItem('filword_user', JSON.stringify(newUser));
        }} style={styles.loginForm}>
          <h2 style={{color: '#38bdf8'}}>Кош келиңиз!</h2>
          <input name="name" placeholder="Атыңыз" required style={styles.input} />
          <input name="age" type="number" placeholder="Жашыңыз" required style={styles.input} />
          <button type="submit" style={styles.mainBtn}>Кирүү</button>
        </form>
      </div>
    );
  }

  // 1. БАШКЫ БЕТ (HOME MENU)
  if (view === 'menu') {
    return (
      <div style={styles.container}>
        <div style={styles.menuHeader}>
            <div style={styles.userIcon}>{user.name[0].toUpperCase()}</div>
            <div style={{fontSize: '18px', fontWeight: 'bold'}}>{user.name}</div>
            <div style={styles.scoreBadgeMenu}>🏆 {score}</div>
        </div>

        <div style={styles.menuContent}>
            <div style={styles.levelProgress}>Деңгээл: {currentCatIndex + 1}</div>
            <button onClick={() => generateLevel(currentCatIndex)} style={styles.mainPlayBtn}>
                <span style={{fontSize: '40px'}}>▶</span>
                <div style={{fontWeight: 'bold', fontSize: '20px'}}>БАШТОО</div>
            </button>

            <div style={styles.menuGrid}>
                <button onClick={() => setView('calendar')} style={styles.iconBtn}>
                    <div style={{fontSize: '30px'}}>📅</div>
                    <span>Календарь</span>
                </button>
                <button style={styles.iconBtn}>
                    <div style={{fontSize: '30px'}}>⚙</div>
                    <span>Түзөтүү</span>
                </button>
                <button onClick={() => {localStorage.clear(); window.location.reload();}} style={styles.iconBtn}>
                    <div style={{fontSize: '30px'}}>🚪</div>
                    <span>Чыгуу</span>
                </button>
            </div>
        </div>
      </div>
    );
  }

  // 2. КАЛЕНДАРЬ ЭКРАНЫ
  if (view === 'calendar') {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
            <button onClick={() => setView('menu')} style={styles.backBtn}>⬅ Артка</button>
            <h2 style={{fontSize: '18px', color: '#38bdf8'}}>Күнүмдүк Тапшырма</h2>
        </div>
        <div style={styles.calendarGrid}>
          {Array.from({ length: 30 }, (_, i) => i + 1).map(day => {
            const isCompleted = completedDays.includes(day);
            const isToday = day === today;
            const isLocked = day > today;
            return (
              <div key={day} onClick={() => !isLocked && generateLevel(day + 100, true)}
                style={{
                  ...styles.calendarDay,
                  backgroundColor: isCompleted ? '#10b981' : isToday ? '#38bdf8' : isLocked ? '#1e293b' : '#334155',
                  opacity: isLocked ? 0.5 : 1,
                  border: isToday ? '2px solid white' : 'none'
                }}
              >
                {day}
                {isCompleted && <span style={{fontSize: '10px'}}>✔</span>}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // 3. ОЮН ЭКРАНЫ
  return (
    <div onMouseUp={endSelection} onTouchEnd={endSelection} style={styles.container}>
      <div style={styles.header}>
        <button onClick={() => setView('menu')} style={styles.backBtn}>🏠 Меню</button>
        <div style={styles.categoryTitle}>{wordsData[currentCatIndex % wordsData.length]?.category.replace(/_/g, ' ')}</div>
        <div style={styles.scoreBadge}>🏆 {score}</div>
      </div>

      <div onTouchMove={(e) => {
        const touch = e.touches[0];
        const el = document.elementFromPoint(touch.clientX, touch.clientY);
        if (el && el.getAttribute('data-r')) moveSelection(parseInt(el.getAttribute('data-r')), parseInt(el.getAttribute('data-c')));
      }} style={styles.grid}>
        {grid.map((row, r) => row.map((cell, c) => {
          const isSel = selectedCells.some(s => s.r === r && s.c === c);
          const fnd = foundWords.find(f => f.cells.some(s => s.r === r && s.c === c));
          return (
            <div key={`${r}-${c}`} data-r={r} data-c={c}
              onMouseDown={() => startSelection(r, c)}
              onMouseEnter={() => moveSelection(r, c)}
              onTouchStart={(e) => { e.preventDefault(); startSelection(r, c); }}
              style={{
                ...styles.cell,
                backgroundColor: isSel ? '#38bdf8' : fnd ? fnd.color : '#334155',
                pointerEvents: fnd ? 'none' : 'auto'
              }}
            >{cell?.char}</div>
          );
        }))}
      </div>

      {showWinModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h2>{isDaily ? "Күн бүттү! 🎉" : "Жеңиш! 🏆"}</h2>
            <button onClick={() => {
                if(isDaily) { setView('calendar'); } 
                else { setCurrentCatIndex(prev => prev + 1); generateLevel(currentCatIndex + 1); }
            }} style={styles.mainPlayBtn}>Улантуу</button>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: { backgroundColor: '#0f172a', minHeight: '100vh', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px', fontFamily: 'sans-serif', overflow: 'hidden' },
  menuHeader: { width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', marginBottom: '40px' },
  userIcon: { width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 'bold' },
  scoreBadgeMenu: { backgroundColor: '#1e293b', padding: '5px 15px', borderRadius: '20px', border: '1px solid #fbbf24', color: '#fbbf24' },
  menuContent: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '30px', width: '100%' },
  levelProgress: { fontSize: '20px', color: '#94a3b8' },
  mainPlayBtn: { width: '150px', height: '150px', borderRadius: '50%', backgroundColor: '#10b981', border: '8px solid #064e3b', color: 'white', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(16, 185, 129, 0.4)' },
  menuGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', width: '100%', maxWidth: '350px', marginTop: '40px' },
  iconBtn: { background: '#1e293b', border: 'none', color: 'white', padding: '15px 5px', borderRadius: '15px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', fontSize: '12px' },
  header: { width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' },
  categoryTitle: { color: '#38bdf8', fontWeight: 'bold', fontSize: '16px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '6px', width: '95vw', maxWidth: '380px', background: '#1e293b', padding: '10px', borderRadius: '20px' },
  cell: { aspectRatio: '1/1', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', fontSize: '18px', fontWeight: 'bold' },
  calendarGrid: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', width: '100%' },
  calendarDay: { aspectRatio: '1/1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: '12px', fontWeight: 'bold' },
  loginForm: { background: '#1e293b', padding: '30px', borderRadius: '25px', textAlign: 'center', width: '85%', border: '1px solid #38bdf8' },
  input: { width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '12px', border: 'none', fontSize: '16px' },
  mainBtn: { background: '#38bdf8', color: 'white', border: 'none', padding: '12px', borderRadius: '12px', width: '100%', fontWeight: 'bold' },
  backBtn: { background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '14px' },
  modalOverlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalContent: { background: '#1e293b', padding: '40px', borderRadius: '25px', textAlign: 'center', width: '80%' }
};

export default FilwordGame;