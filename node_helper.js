const NodeHelper = require("node_helper");
const axios = require("axios");

module.exports = NodeHelper.create({
  start() {
    console.log("[MMM-RemoteTemperature] Node Helper Started.");
    this.devices = [];
    this.viewModel = {};
  },

  socketNotificationReceived(notificationName, payload) {
    if (notificationName === "MMM-RemoteTemperature.INIT") {
      console.log("[MMM-RemoteTemperature] Received INIT request. Devices:", payload.devices);
      this.devices = payload.devices;
      this._fetchTemperatureData(); // Initial fetch
      setInterval(() => this._fetchTemperatureData(), 60000); // Fetch every 60 seconds
    }
  },

  async _fetchTemperatureData() {
    console.log("[MMM-RemoteTemperature] Fetching temperatureerature data...");

    const results = {};

    for (const device of this.devices) {
      const url = `http://${device.host}:${device.port}/temperatureerature`; // Target API URL

      try {
        console.log(`[MMM-RemoteTemperature] Requesting data from ${url}...`);
        
        const response = await axios.get(url, { timeout: 5000 }); // 5s timeout
        console.log(`[MMM-RemoteTemperature] Response from ${device.host}:`, response.data);

        results[device.host] = {
          temperature: response.data.temperature ?? "N/A",
          humidity: response.data.humidity ?? "N/A",
          battery: response.data.battery ?? "N/A",
          timestamp: Date.now(),
        };
      } catch (error) {
        console.error(`[MMM-RemoteTemperature] ERROR fetching from ${url}:`, error.message);
        results[device.host] = { error: "Unavailable" };
      }
    }

    console.log("[MMM-RemoteTemperature] Final fetched data:", results);
    this.viewModel = results;
    this.sendSocketNotification("MMM-RemoteTemperature.VALUE_RECEIVED", this.viewModel);
  }
});
