const app = require('./app');
const { startCron } = require('./services/cron');

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Molekula Academy backend running on http://localhost:${PORT}`);
  startCron();
});
