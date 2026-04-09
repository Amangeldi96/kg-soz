import React from 'react';
import FilwordGame from './components/FilwordGame';
import './style.css';

// Бардык JSON файлдарды импорттоо
import adam from './data/adam.json';
import alam from './data/alam.json'; // Файлдын аты "Alam" (чоң тамга менен болсо ошондой жаз)
import animal from './data/animal.json';
import bilim from './data/bilim.json';
import food from './data/food.json';
import geography from './data/geography.json';
import jashylcha from './data/jashylcha.json';
import sport from './data/sport.json';
import tugan from './data/tugan.json';

function App() {
  // Бардык категорияларды бир массивге топтоо
  const allCategories = [
    adam,
    alam,
    animal,
    bilim,
    food,
    geography,
    jashylcha,
    sport,
    tugan
  ];

  // Маалыматтарды консолдон текшерүү
  console.log("Жүктөлгөн категориялар:", allCategories);

  return (
    <div className="min-h-screen bg-slate-900">
      {allCategories.length > 0 ? (
        <FilwordGame wordsData={allCategories} />
      ) : (
        <div className="text-white bg-red-500 p-4 text-center">
          JSON файлдары жүктөлгөн жок! "data" папкасын текшериңиз.
        </div>
      )}
    </div>
  );
}

export default App;