const NodeHelper = require("node_helper");
const axios = require("axios");
const os = require("os");

module.exports = NodeHelper.create({
  start() {
    console.log("[MMM-RemoteTemperature] Node Helper Started.");
    this.devices = [];
    this.viewModel = {};
    this.useFahrenheit = this._shouldUseFahrenheit(); // Automatically determine if Fahrenheit should be used
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
    console.log("[MMM-RemoteTemperature] Fetching temperature data...");

    const results = {};

    for (const device of this.devices) {
      const url = `http://${device.host}:${device.port}/temperature`; // Target API URL

      try {
        console.log(`[MMM-RemoteTemperature] Requesting data from ${url}...`);
        
        const response = await axios.get(url, { timeout: 5000 }); // 5s timeout
        console.log(`[MMM-RemoteTemperature] Response from ${device.host}:`, response.data);

        // Convert to Fahrenheit if needed
        const temperature = this.useFahrenheit
          ? this._convertToFahrenheit(response.data.temperature)
          : response.data.temperature;

        results[device.host] = {
          temperature: temperature ?? "N/A",
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
  },

  // Helper function to convert Celsius to Fahrenheit
  _convertToFahrenheit(celsius) {
    return (celsius * 9/5) + 32;
  },

  // Helper function to detect if Fahrenheit should be used based on system locale
  _shouldUseFahrenheit() {
    const locale = os.locale() || 'en-US'; // Default to 'en-US' if locale is not available
    const fahrenheitCountries = ['en-US', 'en-PH', 'en-MY', 'en-CA']; // Add more locales using Fahrenheit

    return fahrenheitCountries.includes(locale);
  }
});
