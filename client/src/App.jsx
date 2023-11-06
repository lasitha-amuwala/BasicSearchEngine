import { useState } from 'react';
import './App.css';
import parse from 'html-react-parser';

function App() {
	const [fruitSearch, setFruitSearch] = useState('');
	const [fruitSearchResults, setFruitSearchResults] = useState('No results...');
	const [boostFruit, setBoostFruit] = useState(false);
	const [limitFruit, setLimitFruit] = useState(10);

	const handleOnFruitSearchClick = async () => {
		const params = new URLSearchParams({
			q: fruitSearch,
			boost: boostFruit,
			limit: limitFruit,
		});

		const url = `http://134.117.133.246:3000/fruits?${params}`;
		const data = await fetch(url).then((res) => res.text());
		setFruitSearchResults(data);
	};

	const [personalSearch, setPersonalSearch] = useState('');
	const [personalSearchResults, setPersonalSearchResults] = useState('No results...');
	const [boostPersonal, setBoostPersonal] = useState(false);
	const [limitPersonal, setLimitPersonal] = useState(10);

	const handleOnPersonalSearchClick = async () => {
		const params = new URLSearchParams({
			q: personalSearch,
			boost: boostPersonal,
			limit: limitPersonal,
		});

		const url = `http://134.117.133.246:3000/personal?${params}`;
		const data = await fetch(url).then((res) => res.text());
		setPersonalSearchResults(data);
	};

	return (
		<>
			<div style={{ paddingBottom: 100 }}>
				<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 20 }}>
					<label>
						Fruit Search:
						<input
							style={{ marginLeft: 5 }}
							type='text'
							name='fruitSearch'
							value={fruitSearch}
							onChange={(e) => setFruitSearch(e.target.value)}></input>
					</label>
					<label>
						Limit:
						<input style={{ width: 100, marginLeft: 5 }} value={limitFruit} onChange={(e) => setLimitFruit(e.target.value)}></input>
					</label>
					<label>
						<input type='checkbox' checked={boostFruit} onChange={() => setBoostFruit(!boostFruit)} />
						Boost
					</label>
					<button disabled={fruitSearch == ''} onClick={handleOnFruitSearchClick}>
						Search
					</button>
				</div>
				<h3>Results:</h3>
				<div style={{ height: 400, maxHeight: 400, overflowY: 'auto' }}>{parse(fruitSearchResults)}</div>
			</div>
			<div>
				<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 20 }}>
					<label>
						Personal Search:
						<input
							style={{ marginLeft: 5 }}
							type='text'
							name='personalSearch'
							value={personalSearch}
							onChange={(e) => setPersonalSearch(e.target.value)}></input>
					</label>
					<label>
						Limit:
						<input style={{ width: 100, marginLeft: 5 }} value={limitPersonal} onChange={(e) => setLimitPersonal(e.target.value)}></input>
					</label>
					<label>
						<input type='checkbox' checked={boostPersonal} onChange={() => setBoostPersonal(!boostPersonal)} />
						Boost
					</label>
					<button disabled={personalSearch == ''} onClick={handleOnPersonalSearchClick}>
						Search
					</button>
				</div>
				<h3>Results:</h3>
				<div style={{ maxHeight: 500, overflowY: 'auto' }}>{parse(personalSearchResults)}</div>
			</div>
		</>
	);
}

export default App;
