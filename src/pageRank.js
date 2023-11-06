const { Matrix } = require('ml-matrix');
const { euclidean } = require('ml-distance-euclidean');

const computePageRank = (data, alpha = 0.1) => {
	const N = data.length;
	// create a matrix (NxN) filled with zeros and calculate adjacency matrix
	let adjacencyMatrix = calculateAdjacencyMatrix(data, Matrix.zeros(N, N));

	// calculate probability of visiting each page
	let probabilityMatrix = calculateProbabilityMatrix(new Matrix(adjacencyMatrix));

	// multiply each element by 1 - alpha
	let modifiedProbabilityMatrix = new Matrix(probabilityMatrix).mul(1 - alpha);

	// add teleport probability to matrix, results in final probability matrix
	let transisionProbabilityMatrix = new Matrix(modifiedProbabilityMatrix).add(alpha / N);

	console.log('\nAdjacency', adjacencyMatrix);
	console.log('\nProbability', probabilityMatrix);
	console.log('\nModified Probability (1-alpha)', modifiedProbabilityMatrix);
	console.log('\nTransistion Probability', transisionProbabilityMatrix);
	console.log('\nSum of each row: ', transisionProbabilityMatrix.sum('row')); // debugging step

	// initial PageRank vector
	let P = new Matrix(transisionProbabilityMatrix);
	let x0 = new Matrix([[1, 0, 0]]);

	let count = 0;
	while (true) {
		let x1 = x0.mmul(P);
		const distance = euclidean(x0.to1DArray(), x1.to1DArray());
		console.log('Iteration #' + count, distance);

		x0 = x1;
		if (distance < 0.0001) break;
		count++;
	}

	const pageRanks = data.map(({ _id }, i) => ({ _id, pageRank: x0.to1DArray()[i] }));

	return pageRanks;
};

const calculateAdjacencyMatrix = (data, matrix) => {
	// populate matrix with ones if node i links to node j
	data.forEach(({ outgoingLinks }, i) =>
		outgoingLinks.data.map((link) => {
			let col = data.findIndex((item) => item._id == link);
			matrix.set(i, col, 1);
		})
	);

	return matrix;
};

const calculateProbabilityMatrix = (matrix) => {
	// sum each row of matrix,
	// if sum of row is 0: replace each element with 1/N rows,
	// else divide each 1 in row by the number of ones in the row
	const rowSums = matrix.sum('row');

	for (let i = 0; i < rowSums.length; i++) {
		const sum = rowSums[i]; // sum of elemnts in this row

		if (sum == 0) {
			for (let j = 0; j < matrix.columns; j++) {
				matrix.set(i, j, 1 / N);
			}
			// matrix.setRow(i, new Array(matrix.rows).fill(1 / N)); // replaces every element in this row with 1 / N
		} else {
			matrix.mulRow(i, 1 / sum); // multiplies each element by 1 divided by the sum of 1s in this row,
		}
	}
	return matrix;
};

module.exports = { computePageRank };
