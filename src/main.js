const { connectToDB, getFruitData, getPersonalData, updateOneFruitData, updateOnePersonaltData } = require('./mongo.js');
const { computePageRank } = require('./pageRank.js');

let db;


main();
