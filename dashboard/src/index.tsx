import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import AppData from './AppData';
import {logConsoleMessage} from './console_message';
import * as serviceWorker from './serviceWorker';

logConsoleMessage();

ReactDOM.render(<AppData />, document.getElementById('root'));

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: http://bit.ly/CRA-PWA
serviceWorker.unregister();
