const bodyParser = require('body-parser');
const NodeHelper = require('node_helper'); // eslint-disable-line import/no-unresolved

module.exports = NodeHelper.create({
  start() {
    this.lastTemperatureData = null; // Store the latest received temperature data
    this._initHandler();
  },

  socketNotificationReceived(notificationName, payload) {
    if (notificationName === 'MMM-RemoteTemperature.INIT') {
      console.log(`MMM-RemoteTemperature Node helper: Init notification received.`); // eslint-disable-line no-console
    }
  },

  _initHandler() {
    this.expressApp.use(bodyParser.json());

    // Handle POST requests (keep existing functionality)
    this.expressApp.post('/remote-temperature', this._onTemperatureValueReceived.bind(this));

    // Handle GET requests (new functionality)
    this.expressApp.get('/remote-temperature', this._onTemperatureValueRequested.bind(this));
  },

  _onTemperatureValueReceived(req, res) {
    const params = req.body;

    this.lastTemperatureData = {
      temp: params.temp,
      humidity: params.humidity,
      battery: params.battery,
      timestamp: Date.now()
    };

    this.sendSocketNotification('MMM-RemoteTemperature.VALUE_RECEIVED', this.lastTemperatureData);
    res.sendStatus(200);
  },

  _onTemperatureValueRequested(req, res) {
    if (this.lastTemperatureData) {
      res.json(this.lastTemperatureData);
    } else {
      res.status(404).json({ error: 'No temperature data available' });
    }
  }
});
