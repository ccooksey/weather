//-----------------------------------------------------------------------------
// Copyright 2023 Chris Cooksey
//-----------------------------------------------------------------------------

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Weather from './Weather';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <Router basename={"/weather"}>
        <Routes>
          <Route path="/" element={<Weather />} />
        </Routes>
        </Router>
      </header>
    </div>
  );
}

export default App;
