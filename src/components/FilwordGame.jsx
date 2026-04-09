import React, { useState, useEffect, useCallback, useRef } from 'react';

const COLORS = ['#00f2fe', '#4facfe', '#764ba2', '#667eea', '#f093fb', '#f5576c', '#43e97b'];
const KYRGYZ_ALPHABET = "АБВГДЕЁЖЗИЙКЛМНОПРСТУҮФХЦЧШЩЪЫЬЭЮЯӨҢ";

const FilwordGame = ({ wordsData }) => {
  // --- STATES ---
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('filword_user')));
  const [view, setView] = useState('menu'); 
  const [currentCatIndex, setCurrentCatIndex] = useState(() => parseInt(localStorage.getItem('filword_level')) || 0);
  const [score, setScore] = useState(() => parseInt(localStorage.getItem('filword_score')) || 0);
  const [completedDays, setCompletedDays] = useState(() => JSON.parse(localStorage.getItem('completed_days')) || []);
  
  // Login State
  const [loginAge, setLoginAge] = useState(18);
  const scrollRef = useRef(null);

  // Оюн абалы
  const [grid, setGrid] = useState([]);
  const [selectedCells, setSelectedCells] = useState([]);
  const [foundWords, setFoundWords] = useState([]);
  const [targetWords, setTargetWords] = useState([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [showWinModal, setShowWinModal] = useState(false);
  const [isDaily, setIsDaily] = useState(false);

  const gridSize = 6;
  const today = new Date().getDate();

  useEffect(() => {
    localStorage.setItem('filword_level', currentCatIndex);
    localStorage.setItem('filword_score', score);
    localStorage.setItem('completed_days', JSON.stringify(completedDays));
  }, [currentCatIndex, score, completedDays]);

  // Генерация логикасы
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

  // 1. КИРҮҮ (Aesthetics Login with Age Picker)
  if (!user) {
    const ages = Array.from({ length: 86 }, (_, i) => i + 5);
    return (
      <div style={styles.fullPage}>
        <div style={styles.glassCard}>
          <h1 style={styles.neonText}>FILWORD</h1>
          <p style={{color: '#cbd5e1', marginBottom: '20px'}}>Маалыматыңызды киргизиңиз</p>
          
          <form onSubmit={(e) => {
            e.preventDefault();
            const newUser = { name: e.target.name.value, age: loginAge };
            setUser(newUser);
            localStorage.setItem('filword_user', JSON.stringify(newUser));
          }}>
            <input name="name" placeholder="Атыңыз..." required style={styles.glassInput} />
            
            <div style={{margin: '20px 0'}}>
              <label style={styles.label}>Жашыңыз: <span style={styles.ageValue}>{loginAge}</span></label>
              <div style={styles.agePickerContainer}>
                {ages.map(a => (
                  <button key={a} type="button" 
                    onClick={() => setLoginAge(a)}
                    style={{
                      ...styles.ageCircle,
                      backgroundColor: loginAge === a ? '#00f2fe' : 'rgba(255,255,255,0.1)',
                      color: loginAge === a ? '#000' : '#fff'
                    }}>{a}</button>
                ))}
              </div>
            </div>
            
            <button type="submit" style={styles.neonButton}>БАШТОО</button>
          </form>
        </div>
      </div>
    );
  }

  // 2. БАШКЫ МЕНЮ (Modern Glass Menu)
  if (view === 'menu') {
    return (
      <div style={styles.fullPage}>
        <div style={styles.menuHeader}>
            <div style={styles.profileBadge}>
                <div style={styles.avatar}>{user.name[0]}</div>
                <div>
                    <div style={{fontWeight: 'bold'}}>{user.name}</div>
                    <div style={{fontSize: '12px', opacity: 0.7}}>{user.age} жаш</div>
                </div>
            </div>
            <div style={styles.scoreGlass}>🏆 {score}</div>
        </div>

        <div style={styles.centerContent}>
            <div style={styles.levelCircle}>
                <div style={{fontSize: '14px', opacity: 0.8}}>Деңгээл</div>
                <div style={{fontSize: '48px', fontWeight: '900'}}>{currentCatIndex + 1}</div>
            </div>

            <button onClick={() => generateLevel(currentCatIndex)} style={styles.playNeonBtn}>
                ОЙНОО
            </button>

            <div style={styles.bottomNav}>
                <button onClick={() => setView('calendar')} style={styles.navItem}>
                    <span style={{fontSize: '24px'}}>📅</span>
                    <span>Календарь</span>
                </button>
                <button onClick={() => {localStorage.clear(); window.location.reload();}} style={styles.navItem}>
                    <span style={{fontSize: '24px'}}>🚪</span>
                    <span>Чыгуу</span>
                </button>
            </div>
        </div>
      </div>
    );
  }

  // 3. КАЛЕНДАРЬ
  if (view === 'calendar') {
    return (
      <div style={styles.fullPage}>
        <div style={styles.headerRow}>
          <button onClick={() => setView('menu')} style={styles.backIconBtn}>⬅</button>
          <h2 style={styles.neonTextSmall}>АПРЕЛЬ</h2>
          <div style={{width: '40px'}} />
        </div>
        <div style={styles.calendarGrid}>
          {Array.from({ length: 30 }, (_, i) => i + 1).map(day => {
            const isCompleted = completedDays.includes(day);
            const isToday = day === today;
            const isLocked = day > today;
            return (
              <div key={day} onClick={() => !isLocked && generateLevel(day + 100, true)}
                style={{
                  ...styles.calendarCell,
                  background: isCompleted ? 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' : isToday ? '#00f2fe' : 'rgba(255,255,255,0.05)',
                  boxShadow: isToday ? '0 0 15px #00f2fe' : 'none',
                  opacity: isLocked ? 0.3 : 1,
                  color: isToday || isCompleted ? '#000' : '#fff'
                }}
              >
                {day}
                {isCompleted && <div style={{fontSize: '10px'}}>✔</div>}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // 4. ОЮН ЭКРАНЫ
  return (
    <div onMouseUp={endSelection} onTouchEnd={endSelection} style={styles.fullPage}>
      <div style={styles.headerRow}>
        <button onClick={() => setView('menu')} style={styles.backIconBtn}>🏠</button>
        <div style={styles.glassTag}>{wordsData[currentCatIndex % wordsData.length]?.category.replace(/_/g, ' ')}</div>
        <div style={styles.scoreGlass}>🏆 {score}</div>
      </div>

      <div onTouchMove={(e) => {
        const touch = e.touches[0];
        const el = document.elementFromPoint(touch.clientX, touch.clientY);
        if (el && el.getAttribute('data-r')) moveSelection(parseInt(el.getAttribute('data-r')), parseInt(el.getAttribute('data-c')));
      }} style={styles.gameGrid}>
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
                background: isSel ? 'rgba(0, 242, 254, 0.8)' : fnd ? fnd.color : 'rgba(255, 255, 255, 0.08)',
                boxShadow: isSel ? '0 0 15px #00f2fe' : 'none',
                transform: isSel ? 'scale(1.1)' : 'scale(1)',
                color: isSel || fnd ? '#000' : '#fff'
              }}
            >{cell?.char}</div>
          );
        }))}
      </div>

      {showWinModal && (
        <div style={styles.blurOverlay}>
          <div style={styles.glassCard}>
            <h2 style={styles.neonText}>УКМУШ! 🎉</h2>
            <button onClick={() => {
                if(isDaily) { setView('calendar'); } 
                else { setCurrentCatIndex(prev => prev + 1); generateLevel(currentCatIndex + 1); }
            }} style={styles.neonButton}>УЛАНТУУ</button>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  fullPage: { background: 'radial-gradient(circle at top, #1e293b 0%, #0f172a 100%)', minHeight: '100vh', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px', fontFamily: '"Segoe UI", Roboto, sans-serif' },
  glassCard: { background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(15px)', border: '1px solid rgba(255,255,255,0.1)', padding: '30px', borderRadius: '30px', textAlign: 'center', width: '90%', maxWidth: '380px', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' },
  neonText: { fontSize: '36px', fontWeight: '900', color: '#00f2fe', textShadow: '0 0 10px #00f2fe', marginBottom: '10px' },
  neonTextSmall: { fontSize: '20px', fontWeight: 'bold', color: '#00f2fe', textShadow: '0 0 5px #00f2fe' },
  glassInput: { width: '100%', padding: '15px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '15px', color: 'white', fontSize: '16px', outline: 'none', marginBottom: '15px' },
  agePickerContainer: { display: 'flex', overflowX: 'auto', gap: '10px', padding: '10px 0', scrollbarWidth: 'none' },
  ageCircle: { minWidth: '45px', height: '45px', borderRadius: '50%', border: 'none', fontWeight: 'bold', cursor: 'pointer', transition: '0.3s' },
  ageValue: { color: '#00f2fe', fontWeight: 'bold', fontSize: '20px' },
  label: { display: 'block', textAlign: 'left', fontSize: '14px', color: '#94a3b8' },
  neonButton: { width: '100%', padding: '15px', background: '#00f2fe', color: '#000', border: 'none', borderRadius: '15px', fontWeight: '900', fontSize: '18px', cursor: 'pointer', boxShadow: '0 0 20px rgba(0,242,254,0.4)' },
  menuHeader: { width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' },
  profileBadge: { display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.05)', padding: '8px 15px', borderRadius: '20px' },
  avatar: { width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(45deg, #00f2fe, #4facfe)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#000' },
  scoreGlass: { background: 'rgba(255, 255, 255, 0.05)', padding: '8px 15px', borderRadius: '15px', border: '1px solid rgba(255,255,255,0.1)', color: '#fbbf24', fontWeight: 'bold' },
  centerContent: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '40px', width: '100%' },
  levelCircle: { width: '150px', height: '150px', borderRadius: '50%', border: '4px solid rgba(0,242,254,0.2)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,242,254,0.05)', boxShadow: 'inset 0 0 20px rgba(0,242,254,0.1)' },
  playNeonBtn: { padding: '15px 60px', borderRadius: '30px', background: '#00f2fe', color: '#000', fontWeight: 'bold', fontSize: '22px', border: 'none', boxShadow: '0 10px 30px rgba(0,242,254,0.3)', cursor: 'pointer' },
  bottomNav: { display: 'flex', gap: '30px', marginTop: '20px' },
  navItem: { background: 'none', border: 'none', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', opacity: 0.8, cursor: 'pointer' },
  headerRow: { width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  backIconBtn: { background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', width: '40px', height: '40px', borderRadius: '12px', fontSize: '18px' },
  glassTag: { background: 'rgba(0,242,254,0.1)', padding: '5px 15px', borderRadius: '10px', border: '1px solid rgba(0,242,254,0.3)', color: '#00f2fe', fontSize: '14px', fontWeight: 'bold' },
  gameGrid: { display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px', width: '100%', maxWidth: '380px', background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '25px', border: '1px solid rgba(255,255,255,0.05)' },
  cell: { aspectRatio: '1/1', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '10px', fontSize: '20px', fontWeight: '900', transition: '0.2s' },
  calendarGrid: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', width: '100%' },
  calendarCell: { aspectRatio: '1/1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: '15px', fontWeight: 'bold', cursor: 'pointer', transition: '0.3s' },
  blurOverlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }
};

export default FilwordGame;