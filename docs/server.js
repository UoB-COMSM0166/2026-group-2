import express from 'express';
const app = express();
const port = process.env.PORT || 3000;

app.use(express.static('./'));

app.listen(port, () => {
	console.log(`jellydrift listening at http://localhost:${port}`);
});
