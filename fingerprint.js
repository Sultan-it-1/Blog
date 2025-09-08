const fpPromise = import('https://fpjscdn.net/v3/XrDRrmVoT8HUwLg1yH5Q')
  .then(FingerprintJS => FingerprintJS.load({
    region: "eu"
  }));

fpPromise
  .then(fp => fp.get())
  .then(result => {
    const visitorId = result.visitorId;
    console.log(visitorId);
  });