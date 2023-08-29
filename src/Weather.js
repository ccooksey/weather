//-----------------------------------------------------------------------------
// Copyright 2023 Chris Cooksey
//-----------------------------------------------------------------------------

// Requirement A React browser-based weather application. Check on the weather
// in any US city. Features a short-cut to check on the weather where you are.
// Remembers the last city checked.

// Handy resources
// ---------------
// Reverse geocoding (input lat, lon):
// http://api.openweathermap.org/geo/1.0/reverse?lat={lat}&lon={lon}&limit={limit}&appid={API key}
// Open Weather 2.5 APIs:
// https://api.openweathermap.org/data/2.5/weather?q={city name}&appid={API key}
// https://api.openweathermap.org/data/2.5/weather?q={city name},{country code}&appid={API key}
// https://api.openweathermap.org/data/2.5/weather?q={city name},{state code},{country code}&appid={API key}
// Icons:
// http://openweathermap.org/weather-conditions

import React, { useEffect, useState }  from 'react';
import axios from 'axios';
import { useCookies } from 'react-cookie';
import SelectUSState from 'react-select-us-states';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faHome } from '@fortawesome/free-solid-svg-icons'
import states from 'us-state-converter';
import secrets from './secrets.json';


export default function Weather() {

  const [cookies, setCookie] = useCookies(['city', 'state']);

  const [longitude, setLongitude] = useState();
  const [latitude, setLatitude] = useState();
  const [weather, setWeather] = useState();
  const [locationAPIError, setLocationAPIError] = useState();
  const [weatherAPIError, setWeatherAPIError] = useState();
  const [updateWeather, setUpdateWeather] = useState(false);

  const secondsInAMonth = 259200000;
  const coordinatesKnown = longitude != null || latitude != null;
  const locationKnown =
    cookies.city != null && cookies.state != null &&
    cookies.city !== '' && cookies.state !== '';

  // This is similar to a constructor in React. It will be called
  // when the component mounts. It will only be called once normally,
  // but React strict mode will call it twice, deliberately, to ensure
  // robustness.
  useEffect(() => {

    // Retrieve our current location (asynchronously). Note that this
    // may require the user to grant location services to the browser.
    navigator.geolocation.getCurrentPosition(position => {
      setLatitude(position.coords.latitude);
      setLongitude(position.coords.longitude);
    });

    // Force an update to the weather report on load.
    setUpdateWeather(true);

    // Will listen for return key and bing it to the "Weather Report" button.
    document.addEventListener("keydown", _handleKeyDown);
  }, []);

  // Key listener to bind return key to the "Weather Report" button.
  const _handleKeyDown = (e) => {
    const ENTER_KEY = 13;
    if (e.keyCode === ENTER_KEY) {
      setUpdateWeather(true);
    }
  }

  // Called when the "Use Current Location" button is clicked. Use the
  // OpenWeather geo service to get the city and state name of the current
  // location.
  const getMyLocation = (e) => {

    // Assume the best
    setLocationAPIError('');

    // It should not be possible to click the button while we do not
    // yet know our location. But check anyway.
    if (!coordinatesKnown) {
      setLocationAPIError('Could not find your current longitude and latitude.');
      return;
    }

    axios.get('https://api.openweathermap.org/geo/1.0/reverse',
      {params: {
      lat: latitude,
      lon: longitude,
      limit: 1,
      appid: secrets.appID
      }})
    .then((res) => {
      const location = res?.data;

      // Check for various location related errors.
      if (location == null) {
        setLocationAPIError('Could not find your current location.');
        return;
      }
      if (location[0].country !== "US") {
        setLocationAPIError('Locations outside the US are not yet supported.');
        return;
      }
      let abbr = location[0].state;
      if (abbr.length > 2) {
        abbr = states.abbr(location[0].state); // Returns "No abbreviation found..." if state is unknown
        if (abbr.startsWith('No abbreviation found')) {
          setLocationAPIError('Could not find the abbreviation for your state: ' + location[0].state);
          return;
        }
      }

      // Requirement: remember the last city and state selected
      setCookie('city', location[0].name, {maxAge: secondsInAMonth});
      setCookie('state', abbr, {maxAge: secondsInAMonth});

      // Requirement: Force an update to the weather report as soon as the
      // user chooses their personal location (browser requests location
      // services if not available).
      setUpdateWeather(true);
    })
    .catch((err) => {
      setLocationAPIError(err?.message);
    });
  }

  // Called when the "Weather Report" button is clicked. Use the
  // OpenWeather weather service to get the current weather.
  // It would be nice to give the user an option to choose units.
  // That can wait for version 2.
  const getWeather = (e) => {

    // Assume the best
    setWeatherAPIError('');

    if (!locationKnown) {
      setWeatherAPIError('Please specify a location.');
      return;
    }
  
    const state = states.fullName(cookies.state); // Returns "No state found..." if abbreviation is unknown
    if (state.startsWith('No state found')) {
      setWeatherAPIError('Could not find your current location.');
      return;
    }

    axios.get('https://api.openweathermap.org/data/2.5/weather',
      {params: {
      q: `${cookies.city},${state},US`,
      units: "imperial",
      exclude: "hourly,daily,minutely,alerts",
      appid: secrets.appID
      }})
    .then((res) => {
      setWeather(res?.data);
    })
    .catch((err) => {
      setWeatherAPIError(err?.response?.data?.message || err?.message);
    });
  }

  // This is similar to a method in React, but it is called both when
  // the component loads and and when state updateWeather changes. We
  // are only interested in changes to updateWeather. That is the
  // trigger that lets us know to update the weather details.
  useEffect(() => {
    if (updateWeather) {
      getWeather();
      setUpdateWeather(false);
    }
  // eslint-disable-next-line
  }, [updateWeather]);

  // Capture the city name after every keystroke.
  const handleChangeCity = (e) => {
    // Requirement: remember the last city selected
    setCookie('city', e.target.value, {maxAge: secondsInAMonth});
  }

  // Capture the state abbreviation if the user changes it.
  const handleChangeState = (e) => {
    // Requirement: remember the last state selected
    setCookie('state', e, {maxAge: secondsInAMonth});
  }

  // Requirement: Pick out some interesting details about the current weather
  // and display them.
  const renderWeather = () => {

    // Sanity check
    if (!weather) {
      setWeatherAPIError('Weather conditions are unknown at this time.');
      return;
    }

  // Requirement: Weather details, and icon caching by the browser.
  return(
    <div>
      <br/>
      <p>Weather for {weather.name}</p>
      <img alt="conditions" src={`https://openweathermap.org/img/wn/${weather.weather[0].icon}@2x.png`} />
      <p>Conditions: {weather.weather[0].description}</p>
      <p>Current temperature: {weather.main.temp} Fahrenheit</p>
      <p>Wind speed: {weather.wind.speed} MPH</p>
      {/* <pre>{JSON.stringify(weather, null, 2)}</pre> */}
    </div>
    );
  }

  // Requirement: This is the weather "search" screen rendered in HTML
  return(
    <div>
    <h2>Weather</h2>
    <p>Find weather for a US city:</p>
    <input
      className="textInput"
      placeholder="city"
      value={cookies.city || ''}
      onChange={(e) => handleChangeCity(e)} />
    &nbsp;
    <SelectUSState
      className="stateInput"
      placeholder="- Select State -"
      value={cookies.state || ''}
      onChange={(e) => handleChangeState(e)} />
    &nbsp;
    &nbsp;
    <button disabled={!coordinatesKnown} onClick={getMyLocation}><FontAwesomeIcon icon={faHome}/></button>
    <p>
      <button disabled={!locationKnown} onClick={getWeather}>Update Report</button>
    </p>
    {weather && renderWeather()}
    <br />
    {weatherAPIError && "Weather service: " + weatherAPIError}
    <br />
    {locationAPIError && "Location service: " + locationAPIError}
    </div>
  );
}
