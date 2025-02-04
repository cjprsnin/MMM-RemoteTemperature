/* global Module, moment */
Module.register('MMM-RemoteTemperature', {
  defaults: {
    devices: [],
    icon: 'thermometer-half',
    showMore: true,
    showHumidity: false,
    showBattery: true,
    showTime: false,
    showAlerts: true,
    units: 'imperial', // Ensure this is globally set
    fetchInterval: 60000 // Default fetch interval is 60 seconds
  },

  requiresVersion: '2.1.0', // Make sure the MagicMirror version is compatible with your module

  start() {
    this.viewModel = {};

    // Send the initialization signal to the backend with the units setting and devices configuration
    this.sendSocketNotification('MMM-RemoteTemperature.INIT', {
      devices: this.config.devices,
      units: this.config.units // Ensure the backend gets the globally configured units
    });

    // Set an interval to fetch temperature data based on the user-configured interval
    setInterval(() => this._fetchTemperatureData(), this.config.fetchInterval);
  },

  // Method to fetch temperature data
  _fetchTemperatureData() {
    this.sendSocketNotification('MMM-RemoteTemperature.FETCH_DATA');
  },

  getDom() {
    const wrapper = document.createElement('div');

    // Check if the viewModel is empty; if so, show a loading message
    if (Object.keys(this.viewModel).length === 0) {
      wrapper.innerHTML = this.translate('LOADING');
      wrapper.classList = 'dimmed small';
      return wrapper;
    }

    // Loop through each device configured in the module
    this.config.devices.forEach((device) => {
      const deviceData = this.viewModel[device.host]; // Get the data for the device
      const deviceWrapper = document.createElement('div');
      deviceWrapper.classList = 'device-container';

      const firstLineEl = document.createElement('div');

      // Add the icon if available
      if (this.config.icon) {
        const iconEl = document.createElement('span');
        iconEl.classList = `symbol fa fa-${this.config.icon}`;
        firstLineEl.appendChild(iconEl);
      }

      // Add the device name
      const nameEl = document.createElement('span');
      nameEl.classList = 'device-name';
      nameEl.innerHTML = `${device.name}: `;
      firstLineEl.appendChild(nameEl);

      // Add the temperature if available
      if (deviceData && deviceData.temperature !== undefined) {
        const tempEl = document.createElement('span');
        tempEl.classList = 'temp';
        tempEl.innerHTML = `${deviceData.temperature}&deg;`; // Display temperature with the appropriate unit
        firstLineEl.appendChild(tempEl);
      } else {
        firstLineEl.innerHTML += ' No data'; // Show "No data" if no temperature data is available
      }

      deviceWrapper.appendChild(firstLineEl);

      // Add more device details if configured
      if (this.config.showMore && deviceData) {
        const secondLineEl = document.createElement('div');
        secondLineEl.classList = 'more dimmed small';

        // Show humidity if configured
        if (this.config.showHumidity && deviceData.humidity !== undefined) {
          secondLineEl.innerHTML += `<span class="fa fa-tint"></span> ${deviceData.humidity}% `;
        }

        // Show battery status if configured
        if (this.config.showBattery && deviceData.battery !== undefined) {
          secondLineEl.innerHTML += `<span class="fa fa-battery-half"></span> ${deviceData.battery}% `;
        }

        // Show timestamp if configured
        if (this.config.showTime && deviceData.timestamp) {
          secondLineEl.innerHTML += `<span class="fa fa-clock"></span> ${moment(deviceData.timestamp).format('HH:mm')}`;
        }

        deviceWrapper.appendChild(secondLineEl);
      }

      wrapper.appendChild(deviceWrapper);
    });

    return wrapper;
  },

  socketNotificationReceived(notificationName, payload) {
    // Handle the socket notification from the backend
    if (notificationName === 'MMM-RemoteTemperature.VALUE_RECEIVED') {
      this.viewModel = payload; // Update the viewModel with the received data
      this.updateDom(); // Update the DOM to reflect new data
    }
  }
});
