const NodeHelper = require("node_helper");
const axios = require("axios");

module.exports = NodeHelper.create({
  start() {
    this.devices = [];
    this.viewModel = {};
  },

  socketNotificationReceived(notificationName, payload) {
    if (notificationName === "MMM-RemoteTemperature.INIT") {
      this.devices = payload.devices;
      this._fetchTemperatureData();
      setInterval(() => this._fetchTemperatureData(), 60000); // Refresh every minute
    }
  },

  async _fetchTemperatureData() {
    const results = {};

    for (const device of this.devices) {
      try {
        const url = `http://${device.host}:${device.port}/temperature`; // Updated endpoint
        const response = await axios.get(url);

        results[device.host] = {
          temp: response.data.temp,
          humidity: response.data.humidity,
          battery: response.data.battery,
          timestamp: Date.now(),
        };
      } catch (error) {
        console.error(`Error fetching temperature from ${device.host}:`, error.message);
        results[device.host] = { error: "Unavailable" };
      }
    }

    this.viewModel = results;
    this.sendSocketNotification("MMM-RemoteTemperature.VALUE_RECEIVED", this.viewModel);
  }
});
